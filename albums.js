let albums = [];
let currentView = 'year';
let currentFilterYear = 'all';

const ERAS = {
1994:'黑梦',1995:'黑梦',1996:'黑梦',1997:'黑梦',1998:'黑梦',1999:'黑梦',
2000:'影视 OST',2001:'影视 OST',
2002:'暮良文王',2003:'暮良文王',
2004:'暮良文王 · 不一定',
2005:'暮良文王 · 不一定',2006:'不一定 · 不一样',
2007:'不一定 · 不一样',2008:'不一定 · 不一样',
2009:'不一定',
2010:'不一样',2011:'不一定',2012:'不一样',
2013:'不一定',2014:'不一样 · 天宫图',
2015:'不一样 · 天真君公',
2016:'不一样',2017:'不一样',2018:'不一定',
2019:'不一定 · 朝简',
2020:'不一定 · 朝简',
2021:'不一定 · 朝简',
2022:'不一定 · 朝简',
2023:'不一定 · 朝简',
2024:'不一定 · 朝简',
2025:'不一定 · 朝简',
2026:'不一定 · 朝简',
};

const GROUP_NOTES = {
 '窦唯': '个人名义作品与直接署名项目',
 '暮良文王': '阶段性乐队与实验编制',
 '不一定': '后期高频合作线索之一',
 '不一样': '合作项目脉络的另一主线',
 '朝简': '近年持续展开的合作项目',
 '译乐队': '译乐队相关公开作品',
 '东游记': '阶段性合作项目',
 'FM3': '跨项目合作署名',
 '天宫图': '特定主题合作条目'
};

function mediumLabel(value) {
 const mediumMap = {
 D: '数字',
 CD: 'CD',
 DVD: 'DVD',
 LP: '黑胶',
 DLT: '数字录音带',
 '磁带': '磁带'
 };
 return mediumMap[value] || value || '';
}

async function init() {
 try {
   const resp = await fetch('albums.json');
   albums = await resp.json();
   renderStats('all');
   renderFilters();
   renderYearView('all');
   renderGroupView('all');
   bindBackToTop();
 } catch(e) {
   console.error('init failed:', e);
 }
}

function escapeHTML(value) {
 return String(value ?? '')
 .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
 .replace(/>/g, '&gt;')
 .replace(/"/g, '&quot;')
 .replace(/'/g, '&#39;');
}

function getFilteredAlbums(filterYear = currentFilterYear) {
 return filterYear && filterYear !== 'all'
 ? albums.filter(a => String(a.year) === String(filterYear))
 : albums;
}

function getStats(albumsList = albums) {
 const years = albumsList.map(a => Number(a.year)).filter(Boolean).sort((a, b) => a - b);
 const media = [...new Set(albumsList.map(a => a.medium).filter(Boolean))];
 return {
 count: albumsList.length,
 minYear: years[0] || '',
 maxYear: years[years.length -1] || '',
 mediaCount: media.length
 };
}

function renderStats(filterYear = currentFilterYear) {
 const scoped = getFilteredAlbums(filterYear);
 const { count, minYear, maxYear, mediaCount } = getStats(scoped);
 const yearLabel = minYear && maxYear ? `${minYear} – ${maxYear}` : '—';
 const scopedLabel = filterYear === 'all' ? '年份 /组合双索引' : `${filterYear} 年作品`;
 document.getElementById('stats-bar').innerHTML = `
 <span class="stats-item"><span class="stats-label">时间跨度</span><span class="stats-value">${yearLabel}</span></span>
 <span class="stats-divider">·</span>
 <span class="stats-item"><span class="stats-label">收录作品</span><span class="stats-value">${count} 张</span></span>
 <span class="stats-divider">·</span>
 <span class="stats-item"><span class="stats-label">编排方式</span><span class="stats-value">${scopedLabel}</span></span>
 <span class="stats-divider">·</span>
 <span class="stats-item"><span class="stats-label">介质类型</span><span class="stats-value">${mediaCount} 种</span></span>
 `;
}

function eraLabel(y) { return ERAS[y] || ''; }

function groupOf(a) {
 const art = a.album_artist || '';
 if (art === '窦唯') return '窦唯';
 if (art.includes('暮良文王')) return '暮良文王';
 if (art.includes('不一定') && !art.includes('不一样')) return '不一定';
 if (art.includes('不一样')) return '不一样';
 if (art.includes('朝简')) return '朝简';
 if (art.includes('译乐队') || art === '译乐队') return '译乐队';
 if (art.includes('东游记')) return '东游记';
 if (art.includes('FM3')) return 'FM3';
 if (art.includes('天宫图')) return '天宫图';
 return null;
}

function coverHTML(album, eager = false) {
 if (album.cover) {
 const loading = eager ? 'eager' : 'lazy';
 return `<img src="covers/${album.cover}" alt="${escapeHTML(album.name)}" loading="${loading}" decoding="async" onerror="this.parentElement.innerHTML=placeholderHTML(${album.year||0}, ${JSON.stringify(album.name || '')});">`;
 }
 return placeholderHTML(album.year ||0, album.name);
}

function placeholderHTML(year, name) {
 return `<div class="cover-placeholder">
 <span class="yr">${year || ''}</span>
 ${name ? '<span style="margin-top:0.4rem;font-size:0.6rem;letter-spacing:0.08em">' + escapeHTML(name.slice(0,4)) + '</span>' : ''}
 </div>`;
}

function cardHTML(album, index =0) {
 const displayDate = album.date || (album.year ? String(album.year) : '');
 const project = album.album_artist || album.artist || '';
 const medium = album.medium ? mediumLabel(album.medium) : '';
 const payload = escapeHTML(JSON.stringify({
 name: album.name,
 artist: album.artist,
 album_artist: album.album_artist,
 date: album.date,
 year: album.year,
 medium: album.medium,
 description: album.description || '',
 cover: album.cover
 }));

 return `
 <div class="album-card" data-album='${payload}'>
 <div class="cover-wrap">
 ${coverHTML(album, index <8)}
 </div>
 <div class="card-text">
 <div class="card-name">${escapeHTML(album.name || '')}</div>
 <div class="card-meta">
 ${displayDate ? `<div class="card-date">${escapeHTML(displayDate)}</div>` : ''}
 ${project ? `<div class="card-artist">${escapeHTML(project)}</div>` : ''}
 ${medium ? `<span class="card-medium">${escapeHTML(medium)}</span>` : ''}
 </div>
 </div>
 </div>`;
}

function sortByDate(arr) {
 return [...arr].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function renderYearView(filterYear = currentFilterYear) {
 currentFilterYear = filterYear || 'all';
 renderStats(currentFilterYear);
 const filtered = getFilteredAlbums(currentFilterYear);
 const sorted = sortByDate(filtered);

 const byYear = {};
 for (const a of sorted) {
 const y = a.year ||0;
 if (!byYear[y]) byYear[y] = [];
 byYear[y].push(a);
 }

 const years = Object.keys(byYear).sort((a, b) => b - a);
 let html = '';

 for (const y of years) {
 const era = eraLabel(parseInt(y));
 html += `
 <div class="year-section">
 <div class="year-header">
 <span class="year-num">${y}</span>
 ${era ? `<span class="year-era">${escapeHTML(era)}</span>` : ''}
 <span class="year-count">${byYear[y].length} 张作品</span>
 </div>
 <div class="albums-grid">
 ${byYear[y].map((a, idx) => cardHTML(a, idx)).join('')}
 </div>
 </div>`;
 }

 document.getElementById('panel-year').innerHTML = html || '<p class="empty-state">无结果</p>';
}

function renderGroupView(filterYear = currentFilterYear) {
 currentFilterYear = filterYear || 'all';
 const filtered = getFilteredAlbums(currentFilterYear);
 const sorted = sortByDate(filtered);

 const groupOrder = ['窦唯','暮良文王','不一定','不一样','朝简','译乐队','东游记','FM3','天宫图'];
 const byGroup = {};
 for (const g of groupOrder) byGroup[g] = [];

 let others = [];
 for (const a of sorted) {
 const g = groupOf(a);
 if (g && byGroup.hasOwnProperty(g)) {
 byGroup[g].push(a);
 } else if (g) {
 byGroup[g] = [a];
 } else {
 others.push(a);
 }
 }

 let html = '';
 for (const g of groupOrder) {
 if (!byGroup[g].length) continue;
 html += `
 <div class="group-section">
 <div class="group-header">
 <div class="group-title-wrap">
 <div class="group-name">${escapeHTML(g)}</div>
 <div class="group-note">${escapeHTML(GROUP_NOTES[g] || '按项目线索归档')}</div>
 </div>
 <span class="group-count">${byGroup[g].length} 张作品</span>
 </div>
 <div class="albums-grid">
 ${byGroup[g].map((a, idx) => cardHTML(a, idx)).join('')}
 </div>
 </div>`;
 }

 const unmatchedGroups = {};
 for (const a of others) {
 const g = a.album_artist || '未知';
 if (!unmatchedGroups[g]) unmatchedGroups[g] = [];
 unmatchedGroups[g].push(a);
 }
 for (const [g, gas] of Object.entries(unmatchedGroups)) {
 if (groupOrder.includes(g)) continue;
 html += `
 <div class="group-section">
 <div class="group-header">
 <div class="group-title-wrap">
 <div class="group-name">${escapeHTML(g)}</div>
 <div class="group-note">未纳入主脉络分类的署名条目</div>
 </div>
 <span class="group-count">${gas.length} 张作品</span>
 </div>
 <div class="albums-grid">
 ${gas.map((a, idx) => cardHTML(a, idx)).join('')}
 </div>
 </div>`;
 }

 document.getElementById('panel-group').innerHTML = html || '<p class="empty-state">无结果</p>';
}

function renderFilters() {
 const years = [...new Set(albums.map(a => a.year).filter(Boolean))].sort((a,b) => b - a);
 const bar = document.getElementById('filter-bar');
 let tags = `<button class="filter-tag ${currentFilterYear === 'all' ? 'active' : ''}" data-year="all">全部</button>`;
 for (const y of years) {
 const active = String(currentFilterYear) === String(y) ? 'active' : '';
 tags += `<button class="filter-tag ${active}" data-year="${y}">${y}</button>`;
 }
 bar.innerHTML = `<span class="filter-label">Index</span><div class="filter-tags">${tags}</div>`;

 bar.querySelectorAll('.filter-tag').forEach(btn => {
 btn.addEventListener('click', () => {
 const year = btn.dataset.year || 'all';
 currentFilterYear = year;
 bar.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
 btn.classList.add('active');
 if (currentView === 'year') renderYearView(year);
 else {
 renderStats(year);
 renderGroupView(year);
 }
 });
 });
}

function formatDescription(desc) {
 const text = (desc || '').trim();
 if (!text) return '<p>（暂无介绍）</p>';
 return text
 .split(/\n\s*\n/)
 .map(block => block.trim())
 .filter(Boolean)
 .map(block => `<p>${escapeHTML(block).replace(/(制作人|录音\/混音\/制作执行|录音\/混音|录音地点|录音时间地点|录音时间|录音棚|制作时间地点|制作时间|制作地点|文学顾问|鸣谢)：/g, '<strong>$1：</strong>')}</p>`)
 .join('');
}

function openModal(album) {
 if (!album) return;

 const coverEl = document.getElementById('modal-cover');
 if (album.cover) {
 coverEl.innerHTML = `<img src="covers/${album.cover}" alt="${escapeHTML(album.name || '')}">`;
 } else {
 coverEl.innerHTML = placeholderHTML(album.year ||0, album.name);
 }

 document.getElementById('modal-name').textContent = album.name || '';

 const metaBits = [
 album.date ? escapeHTML(album.date) : '',
 album.album_artist ? escapeHTML(album.album_artist) : (album.artist ? escapeHTML(album.artist) : ''),
 album.medium ? escapeHTML(mediumLabel(album.medium)) : ''
 ].filter(Boolean);

 document.getElementById('modal-meta').innerHTML = `
 <div class="modal-meta-line">${metaBits.join('<span class="modal-meta-sep">·</span>')}</div>
 ${album.artist && album.album_artist && album.artist !== album.album_artist ? `<div class="modal-submeta">演奏 /参与：${escapeHTML(album.artist)}</div>` : ''}
 `;

 document.getElementById('modal-desc').innerHTML = formatDescription(album.description || '');

 document.getElementById('modal').classList.add('open');
 document.body.classList.add('modal-open');
}

function closeModal() {
 document.getElementById('modal').classList.remove('open');
 document.body.classList.remove('modal-open');
}

function bindBackToTop() {
 const btn = document.getElementById('back-to-top');
 if (!btn) return;
 const toggle = () => {
 btn.classList.toggle('visible', window.scrollY >480);
 };
 window.addEventListener('scroll', toggle, { passive: true });
 btn.addEventListener('click', () => {
 window.scrollTo({ top:0, behavior: 'smooth' });
 });
 toggle();
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
 if (e.target === document.getElementById('modal')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.addEventListener('click', e => {
 const card = e.target.closest('.album-card');
 if (!card) return;
 const raw = card.getAttribute('data-album');
 if (!raw) return;
 openModal(JSON.parse(raw));
});

document.querySelectorAll('.nav-tab').forEach(tab => {
 tab.addEventListener('click', () => {
 document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
 document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
 tab.classList.add('active');
 currentView = tab.dataset.view;
 document.getElementById(`panel-${currentView}`).classList.add('active');
 if (currentView === 'year') renderYearView(currentFilterYear);
 else {
 renderStats(currentFilterYear);
 renderGroupView(currentFilterYear);
 }
 });
});

window.albums = albums;
init();
