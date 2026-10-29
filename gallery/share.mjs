import qrcode from './vendor/qrcode.mjs';
// One evergreen site card; album cards use only the public work data.
const SITE='https://imartinw29.github.io/DouWei_Albums_Library/gallery/';
const nav=document.querySelector('.site-header nav');
const trigger=document.createElement('button');
trigger.type='button';trigger.dataset.shareOpen='';trigger.textContent='分享本站';
nav.append(trigger);

const dialog=document.createElement('dialog');
dialog.className='share-dialog';
dialog.setAttribute('aria-label','分享窦唯作品展');
dialog.innerHTML=`<div class="share-shell"><div class="share-head"><div><span class="eyebrow">SHARE THIS GALLERY</span><h2>把作品展，交给下一位听众。</h2></div><button type="button" class="share-close" aria-label="关闭分享">关闭 ×</button></div>
  <img class="share-card-image" alt="窦唯作品展网站名片，含可扫码访问的二维码" width="900" height="1200">
  <p class="share-help">手机长按图片保存，再发给微信好友；也可复制图片后粘贴（取决于浏览器和微信支持）。</p>
  <div class="share-actions"><button type="button" data-copy-link>复制链接</button><button type="button" data-copy-image>复制图片</button><a class="share-download" download="窦唯作品展-分享名片.png">保存名片 PNG</a></div>
  <div class="share-link"><img class="share-qr" src="share-qr.png" alt="窦唯作品展入口二维码" width="70" height="70"><a href="${SITE}" target="_blank" rel="noopener noreferrer">${SITE}</a></div>
  <p class="share-status" role="status" aria-live="polite"></p></div>`;
document.body.append(dialog);
const card=dialog.querySelector('.share-card-image');
const download=dialog.querySelector('.share-download');
const status=dialog.querySelector('.share-status');
let png=null;
let objectUrl=null;
let current={url:SITE,album:null};
function message(text){status.textContent=text;}
function loadImage(source){return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('QR unavailable'));img.src=source;
});}
function albumUrl(album){return new URL('work.html?'+new URLSearchParams({id:album.short||album.id}),SITE).href;}
function drawQr(url,size,level='H',border=4){
  const qr=qrcode(0,level);qr.addData(url);qr.make();
  const count=qr.getModuleCount(),total=count+2*border;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,size,size);ctx.fillStyle='#18211d';
  for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x)){
    const left=Math.round((x+border)*size/total),top=Math.round((y+border)*size/total);
    ctx.fillRect(left,top,Math.round((x+border+1)*size/total)-left,Math.round((y+border+1)*size/total)-top);
  }
  return canvas;
}
async function makeAlbumCard(ctx,album){
  const qr=drawQr(current.url,200,'L',4);
  ctx.fillStyle='#e9e6de';ctx.font='36px "DW Gallery Serif", "Noto Serif CJK SC", serif';ctx.fillText('山水有声，岁月无言',102,225,380);
  ctx.fillStyle='#b4b5ad';ctx.font='18px sans-serif';ctx.fillText('——收录窦唯自1994年以来的作品',103,281,380);
  ctx.drawImage(qr,647,53,200,200);
  ctx.fillStyle='#b4b5ad';ctx.textAlign='center';ctx.font='19px sans-serif';ctx.fillText('扫码查看本专辑',747,288);
  ctx.textAlign='left';
  ctx.fillStyle='#252722';ctx.fillRect(180,420,540,540);
  const file=typeof album.cover==='string'&&!/[\\/]/.test(album.cover)?album.cover:'';
  if(file){
    try{
      const cover=await loadImage(new URL('../covers/'+encodeURIComponent(file),import.meta.url).href);
      const scale=Math.min(540/cover.width,540/cover.height),w=cover.width*scale,h=cover.height*scale;
      ctx.drawImage(cover,180+(540-w)/2,420+(540-h)/2,w,h);
    }catch{ctx.fillStyle='#b4b5ad';ctx.font='32px serif';ctx.textAlign='center';ctx.fillText('封面暂未载入',450,670);ctx.textAlign='left';}
  }
  ctx.textAlign='center';ctx.fillStyle='#e9e6de';ctx.font='37px "DW Gallery Serif", "Noto Serif CJK SC", serif';ctx.fillText('《'+album.name+'》',450,1019,696);
  ctx.fillStyle='#b4b5ad';ctx.font='21px sans-serif';ctx.fillText(album.date.replaceAll('-','.')+'  /  '+album.group,450,1058,696);
  ctx.textAlign='left';ctx.font='19px sans-serif';ctx.fillText('imartinw29.github.io/DouWei_Albums_Library/gallery/',103,1102,696);
  ctx.font='17px sans-serif';ctx.fillText('非官方整理 · 不提供音频或下载',103,1131,696);
  return qr;
}
async function makeCard(){
  await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas unavailable');
  ctx.fillStyle='#111210';ctx.fillRect(0,0,900,1200);
  ctx.strokeStyle='#55584e';ctx.lineWidth=2;
  ctx.strokeRect(52,52,796,1096);
  ctx.fillStyle='#aeb1a4';ctx.font='25px Georgia, serif';ctx.fillText('DOU WEI  /  WORKS',102,142);
  if(current.album){
    const qr=await makeAlbumCard(ctx,current.album);
    return {blob:await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG unavailable')),'image/png')),qr:qr.toDataURL('image/png')};
  }
  const qr=await loadImage(new URL('share-qr.png',import.meta.url).href);
  ctx.fillStyle='#e9e6de';ctx.font='55px "DW Gallery Serif", "Noto Serif CJK SC", serif';
  ctx.fillText('山水有声，岁月无言',102,300,696);
  ctx.fillStyle='#b4b5ad';ctx.font='28px sans-serif';
  ctx.fillText('——收录窦唯自1994年以来的作品',103,385,696);
  ctx.fillStyle='#292c27';ctx.fillRect(102,465,696,1);
  ctx.fillStyle='#fffdf8';ctx.fillRect(244,528,412,412);
  ctx.drawImage(qr,252,536,396,396);
  ctx.fillStyle='#e9e6de';ctx.textAlign='center';ctx.font='26px sans-serif';ctx.fillText('扫码进入作品展',450,946);
  ctx.fillStyle='#b4b5ad';ctx.font='20px sans-serif';ctx.fillText('imartinw29.github.io',450,1005);
  ctx.fillText('/DouWei_Albums_Library/gallery/',450,1040);
  ctx.font='17px sans-serif';ctx.fillText('非官方作品资料整理 · 不提供音频或下载',450,1110);
  return {blob:await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG unavailable')),'image/png')),qr:new URL('share-qr.png',import.meta.url).href};
}
async function openShare(album=null){
  current={url:album?albumUrl(album):SITE,album};
  dialog.querySelector('.share-head h2').textContent=album?'分享《'+album.name+'》':'把作品展，交给下一位听众。';
  dialog.querySelector('.share-link a').href=current.url;
  dialog.querySelector('.share-link a').textContent=current.url;
  download.download=album?album.name.replace(/[\\/:*?"<>|]/g,'_')+'-窦唯作品展.png':'窦唯作品展-分享名片.png';
  png=null;card.removeAttribute('src');download.removeAttribute('href');
  message('正在生成名片…');dialog.showModal();
  try{
    const result=await makeCard();png=result.blob;
    if(objectUrl)URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(png);card.src=objectUrl;download.href=objectUrl;
    dialog.querySelector('.share-qr').src=result.qr;
    message('名片已生成。');
  }catch(error){png=null;card.removeAttribute('src');download.removeAttribute('href');message('名片生成失败，请使用下方链接或二维码。');console.warn('[Share]',error);}
}
document.addEventListener('click',event=>{if(event.target.closest('[data-share-open]'))openShare();});
document.addEventListener('gallery:share-album',event=>openShare(event.detail));
dialog.querySelector('.share-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog.querySelector('[data-copy-link]').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(current.url);message('链接已复制。');}
  catch{message('浏览器不允许复制，请长按下方链接复制。');}
});
dialog.querySelector('[data-copy-image]').addEventListener('click',async()=>{
  if(!png){message('图片尚未生成，请用下方链接或二维码。');return;}
  try{
    if(!navigator.clipboard?.write || !window.ClipboardItem)throw new Error('Image clipboard unsupported');
    await navigator.clipboard.write([new ClipboardItem({'image/png':png})]);
    message('图片已复制；若微信不支持粘贴，请保存名片后发送。');
  }catch{message('当前浏览器不支持复制图片，请长按图片保存或点击「保存名片 PNG」。');}
});
