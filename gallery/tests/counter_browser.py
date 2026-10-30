"""Counter tests use explicit SVG fixtures; these are not real visitor counts."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=str(Path.home()/'.cache/ms-playwright/chromium-1217/chrome-linux64/chrome'),args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':390,'height':844})
        requests=[]
        page.on('request',lambda r:requests.append(r.url))
        await page.goto('http://127.0.0.1:45040/gallery/index.html',wait_until='networkidle')
        assert (ROOT/'gallery/counter.mjs').is_file(),'Missing counter module'
        assert not any('hits.sh' in u for u in requests),'Local previews must not count'
        async def module(route):
            response=await route.fetch()
            body=(await response.text()).replace("location.hostname==='imartinw29.github.io'","location.hostname==='127.0.0.1'").replace("location.pathname.startsWith('/DouWei_Albums_Library/gallery/')","location.pathname.startsWith('/gallery/')")
            await route.fulfill(response=response,body=body)
        await page.route('**/counter.mjs',module)
        async def fixture(route):
            await route.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="90" height="20"><text y="15">TEST 7</text></svg>')
        await page.route('https://hits.sh/**',fixture)
        for path in ['index.html','works.html','work.html?id=missing']:
            await page.goto('http://127.0.0.1:45040/gallery/'+path,wait_until='networkidle')
            await page.wait_for_function('document.querySelector(".visit-counter")?.hidden===false')
            image=page.locator('.visit-counter img')
            src=await image.get_attribute('src')
            assert '/imartinw29.github.io/DouWei_Albums_Library.svg?' in src
            assert 'extraCount' not in src
            assert await image.get_attribute('referrerpolicy')=='no-referrer'
            assert await image.evaluate('(e)=>e.naturalWidth>0')
            assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        await page.unroute('https://hits.sh/**')
        await page.route('https://hits.sh/**',lambda route:route.abort())
        await page.reload(wait_until='networkidle')
        assert await page.locator('.visit-counter').is_hidden()
        assert await page.locator('header').is_visible()
        await browser.close()
    print('PASS: no local counting; three-page footer; isolated site key; SVG fixture success; network failure hidden; mobile width')
asyncio.run(main())
