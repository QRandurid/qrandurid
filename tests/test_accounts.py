"""Supabase SDK/HTTP contract tests. No real accounts or emails are created.

The controlled provider below is a test fixture, not an authentication server.
Real hosted Auth and database RLS require the checks in docs/accounts.md.
"""
import base64
import copy
import json
import time
import unittest
from urllib.parse import parse_qs, urlparse, urlencode

import test_cosmetics as browser_support


class ProviderFixture:
    def __init__(self):
        self.users = {
            'one@example.test': ('00000000-0000-4000-8000-000000000001', 'test-password-123'),
            'two@example.test': ('00000000-0000-4000-8000-000000000002', 'test-password-456'),
        }
        self.rows = {}
        self.tokens = {}
        self.recoveries = []
        self.fail_writes = False
        self.conflict_once = False
        self.confirmation_required = False

    @staticmethod
    def user(email, user_id):
        return dict(id=user_id, email=email, aud='authenticated', role='authenticated',
                    app_metadata={'provider': 'email', 'providers': ['email']},
                    user_metadata={}, created_at='2026-01-01T00:00:00Z', identities=[])

    def session(self, email):
        user_id = self.users[email][0]
        claims = dict(sub=user_id, exp=int(time.time()) + 3600, aud='authenticated', role='authenticated')
        def part(value):
            return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')
        token = part({'alg': 'HS256', 'typ': 'JWT'}) + '.' + part(claims) + '.test-signature'
        self.tokens[token] = user_id
        return dict(access_token=token, refresh_token='test-refresh-' + user_id,
                    token_type='bearer', expires_in=3600, expires_at=claims['exp'],
                    user=self.user(email, user_id))

    def handle(self, route):
        request = route.request
        url = urlparse(request.url)
        body = request.post_data_json if request.post_data else {}
        headers = {'access-control-allow-origin': '*',
                   'access-control-allow-headers': '*', 'access-control-expose-headers': '*'}
        def respond(value=None, status=200):
            route.fulfill(status=status, content_type='application/json',
                          headers=headers, body='' if status == 204 else json.dumps(value))
        if request.method == 'OPTIONS':
            respond({}, 200)
        elif url.path.endswith('/token'):
            if body.get('email') in self.users and self.users[body['email']][1] == body.get('password'):
                respond(self.session(body['email']))
            else:
                respond({'error_code': 'invalid_credentials', 'msg': 'Invalid credentials'}, 400)
        elif url.path.endswith('/signup'):
            email = body['email']
            self.users[email] = ('00000000-0000-4000-8000-000000000003', body['password'])
            respond(self.user(email, self.users[email][0]) if self.confirmation_required else self.session(email))
        elif url.path.endswith('/recover'):
            self.recoveries.append(body['email'])
            respond({})
        elif url.path.endswith('/logout'):
            respond(status=204)
        elif url.path.endswith('/user'):
            token = request.headers.get('authorization', '').removeprefix('Bearer ')
            user_id = self.tokens.get(token)
            email = next((email for email, data in self.users.items() if data[0] == user_id), None)
            if not email:
                respond({'msg': 'Unauthorized'}, 401)
            elif request.method == 'PUT':
                self.users[email] = (user_id, body['password'])
                respond(self.user(email, user_id))
            else:
                respond(self.user(email, user_id))
        elif url.path.endswith('/qrandurid_progress'):
            token = request.headers.get('authorization', '').removeprefix('Bearer ')
            user_id = self.tokens.get(token)
            query = parse_qs(url.query)
            selected_id = query.get('user_id', ['eq.' + str(body.get('user_id'))])[0].removeprefix('eq.')
            if not user_id or user_id != selected_id:
                respond({'code': '42501'}, 403)
                return
            if request.method == 'GET':
                respond([self.rows[user_id]] if user_id in self.rows else [])
                return
            if self.fail_writes:
                respond({'code': 'unavailable'}, 503)
                return
            if request.method == 'POST' and user_id in self.rows:
                respond({'code': '23505'}, 409)
                return
            if request.method == 'PATCH':
                if self.conflict_once:
                    self.conflict_once = False
                    self.rows[user_id]['version'] += 1
                    self.rows[user_id]['progress']['skins'].append('s9')
                    respond(None)
                    return
                if int(query['version'][0].removeprefix('eq.')) != self.rows[user_id]['version']:
                    respond(None)
                    return
            self.rows[user_id] = copy.deepcopy({key: body[key] for key in ('progress', 'version')})
            value = self.rows[user_id]
            respond(value if 'vnd.pgrst.object' in request.headers.get('accept', '') else [value])
        else:
            respond({'message': 'Unexpected test endpoint'}, 404)


class AccountsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        browser_support.CosmeticsTests.setUpClass.__func__(cls)

    @classmethod
    def tearDownClass(cls):
        browser_support.CosmeticsTests.tearDownClass.__func__(cls)

    def setUp(self):
        self.provider = ProviderFixture()
        self.contexts = []
        self.errors = []
        self.context, self.page = self.device()

    def tearDown(self):
        for context in self.contexts:
            context.close()
        self.assertEqual(self.errors, [])

    def device(self, fragment=''):
        context = self.browser.new_context(viewport={'width': 390, 'height': 844})
        self.contexts.append(context)
        context.route('https://**', lambda route: route.abort())
        context.route('https://project.test/**', self.provider.handle)
        context.route('**/account-config.js', lambda route: route.fulfill(
            content_type='application/javascript', body="window.QRANDURID_ACCOUNT_CONFIG={supabaseUrl:'https://project.test',publishableKey:'sb_publishable_test_fixture'}"))
        page = context.new_page()
        page.on('pageerror', lambda error: self.errors.append(str(error)))
        page.goto(self.url + fragment, wait_until='networkidle')
        page.locator('.nav button').nth(5).click()
        page.wait_for_selector('#accountForm')
        return context, page

    def login(self, page, email='one@example.test', password='test-password-123'):
        page.locator('[name=email]').fill(email)
        page.locator('[name=password]').fill(password)
        page.locator('#accountForm [type=submit]').click()
        page.wait_for_function('!!Accounts.user && !Accounts.loading && !Accounts.syncing')
        self.assertIn('Pilve salvestatud', page.locator('#saveStatus').inner_text())

    def test_login_restores_progress_on_a_second_device_and_isolates_guest(self):
        page = self.page
        page.evaluate("state.username='Külaline';state.totalXp=9999;save()")
        self.login(page)
        self.assertEqual(page.evaluate('state.totalXp'), 860)  # Guest is not silently imported.
        page.evaluate("state.username='Kontomängija';scanPlace('rotermann');closeSheet();equipFrame('f2')")
        page.locator('#accountPanel button').first.click()
        page.wait_for_function("Accounts.status==='Pilve salvestatud ✓' && !Accounts.syncing")
        _, second = self.device()
        self.login(second)
        self.assertEqual(second.evaluate('state.username'), 'Kontomängija')
        self.assertTrue(second.evaluate("state.scanned.includes('rotermann')"))
        self.assertEqual(second.evaluate('state.equippedFrame'), 'f2')
        page.locator('#accountPanel button').last.click()
        page.wait_for_selector('#accountForm')
        self.assertEqual(page.evaluate('[state.username,state.totalXp]'), ['Külaline', 9999])
        self.login(page, 'two@example.test', 'test-password-456')
        self.assertFalse(page.evaluate("state.scanned.includes('rotermann')"))
        self.assertNotEqual(page.evaluate('state.username'), 'Kontomängija')

    def test_failed_login_and_registration_confirmation_do_not_save_passwords(self):
        page = self.page
        page.locator('[name=email]').fill('one@example.test')
        page.locator('[name=password]').fill('wrong-password')
        page.locator('#accountForm [type=submit]').click()
        page.wait_for_function("Accounts.message.includes('Sisselogimine ei õnnestunud')")
        self.assertIsNone(page.evaluate('Accounts.user'))
        self.assertEqual(page.locator('[name=password]').input_value(), '')
        self.provider.confirmation_required = True
        page.evaluate("Accounts.setMode('signup')")
        page.locator('[name=email]').fill('new@example.test')
        page.locator('[name=password]').fill('new-test-password-987')
        page.locator('#accountForm [type=submit]').click()
        page.wait_for_function("Accounts.message.includes('kinnita konto')")
        self.assertIsNone(page.evaluate('Accounts.user'))
        storage = page.evaluate('JSON.stringify({...localStorage})')
        self.assertNotIn('wrong-password', storage)
        self.assertNotIn('new-test-password-987', storage)

    def test_explicit_guest_import_and_retry_after_write_failure(self):
        page = self.page
        page.evaluate("scanPlace('solaris');closeSheet()")
        self.login(page)
        self.assertFalse(page.evaluate("state.scanned.includes('solaris')"))
        self.provider.fail_writes = True
        page.once('dialog', lambda dialog: dialog.accept())
        page.locator('#importGuestBtn').click()
        page.wait_for_function("Accounts.status.includes('ebaõnnestus')")
        self.assertTrue(page.evaluate("state.scanned.includes('solaris')"))
        self.assertTrue(page.evaluate("Accounts.read(Accounts.storageKey()+':pending')"))
        self.provider.fail_writes = False
        page.locator('#retrySync').click()
        page.wait_for_function("Accounts.status==='Pilve salvestatud ✓'")
        self.assertIn('solaris', self.provider.rows[self.provider.users['one@example.test'][0]]['progress']['scanned'])

    def test_version_conflict_retries_without_losing_either_collection(self):
        self.login(self.page)
        self.provider.conflict_once = True
        self.page.evaluate("state.skins.push('s10');save();Accounts.sync()")
        self.page.wait_for_function("Accounts.status==='Pilve salvestatud ✓'&&!Accounts.syncing")
        self.assertTrue(self.page.evaluate("state.skins.includes('s9')&&state.skins.includes('s10')"))
        self.assertGreaterEqual(self.provider.rows[self.provider.users['one@example.test'][0]]['version'], 3)

    def test_password_reset_and_pending_offline_progress(self):
        page = self.page
        page.evaluate("Accounts.setMode('recover')")
        page.locator('[name=email]').fill('one@example.test')
        page.locator('#accountForm [type=submit]').click()
        page.wait_for_function("Accounts.message.includes('taastamise')||Accounts.message.includes('muutmise link')")
        self.assertEqual(self.provider.recoveries, ['one@example.test'])
        page.evaluate("Accounts.setMode('signin')")
        self.login(page)
        page.evaluate('navigator.serviceWorker.ready')
        page.wait_for_function('!!navigator.serviceWorker.controller')
        self.context.set_offline(True)
        page.evaluate("state.username='Võrguta';save()")
        self.assertTrue(page.evaluate("Accounts.read(Accounts.storageKey()+':pending')"))
        self.assertIn('Võrguühenduseta', page.locator('#saveStatus').inner_text())
        page.reload(wait_until='load')
        page.wait_for_function("!!Accounts.user && state.username==='Võrguta'")
        self.assertTrue(page.evaluate("Accounts.read(Accounts.storageKey()+':pending')"))
        self.context.set_offline(False)
        page.evaluate('Accounts.sync()')
        page.wait_for_function("Accounts.status==='Pilve salvestatud ✓'&&!Accounts.syncing")
        self.assertEqual(self.provider.rows[self.provider.users['one@example.test'][0]]['progress']['username'], 'Võrguta')

    def test_delayed_guest_location_cannot_credit_a_new_account(self):
        page = self.page
        page.evaluate("navigator.geolocation.getCurrentPosition=success=>window.pendingGuestLocation=success;checkLocation()")
        self.login(page)
        before = page.evaluate('state.totalXp')
        page.evaluate('pendingGuestLocation({coords:{latitude:59.4370,longitude:24.7453}})')
        self.assertEqual(page.evaluate('state.totalXp'), before)
        self.assertFalse(page.evaluate("state.claimed.includes('oldtown')"))

    def test_recovery_link_sets_a_new_password_through_the_sdk(self):
        session = self.provider.session('one@example.test')
        fragment = '/#' + urlencode({key: value for key, value in session.items() if key != 'user'} | {'type': 'recovery'})
        _, page = self.device(fragment)
        page.wait_for_function('Accounts.recovering')
        self.assertEqual(page.locator('[name=email]').count(), 0)
        page.locator('[name=password]').fill('replacement-password-789')
        page.locator('#accountForm [type=submit]').click()
        page.wait_for_function("!Accounts.recovering && Accounts.message.includes('Uus parool')")
        self.assertEqual(self.provider.users['one@example.test'][1], 'replacement-password-789')
        self.assertNotIn('replacement-password-789', page.evaluate('JSON.stringify({...localStorage})'))

    def test_progress_merge_and_all_new_destinations(self):
        page = self.page
        self.assertEqual(page.evaluate('placeCount'), 30)
        page.evaluate("navTo('mapSec',document.querySelector('.nav button'))")
        page.locator('#placeSearch').fill('ülemiste')
        self.assertEqual(page.locator('#discoverGrid button').count(), 1)
        page.locator('#discoverGrid button').click()
        self.assertTrue(page.evaluate("state.scanned.includes('ulemiste')"))
        result = page.evaluate("""() => {const a=normalizeProgress(defaults),b=normalizeProgress(defaults);
          a.scanned.push('solaris');a.claimed.push('solaris');a.totalXp+=places.solaris.xp;
          b.scanned.push('rotermann');b.claimed.push('rotermann');b.totalXp+=places.rotermann.xp;
          return mergeProgress(a,b)}""")
        self.assertEqual(result['totalXp'], 860 + 150 + 200)
        self.assertCountEqual(result['claimed'], ['solaris', 'rotermann'])
        self.assertEqual(page.evaluate('(value)=>mergeProgress(value,value).totalXp', result), result['totalXp'])


if __name__ == '__main__':
    unittest.main()
