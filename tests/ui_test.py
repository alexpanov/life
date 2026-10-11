"""Browser acceptance checks. Requires Python Playwright and a Chromium executable.
Run: python tests/ui_test.py --chromium /usr/bin/chromium
These test a Chromium mobile viewport, not a physical iPhone or Safari.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--chromium', default=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'))
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa'
OUT.mkdir(exist_ok=True)
results = []
def passed(name):
    results.append({'check': name, 'result': 'PASS'})
    print('PASS:', name, flush=True)

env = dict(os.environ, PORT='4178')
server = subprocess.Popen(['node', 'server.mjs'], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
try:
    for _ in range(50):
        try:
            urllib.request.urlopen('http://127.0.0.1:4178', timeout=1)
            break
        except Exception:
            time.sleep(.1)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox'])
        ctx = browser.new_context(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
        page = ctx.new_page()
        errors = []
        requests = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        page.goto('http://127.0.0.1:4178')
        expect(page.get_by_role('heading', name='Make wife happy', exact=True)).to_be_visible()
        assert page.locator('.hero-metrics .metric-value').first.inner_text().strip() == '3 / 5'
        assert page.evaluate('QuestOS.getSnapshot().players[0].bonusLoot.length') == 2
        page.screenshot(path=str(OUT / 'desktop-board.png'), full_page=True)
        passed('Initial handoff: 3/5 objectives, bonus loot, no script errors')

        page.get_by_role('button', name='Loot acquired', exact=True).click()
        assert page.locator('.hero-metrics .metric-value').first.inner_text().strip() == '4 / 5'
        page.reload()
        expect(page.get_by_role('heading', name='CeraVe mineral SPF 50 - untinted', exact=True)).to_be_visible()
        assert page.locator('.hero-metrics .metric-value').nth(1).inner_text().strip() == '280 XP'
        passed('Acquire first sunscreen and reload: completion and XP persist')

        page.get_by_role('button', name='Loot acquired', exact=True).click()
        assert page.locator('.hero-metrics .metric-value').first.inner_text().strip() == '5 / 5'
        assert page.locator('.hero-metrics .metric-value').nth(1).inner_text().strip() == '380 XP'
        page.get_by_role('button', name='Undo completion: CeraVe mineral SPF 50 - untinted', exact=True).click()
        assert page.locator('.hero-metrics .metric-value').first.inner_text().strip() == '4 / 5'
        passed('Complete main quest, then undo: XP and objective count reverse')

        page.get_by_role('button', name='+ Add objective', exact=True).click()
        title = 'Test <img src=x onerror=alert(1)>'
        page.get_by_label('Objective', exact=True).fill(title)
        page.get_by_label('One next move', exact=True).fill('Check one thing.')
        page.get_by_label('Quest type', exact=True).select_option('side')
        page.get_by_label('Reward XP', exact=True).fill('0')
        page.get_by_role('button', name='Create objective', exact=True).click()
        expect(page.get_by_role('button', name=title, exact=True)).to_be_visible()
        assert page.locator('img[src="x"]').count() == 0
        page.get_by_role('button', name=title, exact=True).click()
        page.get_by_role('button', name='Declare impossible', exact=True).click()
        page.get_by_label('Reason (optional)', exact=True).fill('Not available.')
        page.get_by_role('button', name='Declare impossible', exact=True).click()
        assert page.locator('.hero-metrics .metric-value').nth(1).inner_text().strip() == '280 XP'
        passed('New objective: untrusted text is escaped, zero XP and impossible closure work')

        page.get_by_role('button', name='Switch player', exact=True).click()
        page.get_by_label('New player name', exact=True).fill('Sam')
        page.get_by_role('button', name='Create clean player', exact=True).click()
        expect(page.get_by_role('heading', name='Turn a real task into an adventure', exact=True)).to_be_visible()
        assert page.evaluate('QuestOS.getSnapshot().players.length') == 2
        assert page.locator('.hero-metrics .metric-value').nth(1).inner_text().strip() == '0 XP'
        passed('Separate local player starts clean; Alex progress is preserved')

        page.get_by_role('button', name='Create dungeon', exact=True).click()
        page.get_by_label('Dungeon name', exact=True).fill('Weekend')
        page.get_by_label('Main quest', exact=True).fill('Win the weekend')
        page.locator('#modal button[form="campaign-form"]').click()
        expect(page.get_by_role('heading', name='Win the weekend', exact=True)).to_be_visible()
        page.get_by_role('button', name='Add an objective', exact=True).click()
        page.get_by_label('Objective', exact=True).fill('Buy bread')
        page.get_by_label('Inventory item (optional)', exact=True).fill('Bread')
        page.get_by_role('button', name='Create objective', exact=True).click()
        page.get_by_role('button', name='Inspect', exact=False).click()
        page.get_by_role('button', name='Edit', exact=True).click()
        page.get_by_label('One next move', exact=True).fill('Find the bakery.')
        page.get_by_role('button', name='Save changes', exact=True).click()
        expect(page.get_by_text('Find the bakery.', exact=True)).to_be_visible()
        passed('Create reusable dungeon, add objective, and edit its next move')

        page.get_by_role('button', name='Skills', exact=True).click()
        page.get_by_role('button', name='Log practice', exact=True).first.click()
        page.get_by_label('What did you practice? (optional)', exact=True).fill('Forms')
        page.get_by_role('button', name='Session completed', exact=True).click()
        assert '40 XP' in page.locator('.skill-card').first.inner_text()
        page.get_by_role('button', name='Log practice', exact=True).first.click()
        expect(page.get_by_role('button', name='Session completed', exact=True)).to_be_disabled()
        page.get_by_role('button', name='Close dialog', exact=True).click()
        page.get_by_role('button', name='Recovery', exact=True).first.click()
        expect(page.locator('.skill-card').first.get_by_role('button', name='Log practice', exact=True)).to_be_disabled()
        page.get_by_role('button', name='Resume', exact=True).first.click()
        passed('Practice logs, duplicate same-day rewards are blocked, recovery pauses training')

        snapshot_before = page.evaluate('JSON.stringify(QuestOS.getSnapshot())')
        page.locator('#break-days').fill('120')
        page.locator('#return-sessions').fill('4')
        assert page.locator('#sim-level').inner_text() == '8'
        assert page.evaluate('JSON.stringify(QuestOS.getSnapshot())') == snapshot_before
        page.screenshot(path=str(OUT / 'desktop-skills.png'), full_page=True)
        passed('Skill-decay simulator changes preview only, not saved game state')

        page.get_by_role('button', name='Workshop', exact=True).click()
        expect(page.get_by_label('Allow calls while this game is open')).not_to_be_checked()
        page.get_by_role('button', name='Try an example module', exact=True).click()
        page.get_by_role('button', name='Review changes', exact=True).click()
        assert len(page.evaluate('QuestOS.getSnapshot().players[1].modules')) == 0
        page.get_by_role('button', name='Apply changes', exact=True).click()
        expect(page.get_by_role('heading', name='Morning Signal', exact=True)).to_be_visible()
        assert len(page.evaluate('QuestOS.getSnapshot().players[1].modules')) == 1
        page.get_by_role('button', name='Try an example module', exact=True).click()
        page.get_by_role('button', name='Review changes', exact=True).click()
        expect(page.locator('#toast')).to_contain_text('already installed')
        page.get_by_role('button', name='Close dialog', exact=True).click()
        passed('Extensions require preview approval, add a module, and reject duplicate installs')

        patch = {'kind':'questos.patch','version':1,'operations':[{'type':'addQuest','quest':{'title':'An agent-created quest','category':'side'}}]}
        page.get_by_role('button', name='Import a reply', exact=True).click()
        page.get_by_label('Paste JSON', exact=True).fill(json.dumps(patch))
        page.get_by_role('button', name='Review changes', exact=True).click()
        assert 'An agent-created quest' not in page.evaluate('JSON.stringify(QuestOS.getSnapshot())')
        page.get_by_role('button', name='Apply changes', exact=True).click()
        assert 'An agent-created quest' in page.evaluate('JSON.stringify(QuestOS.getSnapshot())')
        passed('ChatGPT JSON patch does not mutate progress until Apply is clicked')

        page.get_by_role('button', name='Copy agent handoff', exact=True).click()
        assert 'Win the weekend' in page.locator('#agent-brief').input_value()
        assert 'Nature\'s Bounty' not in page.locator('#agent-brief').input_value()
        page.get_by_role('button', name='Close dialog', exact=True).click()
        passed('ChatGPT handoff excludes other local players')

        with page.expect_download() as download_info:
            page.get_by_role('button', name='Export full save', exact=True).click()
        save_path = OUT / 'test-save.json'
        download_info.value.save_as(str(save_path))
        exported = json.loads(save_path.read_text())
        assert len(exported['players']) == 2
        page.locator('#import-file').set_input_files(str(save_path))
        expect(page.get_by_role('button', name='Replace all local saves', exact=True)).to_be_visible()
        page.get_by_role('button', name='Replace all local saves', exact=True).click()
        assert len(page.evaluate('QuestOS.getSnapshot().players')) == 2
        passed('Full save downloads and restores through explicit replacement confirmation')

        page.get_by_role('button', name='Quest board', exact=True).click()
        page.get_by_role('button', name='Receive a transmission', exact=True).click()
        expect(page.get_by_text('SIMULATED IN-GAME CALL / NOT A PHONE CALL', exact=True)).to_be_visible()
        page.get_by_role('button', name='Answer', exact=True).click()
        expect(page.locator('.call-copy')).to_be_visible()
        page.get_by_role('button', name='End transmission', exact=True).click()
        page.get_by_role('button', name='Driving mode', exact=False).click()
        expect(page.locator('#drive-screen')).to_be_visible()
        assert page.locator('#app').evaluate('(el)=>el.inert')
        page.get_by_role('button', name="I'm parked - resume quest", exact=True).click()
        expect(page.locator('#drive-screen')).to_be_hidden()
        passed('Simulated call answers without phone access; driving mode locks controls')

        page2 = ctx.new_page()
        page2.goto('http://127.0.0.1:4178')
        page.get_by_role('button', name='Loot acquired', exact=True).click()
        expect(page2.get_by_text('Another tab updated this save. Latest state loaded.', exact=False)).to_be_visible()
        page2.close()
        passed('Changes in another tab update the current saved state')

        # Reset only the acceptance-test browser before taking mobile screenshots.
        mobile = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
        mp = mobile.new_page()
        mobile_errors = []
        mp.on('pageerror', lambda e: mobile_errors.append(str(e)))
        mp.goto('http://127.0.0.1:4178')
        assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
        mp.screenshot(path=str(OUT / 'mobile-board.png'), full_page=True)
        mp.get_by_role('button', name='Skills', exact=True).click()
        assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
        mp.screenshot(path=str(OUT / 'mobile-skills.png'), full_page=True)
        mp.get_by_role('button', name='Workshop', exact=True).click()
        assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
        mp.screenshot(path=str(OUT / 'mobile-workshop.png'), full_page=True)
        mp.get_by_role('button', name='Copy agent handoff', exact=True).click()
        assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
        mp.get_by_role('button', name='Close dialog', exact=True).click()
        assert not mobile_errors, mobile_errors
        passed('390px touch viewport: board, skills, workshop, and dialogs fit without overflow')

        # Service-worker offline reload: the hosted copy is usable after first visit.
        mp.goto('http://127.0.0.1:4178')
        mp.evaluate('navigator.serviceWorker.ready')
        mp.wait_for_function('navigator.serviceWorker.controller !== null')
        mobile.set_offline(True)
        mp.reload()
        expect(mp.get_by_role('heading', name='Make wife happy', exact=True)).to_be_visible()
        mobile.set_offline(False)
        passed('Hosted static copy reloads offline after first service-worker install')

        filectx = browser.new_context(viewport={'width':1024,'height':768})
        fp = filectx.new_page()
        file_errors=[]
        fp.on('pageerror', lambda e:file_errors.append(str(e)))
        fp.goto((ROOT/'dist'/'index.html').as_uri())
        expect(fp.get_by_role('heading', name='Make wife happy', exact=True)).to_be_visible()
        fp.get_by_role('button', name='Loot acquired', exact=True).click()
        assert fp.locator('.hero-metrics .metric-value').first.inner_text().strip() == '4 / 5'
        assert not file_errors, file_errors
        passed('Standalone HTML runs with working buttons over file:// in Chromium')

        blocked = browser.new_context(viewport={'width':1024,'height':768})
        blocked.add_init_script("Object.defineProperty(window, 'localStorage', {get(){throw new Error('blocked');}})")
        bp = blocked.new_page()
        bp.goto('http://127.0.0.1:4178')
        expect(bp.get_by_text('Browser storage is unavailable.', exact=False)).to_be_visible()
        bp.get_by_role('button', name='Loot acquired', exact=True).click()
        assert bp.locator('.hero-metrics .metric-value').first.inner_text().strip() == '4 / 5'
        passed('Blocked browser storage uses playable session mode with an export warning')

        corrupt = browser.new_context()
        corrupt.add_init_script("if (!localStorage.getItem('corrupt-seeded')){localStorage.setItem('questos.v1','{broken');localStorage.setItem('corrupt-seeded','true');}")
        cp = corrupt.new_page()
        cp.goto('http://127.0.0.1:4178')
        expect(cp.get_by_text('A saved game could not be read.', exact=False)).to_be_visible()
        cp.get_by_role('button', name='Loot acquired', exact=True).click()
        assert cp.evaluate("localStorage.getItem('questos.v1')") == '{broken'
        passed('Unreadable save is not silently overwritten by new actions')

        assert not errors, errors
        external = [url for url in requests if not url.startswith('http://127.0.0.1:4178') and not url.startswith(('data:','blob:'))]
        assert not external, external
        passed('No uncaught script errors or external network requests during gameplay')
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=5)
    report = {'checks':len(results),'passed':len(results),'results':results,
              'scope':'Chromium desktop, Chromium mobile emulation, file URL, offline, blocked storage. Physical iPhone/Safari not tested.'}
    (OUT/'browser-test-report.json').write_text(json.dumps(report,indent=2))
print(f'{len(results)} browser checks passed.')
