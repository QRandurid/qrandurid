"""Destination catalog, SECRET presentation and location progression regressions."""
import unittest
import test_cosmetics as browser_support


class PlaceTests(unittest.TestCase):
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

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def test_fifty_unique_locations_and_rebalanced_rarities(self):
        places = self.page.evaluate('Object.values(places)')
        self.assertEqual(len(places), 50)
        self.assertEqual(len({place['id'] for place in places}), 50)
        self.assertEqual(len({place['name'] for place in places}), 50)
        self.assertEqual([place['num'] for place in places], [f'{n:03}' for n in range(1, 51)])
        counts = {r: sum(place['rarity'] == r for place in places)
                  for r in ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'SECRET')}
        self.assertEqual(counts, dict(COMMON=20, RARE=16, EPIC=10, LEGENDARY=3, SECRET=1))
        self.assertEqual([place['id'] for place in places if place['rarity'] == 'SECRET'], ['tammsaare'])
        for place in places:
            self.assertEqual(place['cls'], place['rarity'].lower())
            self.assertTrue(59.35 < place['lat'] < 59.55 and 24.5 < place['lng'] < 24.95)
        self.assertEqual(self.page.locator('#questFound').inner_text(), '1 / 50')
        self.assertEqual(self.page.locator('#questClaimed').inner_text(), '0 / 50')
        self.assertEqual(self.page.locator('#discoverGrid .placeCard').count(), 49)

    def test_secret_filter_unlock_style_duplicate_and_saved_progress(self):
        page = self.page
        page.locator('#placeRarity').select_option('SECRET')
        card = page.locator('#discoverGrid .rarity-secret')
        self.assertEqual(card.count(), 1)
        self.assertIn('TAMMSAARE PARK', card.inner_text())
        self.assertEqual(card.evaluate('(el)=>getComputedStyle(el).color'), 'rgb(255, 255, 255)')
        self.assertEqual(card.evaluate('(el)=>getComputedStyle(el).animationName'), 'secretCardGlow')
        self.assertIn('SECRET', card.locator('.tag').inner_text())
        page.emulate_media(reduced_motion='reduce')
        self.assertEqual(card.evaluate('(el)=>getComputedStyle(el).animationName'), 'none')
        card.locator('button').click()
        page.keyboard.press('Escape')
        self.assertEqual(page.evaluate("state.scanned.filter(id=>id==='tammsaare').length"), 1)
        self.assertEqual(page.locator('#placeCards .rarity-secret').count(), 1)
        page.locator('.nav button').nth(2).click()
        page.locator('#cardRarity').select_option('SECRET')
        self.assertEqual(page.locator('#cardCollection .placeCard').count(), 1)
        self.assertIn('TAMMSAARE PARK', page.locator('#cardCollection').inner_text())
        before = page.evaluate('state.totalXp')
        page.evaluate("scanPlace('tammsaare')")
        self.assertTrue(page.locator('.duplicateCardReward.secretReward').is_visible())
        self.assertEqual(page.evaluate('state.totalXp'), before + 240)
        page.reload(wait_until='networkidle')
        self.assertEqual(page.evaluate('state.totalXp'), before + 240)
        self.assertTrue(page.evaluate("state.scanned.includes('tammsaare')"))
        self.assertEqual(page.evaluate('state.claimed.length'), 0)
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))

    def test_all_twenty_new_locations_award_exact_visit_xp(self):
        page = self.page
        locations = page.evaluate('Object.values(places).filter(p=>Number(p.num)>30)')
        self.assertEqual(len(locations), 20)
        for place in locations:
            with self.subTest(place=place['id']):
                self.context.set_geolocation({'latitude': place['lat'], 'longitude': place['lng']})
                page.evaluate('(id)=>{scanPlace(id);closeSheet()}', place['id'])
                before = page.evaluate('state.totalXp')
                page.locator('#locationBtn').click()
                page.wait_for_function('(id)=>state.claimed.includes(id)', arg=place['id'])
                self.assertEqual(page.evaluate('state.totalXp'), before + place['xp'])
                page.keyboard.press('Escape')
                page.locator('#locationBtn').click()
                self.assertEqual(page.evaluate('state.totalXp'), before + place['xp'])
        self.assertEqual(page.locator('#questClaimed').inner_text(), '20 / 50')

    def test_secret_visit_reward_is_monochrome_and_remains_single_claim(self):
        page = self.page
        point = page.evaluate('places.tammsaare')
        self.context.set_geolocation({'latitude': point['lat'], 'longitude': point['lng']})
        page.evaluate("scanPlace('tammsaare');closeSheet()")
        before = page.evaluate('state.totalXp')
        page.locator('#locationBtn').click()
        page.wait_for_function("state.claimed.includes('tammsaare')")
        self.assertEqual(page.evaluate('state.totalXp'), before + point['xp'])
        self.assertTrue(page.locator('#sheetContent .secretReward').is_visible())
        self.assertEqual(page.locator('.secretReward h2').evaluate('(el)=>getComputedStyle(el).color'), 'rgb(255, 255, 255)')
        page.keyboard.press('Escape')
        page.locator('#locationBtn').click()
        self.assertEqual(page.evaluate('state.totalXp'), before + point['xp'])


if __name__ == '__main__':
    unittest.main()
