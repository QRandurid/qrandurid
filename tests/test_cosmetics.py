"""Browser regression tests. Run: python3 -m unittest discover -s tests -v.

Requires Python Playwright and an installed Chromium (CHROMIUM_BIN overrides its path).
The suite starts its own local server and exercises the supported CDN failure path.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import threading
import unittest

from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class CosmeticsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]
        handler = functools.partial(QuietHandler, directory=str(root))
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        executable = os.environ.get('CHROMIUM_BIN') or shutil.which('chromium')
        cls.browser = cls.playwright.chromium.launch(
            **({'executable_path': executable} if executable else {}),
            headless=True, args=['--no-sandbox'],
        )

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844})
        self.context.route('https://**', lambda route: route.abort())
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.goto(self.url, wait_until='networkidle')
        self.page.locator('.nav button').nth(3).click()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def test_catalog_images_filters_and_keyboard_tabs(self):
        page = self.page
        self.assertEqual(page.locator('#skinsGrid button').count(), 24)
        page.wait_for_function("[...document.querySelectorAll('#skinsGrid img')].every(i=>i.complete&&i.naturalWidth>0)")
        self.assertEqual(page.locator('#skinsGrid img').count(), 24)
        page.locator('#skinSearch').fill('draakon')
        self.assertEqual(page.locator('#skinsGrid button').count(), 1)
        page.locator('#skinSearch').fill('')
        page.locator('#skinTab').focus()
        page.keyboard.press('ArrowRight')
        self.assertTrue(page.locator('#framePanel').is_visible())
        self.assertTrue(page.locator('#skinPanel').is_hidden())
        self.assertEqual(page.locator('#framesGrid button').count(), 12)
        page.wait_for_function("[...document.querySelectorAll('#framesGrid img')].every(i=>i.complete&&i.naturalWidth>0)")
        page.locator('#frameRarity').select_option('LEGENDARY')
        self.assertEqual(page.locator('#framesGrid button').count(), 3)
        page.locator('#frameSearch').fill('puudub')
        self.assertTrue(page.locator('#framesGrid .emptyState').is_visible())
        for width in (320, 390, 1280):
            page.set_viewport_size({'width': width, 'height': 900})
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))

    def test_frame_selection_removal_and_profile_persistence(self):
        page = self.page
        page.locator('#frameTab').click()
        page.locator('#framesGrid [aria-label="Metsik aed"]').click()
        page.locator('#sheetContent .btn').click()
        self.assertEqual(page.evaluate('state.equippedFrame'), 'f2')
        page.locator('#skinTab').click()
        page.locator('#skinsGrid [aria-label="Linnaseikleja"]').click()
        page.locator('#sheetContent .btn').click()
        self.assertEqual(page.evaluate('state.equippedSkin'), 's1')
        self.assertEqual(page.evaluate('state.equippedFrame'), 'f2')
        page.locator('.nav button').nth(5).click()
        self.assertTrue(page.locator('#myProfile .frameArt').get_attribute('src').endswith('f2.svg'))
        page.locator('.nav button').nth(1).click()
        self.assertTrue(page.locator('.leaderRow.me .frameArt').get_attribute('src').endswith('f2.svg'))
        page.locator('.leaderRow.me').click()
        self.assertTrue(page.locator('#sheetContent .frameArt').get_attribute('src').endswith('f2.svg'))
        page.keyboard.press('Escape')
        page.reload(wait_until='networkidle')
        self.assertEqual(page.evaluate('[state.equippedSkin,state.equippedFrame]'), ['s1', 'f2'])
        page.evaluate('equipFrame(null)')
        self.assertEqual(page.locator('#myProfile .frameArt').count(), 0)
        page.reload(wait_until='networkidle')
        self.assertIsNone(page.evaluate('state.equippedFrame'))

    def test_locked_previews_do_not_equip_or_unlock(self):
        page = self.page
        page.locator('#skinsGrid [aria-label="Tallinna draakon — lukus"]').click()
        self.assertIn('Tallinna draakon', page.locator('#sheetContent h2').inner_text())
        self.assertEqual(page.locator('#sheetContent .btn').count(), 0)
        self.assertEqual(page.evaluate('state.equippedSkin'), 's5')
        page.keyboard.press('Escape')
        page.locator('#frameTab').click()
        page.locator('#framesGrid [aria-label="Draakonivalve — lukus"]').click()
        self.assertTrue(page.locator('#sheetContent .frameArt').get_attribute('src').endswith('f10.svg'))
        self.assertEqual(page.locator('#sheetContent .btn').count(), 0)
        page.evaluate("equipFrame('f10');equipSkin('s22')")
        self.assertEqual(page.evaluate('[state.equippedSkin,state.equippedFrame,state.frames.length]'), ['s5', 'f1', 2])

    def test_frames_drop_from_qr_rewards_and_duplicates_award_xp(self):
        page = self.page
        # Deterministic legendary frame drop through the actual reward pipeline.
        script = """() => {const original=Math.random;try{Math.random=()=>0.999;
            const reward=grantOne();save();showRewards([reward]);return reward;
            }finally{Math.random=original}}"""
        first = page.evaluate(script)
        self.assertEqual(first['type'], 'frame')
        self.assertFalse(first['duplicate'])
        self.assertEqual(first['item']['id'], 'f12')
        self.assertEqual(page.locator('#sheetContent .frameArt').count(), 1)
        self.assertIn('Fööniksileek', page.locator('#sheetContent h2').inner_text())
        before = page.evaluate('state.totalXp')
        second = page.evaluate(script)
        self.assertTrue(second['duplicate'])
        self.assertEqual(page.evaluate('state.totalXp'), before + 200)
        self.assertEqual(page.evaluate("state.frames.filter(id=>id==='f12').length"), 1)
        page.keyboard.press('Escape')
        page.locator('#frameTab').click()
        page.locator('#framesGrid [aria-label="Fööniksileek"]').click()
        page.locator('#sheetContent .btn').click()
        self.assertEqual(page.evaluate('state.equippedFrame'), 'f12')

    def test_legacy_save_migrates_and_invalid_frame_is_sanitized(self):
        saved = dict(username='Vana mängija', totalXp=4321, weeklyXp=789,
                     scanned=['oldtown', 'pirita'], claimed=['oldtown'],
                     skins=['s1', 's10'], songs=['m2', 'm24'],
                     equippedSkin='s10', equippedSong='m2', spotifyDemoV1=True)
        self.page.evaluate('(data)=>localStorage.setItem(KEY,JSON.stringify(data))', saved)
        self.page.reload(wait_until='networkidle')
        self.assertEqual(self.page.evaluate('[state.totalXp,state.equippedSkin,state.equippedSong,state.claimed.length]'), [4321, 's10', 'm2', 1])
        self.assertEqual(self.page.evaluate('state.frames'), ['f1', 'f2'])
        saved.update(frames=['f2', 'f2', 'invalid'], equippedFrame='f12')
        self.page.evaluate('(data)=>localStorage.setItem(KEY,JSON.stringify(data))', saved)
        self.page.reload(wait_until='networkidle')
        self.assertEqual(self.page.evaluate('state.frames'), ['f2'])
        self.assertEqual(self.page.evaluate('state.equippedFrame'), 'f2')

    def test_all_cosmetics_available_offline_after_install(self):
        page = self.page
        page.evaluate('navigator.serviceWorker.ready')
        page.wait_for_function('!!navigator.serviceWorker.controller')
        cached = page.evaluate("caches.open('qrandurid-demo-social-v9-accounts-connected').then(async cache=>(await cache.keys()).map(r=>r.url))")
        self.assertEqual(len([url for url in cached if '/art/' in url]), 36)
        self.context.set_offline(True)
        page.reload(wait_until='load')
        page.locator('.nav button').nth(3).click()
        page.wait_for_function("[...document.querySelectorAll('#skinsGrid img')].every(i=>i.complete&&i.naturalWidth>0)")
        page.locator('#frameTab').click()
        page.wait_for_function("[...document.querySelectorAll('#framesGrid img')].every(i=>i.complete&&i.naturalWidth>0)")
        self.assertEqual(page.locator('#framesGrid button').count(), 12)


if __name__ == '__main__':
    unittest.main()
