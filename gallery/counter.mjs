// A shared project key aggregates all Gallery pages, not other GitHub Pages projects.
// Only the badge image is loaded: no third-party JavaScript or tracking SDK.
const enabled=location.hostname==='imartinw29.github.io' && location.pathname.startsWith('/DouWei_Albums_Library/gallery/');
const footer=document.querySelector('.site-footer p');
if(enabled && footer){
  const counter=document.createElement('span');
  counter.className='visit-counter';counter.hidden=true;
  counter.title='累计页面访问次数（非独立访客）；由 Hits 提供，可能包含重复访问及自动请求。';
  const image=document.createElement('img');
  image.alt='累计访问次数';image.height=20;image.referrerPolicy='no-referrer';
  image.decoding='async';
  counter.append(image);footer.append(counter);
  const timer=setTimeout(()=>{image.onload=null;image.onerror=null;image.removeAttribute('src');counter.remove();},8000);
  image.onload=()=>{clearTimeout(timer);counter.hidden=false;};
  image.onerror=()=>{clearTimeout(timer);counter.remove();};
  image.src='https://hits.sh/imartinw29.github.io/DouWei_Albums_Library.svg?style=flat-square&label='+encodeURIComponent('累计访问')+'&color=242620&labelColor=111210';
}
