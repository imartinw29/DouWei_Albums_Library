"""End-to-end share-card checks. Run with the local preview server on port 45031."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE='http://127.0.0.1:45031/gallery/'
CANONICAL='https://imartinw29.github.io/DouWei_Albums_Library/gallery/'

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=str(Path.home()/'.cache/ms-playwright/chromium-1217/chrome-linux64/chrome'),args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':390,'height':844})
        await page.add_init_script('''(() => {
          window.__shareText=[];
          const old=CanvasRenderingContext2D.prototype.fillText;
          CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
            window.__shareText.push({text,x,y,align:this.textAlign});
            return old.call(this,text,x,y,...rest);
          };
        })()''')
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        for pathname in ('index.html','works.html','work.html?id=missing'):
            await page.goto(BASE+pathname,wait_until='networkidle')
            await page.get_by_role('button',name='分享本站').first.click()
            dialog=page.get_by_role('dialog',name='分享窦唯作品展')
            assert await dialog.is_visible(),pathname
            await page.wait_for_function("document.querySelector('.share-card-image')?.complete && document.querySelector('.share-card-image')?.naturalWidth>0")
            assert await dialog.locator('img.share-qr').evaluate('(el)=>el.complete && el.naturalWidth>0')
            assert await dialog.get_by_role('link',name=CANONICAL).get_attribute('href') == CANONICAL
            assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),pathname
            await page.keyboard.press('Escape')
            assert not await dialog.is_visible()
        await page.goto(BASE+'index.html',wait_until='networkidle')
        assert await page.locator('.site-header nav > :last-child').inner_text() == '分享本站'
        await page.get_by_role('button',name='分享本站').first.click()
        # Deterministic clipboard mock tests the user gesture path without OS permissions.
        await page.evaluate('''() => { window.__copied=''; navigator.clipboard.writeText=(s)=>{window.__copied=s;return Promise.resolve()}; }''')
        await page.get_by_role('button',name='复制链接').click()
        assert await page.evaluate('window.__copied')==CANONICAL
        assert '已复制' in await page.locator('.share-status').inner_text()
        await page.get_by_role('button',name='复制图片').click()
        assert ('已复制' in await page.locator('.share-status').inner_text()
                or '保存' in await page.locator('.share-status').inner_text())
        async with page.expect_download() as download_info:
            await page.get_by_role('link',name='保存名片 PNG').click()
        download=await download_info.value
        assert download.suggested_filename.endswith('.png')
        assert Path(await download.path()).read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
        await page.goto(BASE+'work.html?id=2026-10-24%7C%E7%A7%8B%E5%85%B4%E8%B5%8B%7C%E6%9C%9D%E7%AE%80',wait_until='networkidle')
        await page.get_by_role('button',name='分享本专辑').click()
        await page.wait_for_function("document.querySelector('.share-card-image')?.naturalWidth>0")
        assert await page.get_by_role('dialog',name='分享窦唯作品展').is_visible()
        assert '秋兴赋' in await page.locator('.share-head').inner_text()
        geometry=await page.evaluate('''async () => {
          const img=document.querySelector('.share-card-image');
          const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;
          const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
          const data=ctx.getImageData(0,0,900,1200).data;
          const white=[];
          for(let y=50;y<320;y++)for(let x=600;x<845;x++){
            const n=(y*900+x)*4;
            if(data[n]>235 && data[n+1]>235 && data[n+2]>235)white.push([x,y]);
          }
          return {rect:[Math.min(...white.map(p=>p[0])),Math.min(...white.map(p=>p[1])),
                        Math.max(...white.map(p=>p[0])),Math.max(...white.map(p=>p[1]))],
                  text:window.__shareText};
        }''')
        x1,y1,x2,y2=geometry['rect']
        assert 192<=x2-x1+1<=208,geometry['rect']
        assert 192<=y2-y1+1<=208,geometry['rect']
        assert abs((x1+x2)/2-747)<=2,geometry['rect']
        for label in ('《秋兴赋》','2026.10.24  /  朝简'):
            assert any(t['text']==label and t['align']=='center' and t['x']==450 for t in geometry['text']),label
        assert any(t['text']=='imartinw29.github.io/DouWei_Albums_Library/gallery/' for t in geometry['text'])
        assert any(t['text']=='扫码查看本专辑' and t['align']=='center' and t['x']==747 for t in geometry['text'])
        share_link=await page.locator('.share-link a').inner_text()
        assert 'id=' in share_link and len(share_link)<100,share_link
        short_id=share_link.rsplit('=',1)[1]
        await page.evaluate('''() => { window.__copied=''; navigator.clipboard.writeText=(s)=>{window.__copied=s;return Promise.resolve()}; }''')
        await page.get_by_role('button',name='复制链接').click()
        assert await page.evaluate('window.__copied')==share_link
        # Short link resolves, and so does the legacy long id (checked above).
        await page.goto(BASE+'work.html?id='+short_id,wait_until='networkidle')
        assert await page.locator('.detail-copy h1').inner_text()=='秋兴赋'
        await page.goto(BASE+'work.html?id=old-or-invalid',wait_until='networkidle')
        assert await page.get_by_role('link',name='返回作品展首页').get_attribute('href') == 'index.html'
        assert not errors,errors
        await browser.close()
    print('PASS: share card, QR, canonical URL, clipboard, Escape, mobile width, all pages')

asyncio.run(main())
