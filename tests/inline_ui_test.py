"""Inline-render acceptance checks for environments that block browser URL navigation.
Storage persistence is simulated with an in-memory Storage-compatible adapter.
The app itself is unmodified. A fresh page can restore the exported adapter state.
This is NOT a live-host, filesystem-navigation, service-worker, or Safari test.
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa'
OUT.mkdir(exist_ok=True)
HTML = (ROOT/'dist'/'index.html').read_text()
checks=[]
errors=[]

def passed(name):
    checks.append({'check':name,'result':'PASS'})
    print('PASS:',name,flush=True)

def mount(ctx, saved=None, blocked=False):
    page=ctx.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    if blocked:
        boot="Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked');}});"
    else:
        boot="""const store=new Map(Object.entries(SEED));
        Object.defineProperty(window,'localStorage',{value:{
          getItem(k){return store.has(String(k))?store.get(String(k)):null;},
          setItem(k,v){store.set(String(k),String(v));},removeItem(k){store.delete(String(k));},
          clear(){store.clear();},key(i){return [...store.keys()][i]??null;},get length(){return store.size;}
        }});window.__testStorage=()=>Object.fromEntries(store);""".replace('SEED',json.dumps(saved or {}))
    # This fixture exists only in the acceptance-test document, never in the distributed HTML.
    page.set_content('<script>'+boot+'</script>'+HTML,wait_until='load')
    expect(page.get_by_role('button',name='Quest board',exact=True)).to_be_visible()
    return page

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(viewport={'width':1440,'height':1100})
    page=mount(ctx)
    assert page.locator('.hero-metrics .metric-value').first.inner_text().strip()=='3 / 5'
    page.screenshot(path=str(OUT/'desktop-board.png'),full_page=True)
    passed('Desktop board renders seeded 3/5 objectives and five inventory items')

    page.get_by_role('button',name='Loot acquired',exact=True).click()
    assert page.locator('.hero-metrics .metric-value').first.inner_text().strip()=='4 / 5'
    saved=page.evaluate('__testStorage()')
    page.close(); page=mount(ctx,saved)
    assert page.locator('.hero-metrics .metric-value').first.inner_text().strip()=='4 / 5'
    assert page.locator('.hero-metrics .metric-value').nth(1).inner_text().strip()=='280 XP'
    passed('Completion writes a save and a fresh rendered page restores it (storage adapter)')

    page.get_by_role('button',name='Loot acquired',exact=True).click()
    assert page.locator('.hero-metrics .metric-value').first.inner_text().strip()=='5 / 5'
    page.get_by_role('button',name='Undo completion: CeraVe mineral SPF 50 - untinted',exact=True).click()
    assert page.locator('.hero-metrics .metric-value').first.inner_text().strip()=='4 / 5'
    passed('Main quest completes; undo reverses its count, reward, and inventory')

    page.get_by_role('button',name='+ Add objective',exact=True).click()
    title='Test <img src=x onerror=alert(1)>'
    page.get_by_label('Objective',exact=True).fill(title)
    page.get_by_label('Quest type',exact=True).select_option('side')
    page.get_by_label('Reward XP',exact=True).fill('0')
    page.get_by_role('button',name='Create objective',exact=True).click()
    expect(page.get_by_role('button',name=title,exact=True)).to_be_visible()
    assert page.locator('img[src="x"]').count()==0
    page.get_by_role('button',name=title,exact=True).click()
    page.get_by_role('button',name='Declare impossible',exact=True).click()
    page.get_by_label('Reason (optional)',exact=True).fill('Unavailable.')
    page.get_by_role('button',name='Declare impossible',exact=True).click()
    assert page.locator('.hero-metrics .metric-value').nth(1).inner_text().strip()=='280 XP'
    passed('Untrusted objective text is escaped; impossible closure applies no penalty')

    page.get_by_role('button',name='Switch player',exact=True).click()
    page.get_by_label('New player name',exact=True).fill('Sam')
    page.get_by_role('button',name='Create clean player',exact=True).click()
    assert page.locator('.hero-metrics .metric-value').nth(1).inner_text().strip()=='0 XP'
    assert page.evaluate('QuestOS.getSnapshot().players.length')==2
    page.get_by_role('button',name='Create dungeon',exact=True).click()
    page.get_by_label('Dungeon name',exact=True).fill('Weekend')
    page.get_by_label('Main quest',exact=True).fill('Win the weekend')
    page.locator('#modal button[form="campaign-form"]').click()
    page.get_by_role('button',name='Add an objective',exact=True).click()
    page.get_by_label('Objective',exact=True).fill('Buy bread')
    page.get_by_label('Inventory item (optional)',exact=True).fill('Bread')
    page.get_by_role('button',name='Create objective',exact=True).click()
    page.get_by_role('button',name='Inspect',exact=False).click()
    page.get_by_role('button',name='Edit',exact=True).click()
    page.get_by_label('One next move',exact=True).fill('Find the bakery.')
    page.get_by_role('button',name='Save changes',exact=True).click()
    expect(page.get_by_text('Find the bakery.',exact=True)).to_be_visible()
    passed('Independent player, new dungeon, objective creation, and edit controls work')

    page.get_by_role('button',name='Skills',exact=True).click()
    page.get_by_role('button',name='Log practice',exact=True).first.click()
    page.get_by_label('What did you practice? (optional)',exact=True).fill('Forms')
    page.get_by_role('button',name='Session completed',exact=True).click()
    assert '40 XP' in page.locator('.skill-card').first.inner_text()
    page.get_by_role('button',name='Log practice',exact=True).first.click()
    expect(page.get_by_role('button',name='Session completed',exact=True)).to_be_disabled()
    page.get_by_role('button',name='Close dialog',exact=True).click()
    page.get_by_role('button',name='Recovery',exact=True).first.click()
    expect(page.locator('.skill-card').first.get_by_role('button',name='Log practice',exact=True)).to_be_disabled()
    page.get_by_role('button',name='Resume',exact=True).first.click()
    passed('Practice reward, daily cap, and recovery-mode controls work')

    snapshot=page.evaluate('JSON.stringify(QuestOS.getSnapshot())')
    page.locator('#break-days').fill('120')
    page.locator('#return-sessions').fill('4')
    assert page.locator('#sim-level').inner_text()=='8'
    assert page.evaluate('JSON.stringify(QuestOS.getSnapshot())')==snapshot
    page.screenshot(path=str(OUT/'desktop-skills.png'),full_page=True)
    passed('Decay simulator previews level loss and return without changing the save')

    page.get_by_role('button',name='Workshop',exact=True).click()
    expect(page.get_by_label('Allow calls while this game is open')).not_to_be_checked()
    page.get_by_role('button',name='Try an example module',exact=True).click()
    page.get_by_role('button',name='Review changes',exact=True).click()
    assert len(page.evaluate('QuestOS.getSnapshot().players[1].modules'))==0
    page.get_by_role('button',name='Apply changes',exact=True).click()
    expect(page.get_by_role('heading',name='Morning Signal',exact=True)).to_be_visible()
    page.get_by_role('button',name='Try an example module',exact=True).click()
    page.get_by_role('button',name='Review changes',exact=True).click()
    expect(page.locator('#toast')).to_contain_text('already installed')
    page.get_by_role('button',name='Close dialog',exact=True).click()
    passed('Module preview, installation, and duplicate-install rejection work')

    patch={'kind':'questos.patch','version':1,'operations':[{'type':'addQuest','quest':{'title':'An agent-created quest','category':'side'}}]}
    page.get_by_role('button',name='Import a reply',exact=True).click()
    page.get_by_label('Paste JSON',exact=True).fill(json.dumps(patch))
    page.get_by_role('button',name='Review changes',exact=True).click()
    assert 'An agent-created quest' not in page.evaluate('JSON.stringify(QuestOS.getSnapshot())')
    page.get_by_role('button',name='Apply changes',exact=True).click()
    assert 'An agent-created quest' in page.evaluate('JSON.stringify(QuestOS.getSnapshot())')
    page.get_by_role('button',name='Copy agent handoff',exact=True).click()
    assert 'Win the weekend' in page.locator('#agent-brief').input_value()
    assert "Nature's Bounty" not in page.locator('#agent-brief').input_value()
    page.get_by_role('button',name='Close dialog',exact=True).click()
    passed('ChatGPT patches require approval; handoffs exclude other players')

    with page.expect_download() as info:
        page.get_by_role('button',name='Export full save',exact=True).click()
    save_path=OUT/'test-save.json'; info.value.save_as(str(save_path))
    assert len(json.loads(save_path.read_text())['players'])==2
    page.locator('#import-file').set_input_files(str(save_path))
    expect(page.get_by_role('button',name='Replace all local saves',exact=True)).to_be_visible()
    page.get_by_role('button',name='Replace all local saves',exact=True).click()
    passed('JSON backup download and explicit full-state restore work')

    page.get_by_role('button',name='Quest board',exact=True).click()
    page.get_by_role('button',name='Receive a transmission',exact=True).click()
    expect(page.get_by_text('SIMULATED IN-GAME CALL / NOT A PHONE CALL',exact=True)).to_be_visible()
    page.get_by_role('button',name='Answer',exact=True).click()
    expect(page.locator('.call-copy')).to_be_visible()
    page.screenshot(path=str(OUT/'operator-call.png'))
    page.get_by_role('button',name='End transmission',exact=True).click()
    page.get_by_role('button',name='Driving mode',exact=False).click()
    expect(page.locator('#drive-screen')).to_be_visible()
    assert page.locator('#app').evaluate('(el)=>el.inert')
    page.get_by_role('button',name="I'm parked - resume quest",exact=True).click()
    expect(page.locator('#drive-screen')).to_be_hidden()
    passed('Fictional call answers; driving mode makes the game board inert')

    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    mp=mount(mobile)
    for name,slug in [('Quest board','board'),('Skills','skills'),('Inventory','inventory'),('Workshop','workshop')]:
        mp.get_by_role('button',name=name,exact=True).click()
        assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth'),slug
        mp.screenshot(path=str(OUT/f'mobile-{slug}.png'),full_page=True)
    mp.get_by_role('button',name='Copy agent handoff',exact=True).click()
    assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mp.get_by_role('button',name='Close dialog',exact=True).click()
    passed('390px touch layout: all four screens and the handoff dialog fit without horizontal overflow')

    bp=mount(browser.new_context(),blocked=True)
    expect(bp.get_by_text('Browser storage is unavailable.',exact=False)).to_be_visible()
    bp.get_by_role('button',name='Loot acquired',exact=True).click()
    assert bp.locator('.hero-metrics .metric-value').first.inner_text().strip()=='4 / 5'
    passed('Unavailable storage uses working session mode and clearly requests a backup')

    cp=mount(browser.new_context(),{'questos.v1':'{broken'})
    expect(cp.get_by_text('A saved game could not be read.',exact=False)).to_be_visible()
    cp.get_by_role('button',name='Loot acquired',exact=True).click()
    assert cp.evaluate("localStorage.getItem('questos.v1')")=='{broken'
    passed('An unreadable save is preserved instead of being silently overwritten')

    assert not errors,errors
    passed('No uncaught JavaScript errors across the rendered interaction checks')
    browser.close()

report={'checks':len(checks),'passed':len(checks),'results':checks,
        'scope':'Unmodified app rendered inline in Chromium. 1440px desktop and 390px touch viewport. Storage adapter used for save/restore flow.',
        'not_tested':['Physical iPhone or Safari','Actual file:// opening','Live hosting','Real localStorage persistence across browser restarts','Service worker offline navigation'],
        'environment_limitation':'Installed browser blocks localhost and file URL navigation with ERR_BLOCKED_BY_ADMINISTRATOR. No restrictions were changed.'}
(OUT/'inline-browser-test-report.json').write_text(json.dumps(report,indent=2))
print(f'{len(checks)} inline browser checks passed.')
