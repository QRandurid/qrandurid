"""Urban portrait atlas, theme filters and deterministic visit rewards."""
import unittest
import test_cosmetics as browser_support


class WardrobeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        browser_support.CosmeticsTests.setUpClass.__func__(cls)

    @classmethod
    def tearDownClass(cls):
        browser_support.CosmeticsTests.tearDownClass.__func__(cls)

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844}, permissions=['geolocation'])
        self.context.route('https://**', lambda route: route.abort())
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.goto(self.url, wait_until='networkidle')
        self.page.locator('.nav button').nth(3).click()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def test_original_portrait_atlas_themes_and_owned_filters(self):
        page = self.page
        self.assertEqual(page.evaluate('[skins.length,frames.length]'), [32, 24])
        self.assertEqual(page.locator('#skinsGrid .portraitSprite').count(), 16)
        dimensions = page.evaluate("""async () => {const image=new Image();image.src='art/urban-portraits.png';await image.decode();return [image.naturalWidth,image.naturalHeight]}""")
        self.assertEqual(dimensions[0], dimensions[1])
        self.assertGreaterEqual(dimensions[0], 1024)
        self.assertEqual(len(set(page.locator('#skinsGrid .portraitSprite').evaluate_all('(els)=>els.map(e=>e.style.backgroundPosition)'))), 16)
        page.locator('[data-collection=cyber]').click()
        self.assertTrue(page.locator('#skinsGrid button').count() > 0)
        self.assertTrue(all(t == 'cyber' for t in page.locator('#skinsGrid .collectionLabel').all_text_contents()))
        page.locator('.ownedToggle input').check()
        self.assertEqual(page.locator('#skinsGrid button').count(), 1)  # Owned Neoonninja.
        page.locator('#frameTab').click()
        self.assertEqual(page.locator('#framesGrid button').count(), 0)  # Default frames are street/fantasy.
        self.assertTrue(page.locator('#framesGrid .emptyState').is_visible())
        page.locator('[data-collection=all]').click()
        self.assertEqual(page.locator('#framesGrid button').count(), 2)
        self.assertTrue(page.locator('.hero').is_hidden())
        page.locator('.nav button').first.click()
        self.assertTrue(page.locator('.hero').is_visible())

    def test_demo_drops_do_not_unlock_visit_rewards_and_real_visits_do(self):
        page = self.page
        page.evaluate("for(let n=0;n<80;n++)demoScan();closeSheet()")
        self.assertEqual(page.evaluate('state.claimed.length'), 0)
        self.assertFalse(page.evaluate("state.frames.includes('f14')||state.skins.includes('s25')"))
        page.locator('.nav button').first.click()
        for place_id in ('oldtown', 'viru', 'telliskivi'):
            point = page.evaluate('(id)=>places[id]', place_id)
            self.context.set_geolocation({'latitude': point['lat'], 'longitude': point['lng']})
            page.evaluate('(id)=>{if(!state.scanned.includes(id))scanPlace(id);closeSheet();focusPlace(id)}', place_id)
            page.locator('#locationBtn').click()
            page.wait_for_function('(id)=>state.claimed.includes(id)', arg=place_id)
            page.keyboard.press('Escape')
        self.assertTrue(page.evaluate("state.frames.includes('f14')&&state.frames.includes('f13')&&state.skins.includes('s25')"))
        self.assertEqual(page.evaluate("state.frames.filter(id=>id==='f14').length"), 1)
        self.assertEqual(page.locator('#styleGoalCount').inner_text(), '2 / 6')
        before = page.evaluate('[state.totalXp,state.frames.length,state.skins.length]')
        page.evaluate('save();save()')
        self.assertEqual(page.evaluate('[state.totalXp,state.frames.length,state.skins.length]'), before)
        page.evaluate("equipSkin('s25');equipFrame('f13')")
        page.reload(wait_until='networkidle')
        self.assertEqual(page.evaluate('[state.equippedSkin,state.equippedFrame]'), ['s25', 'f13'])

    def test_secret_and_visit_milestones_backfill_without_duplicate_rewards(self):
        page = self.page
        # Simulate a previously saved player's 25 real visits; exclude Tammsaare.
        page.evaluate("state.claimed=Object.keys(places).filter(id=>id!=='tammsaare').slice(0,25);state.scanned=[...state.claimed];save()")
        self.assertTrue(page.evaluate("['s25','s27','s29','s32'].every(id=>state.skins.includes(id))"))
        self.assertTrue(page.evaluate("['f13','f14','f18','f19','f23'].every(id=>state.frames.includes(id))"))
        self.assertFalse(page.evaluate("state.skins.includes('s31')||state.frames.includes('f24')"))
        page.evaluate("state.claimed.push('tammsaare');state.scanned.push('tammsaare');save()")
        self.assertTrue(page.evaluate("state.skins.includes('s31')&&state.frames.includes('f24')"))
        self.assertEqual(page.locator('#styleGoalCount').inner_text(), '6 / 6')
        before = page.evaluate('[state.skins.length,state.frames.length,state.totalXp]')
        page.reload(wait_until='networkidle')
        self.assertEqual(page.evaluate('[state.skins.length,state.frames.length,state.totalXp]'), before)
        page.locator('.nav button').nth(3).click()
        page.locator('#skinRarity').select_option('SECRET')
        self.assertEqual(page.locator('#skinsGrid button').count(), 1)
        self.assertIn('NULL Shadow', page.locator('#skinsGrid').inner_text())
        page.locator('#frameTab').click()
        page.locator('#frameRarity').select_option('SECRET')
        self.assertEqual(page.locator('#framesGrid button').count(), 1)
        page.locator('#framesGrid button').click()
        page.locator('#sheetContent .btn').click()
        self.assertEqual(page.evaluate('state.equippedFrame'), 'f24')

    def test_new_frames_and_portraits_render_offline_at_mobile_sizes(self):
        page = self.page
        page.evaluate('navigator.serviceWorker.ready')
        page.wait_for_function('!!navigator.serviceWorker.controller')
        self.context.set_offline(True)
        page.reload(wait_until='load')
        page.locator('.nav button').nth(3).click()
        self.assertEqual(page.locator('#skinsGrid .portraitSprite').count(), 16)
        self.assertTrue(page.evaluate("async()=>{const image=new Image();image.src='art/urban-portraits.png';await image.decode();return image.naturalWidth>0}"))
        page.locator('#frameTab').click()
        page.wait_for_function("[...document.querySelectorAll('#framesGrid img')].every(i=>i.complete&&i.naturalWidth>0)")
        self.assertEqual(page.locator('#framesGrid button').count(), 24)
        for width in (320, 390, 1280):
            page.set_viewport_size({'width': width, 'height': 900})
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))


if __name__ == '__main__':
    unittest.main()
