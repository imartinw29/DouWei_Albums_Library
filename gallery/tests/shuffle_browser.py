"""Verify decade refresh, accessible button, and responsive layout."""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

BASE=os.environ.get('GALLERY_TEST_BASE','http://127.0.0.1:45040/gallery/')
OUT=Path.home()/'.hermes/cache/scratch'

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=str(Path.home()/'.cache/ms-playwright/chromium-1217/chrome-linux64/chrome'),args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        await page.goto(BASE+'index.html',wait_until='networkidle')
        button=page.get_by_role('button',name='换一批',exact=True)
        assert await button.count()==1,'Missing refresh button'
        assert await button.locator('svg').count()==1
        section=page.locator('.time-exhibit')
        cards=section.locator('.decade')
        before=await cards.evaluate_all('(els)=>els.map(e=>({text:e.querySelector("p").textContent,href:e.getAttribute("href"),head:e.querySelector(".decade-head").textContent}))')
        assert len(before)==4
        await button.scroll_into_view_if_needed()
        top=await section.evaluate('(e)=>e.getBoundingClientRect().top')
        for _ in range(8):
            await button.click()
            after=await cards.evaluate_all('(els)=>els.map(e=>({text:e.querySelector("p").textContent,href:e.getAttribute("href"),head:e.querySelector(".decade-head").textContent}))')
            assert len(after)==4
            assert all(a['text']!=b['text'] for a,b in zip(before,after)),(before,after)
            assert all(a['href']==b['href'] and a['head']==b['head'] for a,b in zip(before,after))
            before=after
        assert abs(await section.evaluate('(e)=>e.getBoundingClientRect().top')-top)<2
        await button.focus()
        await page.keyboard.press('Enter')
        assert await cards.nth(0).locator('p').inner_text()!=before[0]['text']
        await page.wait_for_function('Array.from(document.querySelectorAll(".decade img")).every(i=>i.complete && i.naturalWidth>0)')
        await button.evaluate('(e)=>e.blur()')
        await section.screenshot(path=str(OUT/'douwei-shuffle-desktop.png'))
        await page.set_viewport_size({'width':390,'height':844})
        await button.scroll_into_view_if_needed()
        await button.click()
        assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        await page.wait_for_function('Array.from(document.querySelectorAll(".decade img")).every(i=>i.complete && i.naturalWidth>0)')
        await button.evaluate('(e)=>e.blur()')
        title_box=await page.locator('#time-title').bounding_box()
        button_box=await button.bounding_box()
        assert abs(title_box['y']-button_box['y'])<15
        await section.screenshot(path=str(OUT/'douwei-shuffle-mobile.png'))
        assert not errors,errors
        await browser.close()
    print('PASS: refresh x8, per-decade nonrepeat, stable links/counts/scroll, keyboard, mobile, screenshots')

asyncio.run(main())
