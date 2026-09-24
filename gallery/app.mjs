import {prepare, summary, selectWorks} from './data.mjs';
const main=document.querySelector('main');
const page=document.body.dataset.page;
let albums=[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=a=>'work.html?'+new URLSearchParams({id:a.id});
const medium=v=>({D:'数字发行',CD:'CD',LP:'黑胶',DVD:'DVD',DLT:'数字录音带','磁带':'磁带'}[v]||v||'未注明');
const date=a=>a.date.replaceAll('-','.');
const storage={get(k){try{return sessionStorage.getItem(k);}catch{return null;}},set(k,v){try{sessionStorage.setItem(k,v);}catch{/* Storage is optional. */}}};
function image(a,{eager=false,full=false,cls=''}={}) {
  const file=typeof a.cover==='string' && !/[\\/]/.test(a.cover) ? a.cover : '';
  if (!file) return `<span class="image-missing">${esc(a.name)}<small>封面尚未收录</small></span>`;
  const original='../covers/'+encodeURIComponent(file);
  return `<img class="${cls}" src="${full?original:'thumbs/'+encodeURIComponent(file)+'.webp'}" data-original="${esc(original)}" alt="《${esc(a.name)}》封面" loading="${eager?'eager':'lazy'}" ${eager?'fetchpriority="high"':''} decoding="async" width="640" height="640">`;
}
// A newly added work does not need a thumbnail to become visible.
document.addEventListener('error',e=>{
  const img=e.target;
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.original && img.getAttribute('src')!==img.dataset.original) {img.src=img.dataset.original;return;}
  const text=document.createElement('span');text.className='image-missing';text.textContent='封面暂未载入';img.replaceWith(text);
},true);
function card(a,i=0) {
  return `<a class="work-card" href="${esc(url(a))}" aria-label="查看《${esc(a.name)}》"><div class="cover-box">${image(a,{eager:i<4})}<span class="cover-enter" aria-hidden="true">查看作品 ↗</span></div><div class="card-caption"><h3>${esc(a.name)}</h3><span class="card-year">${date(a)}</span><p>${esc(a.group)}</p></div></a>`;
}
function home() {
  const s=summary(albums), latest=albums[0];
  if (!latest) {main.innerHTML='<div class="empty-state"><h1>作品展</h1><p>作品资料尚未收录。</p></div>';return;}
  const recent=albums.slice(1,5);
  const ascending=[...albums].reverse();
  const decades=[...new Set(ascending.map(a=>Math.floor(a.year/10)*10))];
  main.innerHTML=`
    <section class="home-hero section-wrap">
      <div class="hero-intro"><p class="eyebrow">非官方作品档案 <span> / </span> DOU WEI GALLERY</p><h1>窦唯<span>作品展</span></h1><p class="hero-note">沿着时间，看作品不断留下来。</p><a class="text-link hero-link" href="works.html?sort=asc">从最初的作品开始 <span>↗</span></a><div class="hero-meta"><span>${s.first} — ${s.last}</span><span>已收录 <b data-count>${s.count}</b> 部作品</span></div></div>
      <figure class="feature"><div class="feature-label"><span class="eyebrow">最新发行</span><span class="serial">${date(latest)}</span></div><a class="feature-link" href="${esc(url(latest))}"><div class="feature-cover">${image(latest,{eager:true})}</div><figcaption><div><h2 data-latest>${esc(latest.name)}</h2><p>${esc(latest.group)} · ${esc(latest.type||'作品')} · ${esc(medium(latest.medium))}</p></div><span class="feature-arrow" aria-hidden="true">↗</span></figcaption></a></figure>
    </section>
    <section class="recent section-wrap" aria-labelledby="recent-title"><div class="section-heading"><div><span class="eyebrow">01 / RECENT RELEASES</span><h2 id="recent-title">近作</h2></div><a class="text-link" href="works.html?sort=desc">查看全部作品 ↗</a></div><div class="recent-grid">${recent.map(card).join('')}</div></section>
    <section class="time-exhibit section-wrap" aria-labelledby="time-title"><div class="section-heading"><div><span class="eyebrow">02 / THROUGH THE YEARS</span><h2 id="time-title">时间里的作品</h2></div><p class="section-note">从一张，走向下一张。<br>按年代进入，不为作品排座次。</p></div><div class="decades">${decades.map(d=>{
      const items=ascending.filter(a=>a.year>=d&&a.year<d+10), a=items[0];
      return `<a class="decade" href="works.html?${new URLSearchParams({year:String(d)+'s',sort:'asc'})}"><div class="decade-head"><h3>${d}<small>s</small></h3><span>${items.length} 部作品 ↗</span></div><div class="decade-image">${image(a)}</div><p>${esc(a.name)} <span>${a.year}</span></p></a>`;
    }).join('')}</div><p class="small-note">年代入口以该年代最早收录的作品为封面；数量按当前档案统计。</p></section>
    <section class="about section-wrap" id="about"><div><span class="eyebrow">03 / ABOUT THIS GALLERY</span><h2>为曾经出现的作品，<br>留一个位置。</h2></div><div class="about-body"><p>这份整理始于一个朴素的念头：趁作品和资料还找得到，把它们认真记下来。不等许多年后，再从零散的线索里寻找。</p><p>这里展示封面、曲目与发行资料。它不是一部完整的音乐史，也不替作品作解释。资料足够的地方，记得细一些；尚未核实的地方，留白。</p><p class="about-boundary">非官方、非商业的作品展示。本站不提供音频、试听、下载或流媒体跳转。封面与原始作品介绍的权利归相应权利人；署名说明不替代授权。</p><p class="small-note">整理范围以现有收录为准，不宣称涵盖全部作品。资料出处仍在逐步核对。</p></div></section>`;
}
function works() {
  const s=summary(albums), params=new URLSearchParams(location.search);
  const state={q:params.get('q')||'',year:params.get('year')||'',group:params.get('group')||'',sort:params.get('sort')==='asc'?'asc':'desc',view:params.get('view')==='wall'?'wall':'gallery'};
  const years=[...new Set(albums.map(a=>String(a.year)))];
  const groups=[...new Set(albums.map(a=>a.group))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
  main.innerHTML=`<section class="collection-intro section-wrap"><div><p class="eyebrow">THE COLLECTION / ${s.first} — ${s.last}</p><h1>作品，沿时间展开。</h1></div><p><b data-count>${s.count}</b> 部已收录作品<br><span>每一张，都曾经出现。</span></p></section>
    <div class="tools-shell"><form class="tools section-wrap" role="search"><label class="search-field"><span>搜索作品 / 曲目</span><input type="search" name="q" placeholder="输入名称…" value="${esc(state.q)}" autocomplete="off"></label><label>发行年份<select name="year"><option value="">全部年份</option>${years.map(y=>`<option value="${y}" ${state.year===y?'selected':''}>${y}</option>`).join('')}</select></label><label>艺术家 / 组合<select name="group"><option value="">全部艺术家</option>${groups.map(g=>`<option value="${esc(g)}" ${state.group===g?'selected':''}>${esc(g)}</option>`).join('')}</select></label><label>排列<select name="sort"><option value="desc" ${state.sort==='desc'?'selected':''}>由近及远</option><option value="asc" ${state.sort==='asc'?'selected':''}>由远及近</option></select></label><div class="view-switch" role="group" aria-label="展示方式"><button type="button" data-view="gallery">画册</button><button type="button" data-view="wall">封面墙</button></div></form></div>
    <div class="results-bar section-wrap"><p id="result-count" role="status" aria-live="polite"></p><button type="button" class="reset" data-reset>清除筛选 ↺</button></div><div id="collection" class="section-wrap"></div>`;
  const form=main.querySelector('form');
  // Preserve unknown URL filters as explicit no-result scopes, not silently all works.
  for (const key of ['year','group']) {
    if (state[key] && ![...form.elements[key].options].some(o=>o.value===state[key])) {
      const option=new Option(state[key],state[key],true,true);form.elements[key].add(option);
    }
  }
  const render=()=>{
    const selected=selectWorks(albums,state), byYear=new Map();
    for(const a of selected) {if(!byYear.has(a.year))byYear.set(a.year,[]);byYear.get(a.year).push(a);}
    const holder=document.querySelector('#collection');holder.className='section-wrap '+(state.view==='wall'?'wall':'album-gallery');
    document.querySelector('#result-count').textContent=`正在展示 ${selected.length} / ${s.count} 部作品`;
    holder.innerHTML=selected.length?[...byYear].map(([year,items])=>`<section class="year-section" id="year-${year}"><div class="year-heading"><h2>${year}</h2><p>${items.length} 部作品</p><span class="year-line"></span></div><div class="works-grid">${items.map(card).join('')}</div></section>`).join(''):'<div class="empty-state"><h2>这里暂时没有作品。</h2><p>换一个关键词，或清除筛选重新浏览。</p></div>';
    main.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
    const query=new URLSearchParams();for(const [k,v]of Object.entries(state))if(v)query.set(k,v);
    history.replaceState(null,'','works.html?'+query);storage.set('dw-gallery-return',location.pathname+location.search);
  };
  form.addEventListener('submit',e=>e.preventDefault());
  form.addEventListener('input',e=>{if(e.target.name==='q'){state.q=e.target.value;render();}});
  form.addEventListener('change',e=>{if(e.target.name && e.target.name!=='q'){state[e.target.name]=e.target.value;render();}});
  main.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;render();}));
  main.querySelector('[data-reset]').addEventListener('click',()=>{Object.assign(state,{q:'',year:'',group:''});for(const k of ['q','year','group'])form.elements[k].value='';render();});
  main.addEventListener('click',e=>{if(e.target.closest('.work-card'))storage.set('dw-gallery-scroll',String(scrollY));});
  render();
  if(params.get('restore')==='1'){const y=Number(storage.get('dw-gallery-scroll')||0);requestAnimationFrame(()=>scrollTo(0,y));}
}
function detail() {
  const id=new URLSearchParams(location.search).get('id'), a=albums.find(a=>a.id===id);
  if(!a){main.innerHTML='<section class="empty-state"><p class="eyebrow">WORK NOT FOUND</p><h1>未找到这部作品</h1><p>地址可能不完整，或资料已经更正。</p><a class="text-link" href="works.html">返回全部作品 ↗</a></section>';return;}
  document.title=a.name+' · 窦唯作品展';
  const saved=storage.get('dw-gallery-return');
  let back='works.html';
  if(saved){const target=new URL(saved,location.href);if(target.origin===location.origin&&target.pathname===new URL('works.html',location.href).pathname){target.searchParams.set('restore','1');back=target.pathname+target.search;}}
  const i=albums.indexOf(a), earlier=albums[i+1], later=albums[i-1];
  main.innerHTML=`<div class="detail-nav section-wrap"><a class="text-link" data-back href="${esc(back)}">← 返回作品展</a><span class="serial">${a.year} / ${esc(a.group)}</span></div><article class="work-detail section-wrap"><div class="detail-art"><button class="detail-cover" type="button" aria-label="放大《${esc(a.name)}》封面">${image(a,{eager:true,full:true})}<span>查看完整封面 ↗</span></button><p class="art-note">原始封面 · 保留原貌</p></div><div class="detail-copy"><p class="eyebrow">${esc(a.type||'作品')} / ${date(a)}</p><h1>${esc(a.name)}</h1><p class="detail-artist">${esc(a.group)}</p><dl class="metadata"><div><dt>发行日期</dt><dd>${date(a)}</dd></div><div><dt>发行介质</dt><dd>${esc(medium(a.medium))}</dd></div>${a.artist&&a.artist!==a.group?`<div><dt>参与艺术家</dt><dd>${esc(a.artist)}</dd></div>`:''}</dl>
      ${a.tracks.length?`<section class="track-section"><div class="minor-heading"><h2>曲目</h2><span>${a.tracks.length} TRACK${a.tracks.length===1?'':'S'}</span></div><ol class="track-list">${a.tracks.map((t,n)=>`<li><span class="track-no">${esc(t.no??n+1).padStart(2,'0')}</span><span class="track-title">${esc(t.title||'未注明曲名')}</span><time>${esc(t.duration||'—')}</time></li>`).join('')}</ol></section>`:'<p class="small-note">曲目资料尚未收录。</p>'}
      ${a.description?.trim()?`<section class="credits"><div class="minor-heading"><h2>作品资料</h2><span>NOTES & CREDITS</span></div><div class="credits-text">${esc(a.description.trim())}</div></section>`:''}<p class="source-note">以上按现有作品档案整理。原始介绍的具体出处尚待逐条核对；未补写未经证实的创作故事。</p></div></article>
      <nav class="adjacent section-wrap" aria-label="相邻发行作品">${earlier?`<a href="${esc(url(earlier))}"><span>← 较早收录的发行</span><h2>${esc(earlier.name)}</h2><p>${date(earlier)}</p></a>`:'<div></div>'}${later?`<a href="${esc(url(later))}"><span>较晚收录的发行 →</span><h2>${esc(later.name)}</h2><p>${date(later)}</p></a>`:'<div></div>'}</nav>
      <dialog class="lightbox" aria-label="完整封面"><button class="lightbox-close" type="button" aria-label="关闭封面">关闭 ×</button>${image(a,{full:true})}<p>${esc(a.name)}</p></dialog>`;
  const dialog=main.querySelector('dialog');
  main.querySelector('.detail-cover').addEventListener('click',()=>{dialog.showModal();document.body.classList.add('lightbox-open');});
  main.querySelector('.lightbox-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>document.body.classList.remove('lightbox-open'));
}
async function init() {
  try {
    const response=await fetch('../albums.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    albums=prepare(await response.json());
    if(page==='home')home();else if(page==='works')works();else detail();
    if(location.hash==='#about')document.getElementById('about')?.scrollIntoView();
  } catch(error) {
    console.warn('[Gallery] '+error.message);
    main.innerHTML='<section class="empty-state"><p class="eyebrow">ARCHIVE UNAVAILABLE</p><h1>资料暂时未能载入</h1><p>没有用旧数字或占位作品替代。请检查网络后重试。</p><button type="button" class="retry" data-retry>重新载入</button></section>';
    main.querySelector('[data-retry]').addEventListener('click',init);
  }
}
init();
