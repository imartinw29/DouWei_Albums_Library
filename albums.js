let albums = [];
let currentView = 'year';
let currentFilterYear = 'all';
let currentFilterGroup = 'all';

async function init() {
  try {
    const resp = await fetch('albums.json');
    if (!resp.ok) throw new Error('failed to load albums.json: ' + resp.status);
    albums = await resp.json();
    renderStats();
    renderFilters();
    renderYearView();
    renderTimelineView();
    renderGroupView();
    bindBackToTop();
    bindDrawer();
  } catch(e) {
    console.error('[init] error:', e);
    document.getElementById('panel-year').innerHTML =
      '<p style="color:#888;padding:2rem">数据加载失败，请刷新页面重试。</p>';
  }
}

// 按当年实际专辑算出出现了哪些组合（去重、按固定顺序排列）
const GROUP_ORDER = ['窦唯','暮良文王','不一定','不一样','朝简','译乐队','东游记','FM3','天宫图'];

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

function mediumLabel(v) {
  const m = { D: '数字', CD: 'CD', DVD: 'DVD', LP: '黑胶', DLT: '数字录音带', '磁带': '磁带' };
  return m[v] || v || '';
}

function escapeHTML(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function coverHTML(album) {
  if (album.cover) {
    return `<img src="covers/${album.cover}" alt="${escapeHTML(album.name)}" loading="lazy" decoding="async"
             onerror="this.parentElement.innerHTML=placeholderHTML(${album.year||0},'${escapeHTML(album.name)}');">`;
  }
  return placeholderHTML(album.year || 0, album.name);
}

function placeholderHTML(year, name) {
  return `<div class="cover-placeholder">
    <span class="yr">${year || ''}</span>
    ${name ? '<span style="margin-top:0.4rem;font-size:0.6rem;letter-spacing:0.08em">' + escapeHTML(name.slice(0,4)) + '</span>' : ''}
  </div>`;
}

function cardHTML(album) {
  const dateStr = album.date || '';
  const payload = JSON.stringify({
    name: album.name,
    artist: album.artist,
    album_artist: album.album_artist,
    date: album.date,
    year: album.year,
    medium: album.medium,
    description: album.description || '',
    cover: album.cover,
    rating: album.rating,
    tracks: album.tracks || []
  });
  const artist = album.album_artist || album.artist || '';
  const hasArtist = artist && artist !== album.name;
  return `
  <div class="album-card" data-album="${escapeHTML(payload)}">
    <div class="cover-wrap">
      ${coverHTML(album)}
    </div>
    <div class="card-text">
      <div class="card-name">${escapeHTML(album.name)}</div>
      <div class="card-meta">
        <span class="card-date">${escapeHTML(dateStr)}</span>
        ${hasArtist ? `<span class="card-dot"></span><span class="card-artist">${escapeHTML(artist)}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function sortByDate(arr) {
  return [...arr].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function renderStats() {
  const filtered = applyFilters(albums);
  const years = filtered.map(a => Number(a.year)).filter(Boolean).sort((a, b) => a - b);
  const media = [...new Set(filtered.map(a => a.medium).filter(Boolean))];
  const minY = years[0] || '';
  const maxY = years[years.length - 1] || '';
  const yearLabel = minY && maxY ? `${minY}—${maxY}` : '—';

  let scopeParts = [];
  if (currentFilterYear !== 'all') scopeParts.push(currentFilterYear);
  if (currentFilterGroup !== 'all') scopeParts.push(currentFilterGroup);

  const scopeLabel = scopeParts.length
    ? scopeParts.join(' · ') + ' 作品'
    : '年份 / 组合双索引';

  document.getElementById('stats-bar').innerHTML = `
    <span class="stats-item"><span class="stats-label">时间跨度</span><span class="stats-value">${yearLabel}</span></span>
    <span class="stats-divider">·</span>
    <span class="stats-item"><span class="stats-label">收录作品</span><span class="stats-value">${filtered.length} 张</span></span>
    <span class="stats-divider">·</span>
    <span class="stats-item"><span class="stats-label">当前筛选</span><span class="stats-value">${scopeLabel}</span></span>
    <span class="stats-divider">·</span>
    <span class="stats-item"><span class="stats-label">介质类型</span><span class="stats-value">${media.length} 种</span></span>`;
}

function renderYearView() {
  renderStats();
  const filtered = applyFilters(albums);
  const sorted = sortByDate(filtered);

  const byYear = {};
  for (const a of sorted) {
    const y = a.year || 0;
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(a);
  }

  const years = Object.keys(byYear).sort((a, b) => b - a);
  let html = '';

  for (const y of years) {
    // 从该年份筛选后的专辑中计算实际组合（而非全局）
    const yearGroups = new Set();
    for (const a of byYear[y]) {
      const g = groupOf(a);
      if (g) yearGroups.add(g);
    }
    const era = GROUP_ORDER.filter(g => yearGroups.has(g)).join(' · ');
    html += `
    <div class="year-section">
      <div class="year-header">
        <span class="year-num">${y}</span>
        ${era ? `<span class="year-era">${escapeHTML(era)}</span>` : ''}
        <span class="year-count">${byYear[y].length} 张作品</span>
      </div>
      <div class="albums-grid">
        ${byYear[y].map(a => cardHTML(a)).join('')}
      </div>
    </div>`;
  }

  document.getElementById('panel-year').innerHTML = html || '<p style="color:var(--text-dim);padding:2rem">无结果</p>';
}

function renderGroupView() {
  const filtered = applyFilters(albums);
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
        <span class="group-name">${escapeHTML(g)}</span>
        <span class="group-count">${byGroup[g].length} 张</span>
      </div>
      <div class="albums-grid">
        ${byGroup[g].map(a => cardHTML(a)).join('')}
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
        <span class="group-name">${escapeHTML(g)}</span>
        <span class="group-count">${gas.length} 张</span>
      </div>
      <div class="albums-grid">
        ${gas.map(a => cardHTML(a)).join('')}
      </div>
    </div>`;
  }

  document.getElementById('panel-group').innerHTML = html || '<p style="color:var(--text-dim);padding:2rem">无结果</p>';
}

function renderTimelineView() {
  const filtered = applyFilters(albums);
  const byYear = {};
  for (const a of filtered) {
    const y = a.year || 0;
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(a);
  }
  const years = Object.keys(byYear).sort((a, b) => a - b); // 旧 → 新，顺着创作轨迹走
  let html = '';
  for (const y of years) {
    html += `
    <section class="timeline-section">
      <div class="timeline-year">${y}<span class="timeline-count">${byYear[y].length} 张</span></div>
      <div class="timeline-flow">
        ${byYear[y].map(a => timelineItemHTML(a)).join('')}
      </div>
    </section>`;
  }
  document.getElementById('panel-timeline').innerHTML = html || '<p style="color:var(--text-dim);padding:2rem">无结果</p>';
}

function timelineItemHTML(album) {
  const dateStr = album.date || '';
  const payload = JSON.stringify({
    name: album.name,
    artist: album.artist,
    album_artist: album.album_artist,
    date: album.date,
    year: album.year,
    medium: album.medium,
    description: album.description || '',
    cover: album.cover,
    rating: album.rating,
    tracks: album.tracks || []
  });
  const artist = album.album_artist || album.artist || '';
  const hasArtist = artist && artist !== album.name;
  return `
  <div class="timeline-item" data-album="${escapeHTML(payload)}">
    <div class="cover-wrap">${coverHTML(album)}</div>
    <div class="tl-name">${escapeHTML(album.name)}${hasArtist ? '<span style="color:var(--text-dim)"> · ' + escapeHTML(artist) + '</span>' : ''}</div>
    <div class="tl-date">${escapeHTML(dateStr)}</div>
  </div>`;
}

function renderFilters() {
  // ── 年份标签 ──
  const years = [...new Set(albums.map(a => a.year).filter(Boolean))].sort((a, b) => b - a);
  const yearTagsEl = document.getElementById('filter-year-tags');
  let yhtml = `<button class="filter-tag ${currentFilterYear === 'all' ? 'active' : ''}" data-year="all">全部</button>`;
  for (const y of years) {
    yhtml += `<button class="filter-tag ${currentFilterYear === String(y) ? 'active' : ''}" data-year="${y}">${y}</button>`;
  }
  yearTagsEl.innerHTML = yhtml;

  // ── 组合标签 ──
  const allGroups = albums.map(a => groupOf(a)).filter(Boolean);
  const groups = [...new Set(allGroups)];
  const sorted = GROUP_ORDER.filter(g => groups.includes(g));
  const hasOthers = albums.some(a => !groupOf(a));
  const groupTagsEl = document.getElementById('filter-group-tags');
  let ghtml = `<button class="filter-tag ${currentFilterGroup === 'all' ? 'active' : ''}" data-group="all">全部</button>`;
  for (const g of sorted) {
    ghtml += `<button class="filter-tag ${currentFilterGroup === g ? 'active' : ''}" data-group="${g}">${g}</button>`;
  }
  if (hasOthers) {
    ghtml += `<button class="filter-tag ${currentFilterGroup === '其他' ? 'active' : ''}" data-group="其他">其他</button>`;
  }
  groupTagsEl.innerHTML = ghtml;

  // ── 年份点击 ──
  yearTagsEl.querySelectorAll('.filter-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilterYear = btn.dataset.year;
      renderFilters();
      if (currentView === 'year') renderYearView();
      else renderGroupView();
    });
  });

  // ── 组合点击 ──
  groupTagsEl.querySelectorAll('.filter-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilterGroup = btn.dataset.group;
      renderFilters();
      if (currentView === 'year') renderYearView();
      else renderGroupView();
    });
  });
}

function applyFilters(arr) {
  let filtered = arr;
  if (currentFilterYear !== 'all') {
    filtered = filtered.filter(a => String(a.year) === String(currentFilterYear));
  }
  if (currentFilterGroup !== 'all') {
    if (currentFilterGroup === '其他') {
      filtered = filtered.filter(a => !groupOf(a));
    } else {
      filtered = filtered.filter(a => groupOf(a) === currentFilterGroup);
    }
  }
  return filtered;
}

// Build star rating HTML: ★ full, ☆ half, ○ empty
function renderStars(rating) {
  if (rating == null || rating === 0) return '';
  const num = parseFloat(rating);
  if (isNaN(num)) return '';
  let html = '<span class="modal-rating">';
  for (let i = 1; i <= 5; i++) {
    if (num >= i) {
      html += '<span class="star full">★</span>';
    } else if (num >= i - 0.5) {
      html += '<span class="star half">★</span>';
    } else {
      html += '<span class="star empty">☆</span>';
    }
  }
  html += `<span class="rating-num">${num.toFixed(1)}</span></span>`;
  return html;
}

function openModal(album) {
  if (!album) return;

  const coverEl = document.getElementById('modal-cover');
  if (album.cover) {
    coverEl.innerHTML = `<img src="covers/${album.cover}" alt="${escapeHTML(album.name)}">`;
  } else {
    coverEl.innerHTML = placeholderHTML(album.year || 0, album.name);
  }

  const nameEl = document.getElementById('modal-name');
  const ratingHTML = renderStars(album.rating);
  nameEl.innerHTML = escapeHTML(album.name || '') + ratingHTML;

  // New reading-style meta: date · artist · medium
  const parts = [
    album.date ? escapeHTML(album.date) : '',
    (album.album_artist || album.artist) ? escapeHTML(album.album_artist || album.artist) : '',
    album.medium ? escapeHTML(mediumLabel(album.medium)) : ''
  ].filter(Boolean);

  const artist = album.album_artist || '';
  const player = album.artist && album.artist !== album.album_artist ? album.artist : '';
  let metaHTML = '';
  if (parts.length) {
    metaHTML = parts.join('<span class="modal-meta-sep"> · </span>');
  }
  if (player) {
    metaHTML += `<div class="modal-submeta">演奏 / 参与：${escapeHTML(player)}</div>`;
  }
  document.getElementById('modal-meta').innerHTML = metaHTML;

  const desc = (album.description || '').trim();
  document.getElementById('modal-desc').textContent = desc || '（暂无介绍）';

  // Tracks panel
  const tracksPanel = document.getElementById('modal-tracks-panel');
  const tracksList = document.getElementById('modal-tracks-list');
  if (album.tracks && album.tracks.length > 0) {
    tracksPanel.style.display = 'flex';
    tracksList.innerHTML = album.tracks.map(t => `
      <div class="modal-track-item">
        <span class="modal-track-no">${String(t.no || '').padStart(2, '0')}.</span>
        <span class="modal-track-title">${escapeHTML(t.title || '')}</span>
        ${t.duration ? `<span class="modal-track-duration">${escapeHTML(t.duration)}</span>` : ''}
      </div>
    `).join('');
  } else {
    tracksPanel.style.display = 'none';
  }

  document.getElementById('modal').classList.add('open');
  document.body.classList.add('modal-open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.classList.remove('modal-open');
}

function bindDrawer() {
  const tab = document.getElementById('drawer-tab');
  const drawer = document.getElementById('filter-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const closeBtn = document.getElementById('drawer-close');
  if (!tab || !drawer || !overlay) return;

  tab.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    drawer.classList.toggle('open', !isOpen);
    overlay.classList.toggle('show', !isOpen);
  });
  overlay.addEventListener('click', () => {
    drawer.classList.remove('open');
    overlay.classList.remove('show');
  });
  closeBtn.addEventListener('click', () => {
    drawer.classList.remove('open');
    overlay.classList.remove('show');
  });
}

function bindBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  const toggle = () => {
    btn.classList.toggle('visible', window.scrollY > 480);
  };
  window.addEventListener('scroll', toggle, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  toggle();
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Delegate card clicks via data-album attribute
document.addEventListener('click', e => {
  const card = e.target.closest('.album-card, .timeline-item');
  if (!card) return;
  const raw = card.getAttribute('data-album');
  if (!raw) return;
  try {
    openModal(JSON.parse(raw));
  } catch(err) {
    console.error('[card click] parse error:', err);
  }
});

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    currentView = tab.dataset.view;
    document.getElementById(`panel-${currentView}`).classList.add('active');
    if (currentView === 'year') renderYearView();
    else if (currentView === 'timeline') renderTimelineView();
    else renderGroupView();
  });
});

window.albums = albums;
init();
