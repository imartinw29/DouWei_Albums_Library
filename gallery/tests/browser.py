"""Run with: uv run --with playwright python gallery/tests/browser.py"""
import asyncio, datetime, json
from pathlib import Path
from playwright.async_api import async_playwright
BASE = 'http://127.0.0.1:45031/gallery/'
ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'albums.json').read_text())
LATEST = sorted(DATA, key=lambda a: a['date'], reverse=True)[0]['name']
OUT = Path('/tmp/douwei-gallery-preview')

async def main():
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=str(Path.home()/'.cache/ms-playwright/chromium-1217/chrome-linux64/chrome'), args=['--no-sandbox'])
        page = await b.new_page(viewport={'width':1440,'height':1040}, device_scale_factor=1)
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        response=await page.goto(BASE+'index.html',wait_until='networkidle')
        assert response.status == 200, 'New Gallery homepage not implemented'
        await page.locator('[data-latest]').wait_for()
        assert await page.locator('[data-latest]').inner_text() == LATEST
        assert await page.locator('[data-count]').first.inner_text() == str(len(DATA))
        await page.screenshot(path=str(OUT/'home-desktop.png'),full_page=True)
        await page.locator('.feature-link').click()
        await page.locator('.track-list').wait_for()
        assert await page.locator('h1').inner_text() == LATEST
        await page.screenshot(path=str(OUT/'detail-desktop.png'),full_page=True)
        await page.goto(BASE+'works.html',wait_until='networkidle')
        await page.locator('.work-card').first.wait_for()
        assert await page.locator('.work-card').count() == len(DATA)
        images=await page.evaluate('''async () => {
            const images=[...document.querySelectorAll('.work-card img')];
            images.forEach(i=>i.loading='eager');
            await Promise.all(images.map(i=>i.decode().catch(()=>null)));
            return {total:images.length,loaded:images.filter(i=>i.complete&&i.naturalWidth>0).length};
        }''')
        assert images=={'total':len(DATA),'loaded':len(DATA)},images
        await page.screenshot(path=str(OUT/'works-desktop.png'))
        await page.locator('[name=q]').fill('黑梦')
        await page.wait_for_function("document.querySelectorAll('.work-card').length === 1")
        await page.locator('.work-card').click()
        await page.locator('.track-list').wait_for()
        assert await page.locator('h1').inner_text() == '黑梦'
        await page.screenshot(path=str(OUT/'black-dream-desktop.png'),full_page=True)
        await page.locator('.detail-cover').click()
        assert await page.locator('dialog[open]').count()==1
        await page.keyboard.press('Escape')
        assert await page.locator('dialog[open]').count()==0
        assert await page.locator('.detail-cover').evaluate('(el)=>el===document.activeElement')
        await page.locator('[data-back]').click()
        assert await page.locator('[name=q]').input_value() == '黑梦'
        await page.locator('[data-reset]').click()
        await page.select_option('[name=year]','2026')
        await page.select_option('[name=group]','朝简')
        expect=sum(a['year']==2026 and a.get('album_artist')=='朝简' for a in DATA)
        assert await page.locator('.work-card').count() == expect
        await page.locator('[data-view=wall]').click()
        assert await page.locator('#collection.wall').count() == 1
        assert await page.locator('.work-card').count() == expect
        await page.reload(wait_until='networkidle')
        assert await page.locator('#collection.wall').count() == 1
        await page.locator('[name=q]').fill('无此作品xyz')
        await page.locator('.empty-state').wait_for()
        assert await page.locator('.work-card').count()==0
        await page.goto(BASE+'work.html?id=missing',wait_until='networkidle')
        assert '失效' in await page.locator('main').inner_text()
        assert await page.locator('audio,video,iframe').count()==0
        await page.set_viewport_size({'width':390,'height':844})
        for f,name in [('index.html','home-mobile'),('works.html','works-mobile')]:
            await page.goto(BASE+f,wait_until='networkidle')
            await page.locator('.feature-link' if f=='index.html' else '.work-card').first.wait_for()
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f+' overflows mobile'
            await page.screenshot(path=str(OUT/(name+'.png')))
        await page.locator('.work-card').first.click()
        await page.locator('.detail-cover').wait_for()
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        await page.screenshot(path=str(OUT/'detail-mobile.png'),full_page=True)
        # Decade entry and 320px layout.
        await page.goto(BASE+'index.html',wait_until='networkidle')
        await page.locator('.decade').first.click()
        await page.locator('.work-card').first.wait_for()
        assert await page.locator('.work-card').count()==sum(1990<=a['year']<2000 for a in DATA)
        for width in [320,768]:
            await page.set_viewport_size({'width':width,'height':900})
            await page.goto(BASE+'index.html',wait_until='networkidle')
            assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
            await page.goto(BASE+'works.html',wait_until='networkidle')
            assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        # Thumbnail loss must fall back to the real cover, not a blank tile.
        await page.route('**/thumbs/**',lambda route:route.fulfill(status=404,body='missing'))
        await page.goto(BASE+'index.html',wait_until='networkidle')
        assert await page.locator('.feature img').evaluate('(i)=>i.complete&&i.naturalWidth>0&&i.getAttribute("src").startsWith("../covers/")')
        await page.unroute('**/thumbs/**')
        # A new release must reach the homepage without editing homepage content.
        # The fixture date is derived from the real catalogue so this never goes stale.
        _y, _m, _d = map(int, max(a['date'] for a in DATA).split('-'))
        _next = (datetime.date(_y, _m, _d) + datetime.timedelta(days=1)).isoformat()
        new_data=DATA+[{'name':'同步测试作品','date':_next,'album_artist':'窦唯','cover':DATA[0]['cover']}]
        await page.route('**/albums.json',lambda route: route.fulfill(json=new_data))
        await page.goto(BASE+'index.html',wait_until='networkidle')
        assert await page.locator('[data-latest]').inner_text()=='同步测试作品'
        assert await page.locator('[data-count]').first.inner_text()==str(len(new_data))
        await page.unroute('**/albums.json')
        await page.route('**/albums.json',lambda route: route.fulfill(status=500,body='failed'))
        await page.goto(BASE+'index.html',wait_until='networkidle')
        await page.locator('[data-retry]').wait_for()
        assert '资料暂时未能载入' in await page.locator('main').inner_text()
        assert not errors,errors
        await b.close()
    print(json.dumps({'status':'PASS','works':len(DATA),'screenshots':str(OUT),'checks':['latest release','dynamic count','all works','track search/filter','deep link','filter restoration','wall persistence','empty result','missing detail','mobile geometry','new release sync (intercepted test fixture only)','load failure','no JS errors']},ensure_ascii=False))

asyncio.run(main())
