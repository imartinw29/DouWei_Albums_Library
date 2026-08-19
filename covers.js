// Cover Wall — 窦唯作品封面墙
let albums = [];

async function init() {
  try {
    const resp = await fetch('albums.json');
    if (!resp.ok) throw new Error('failed: ' + resp.status);
    albums = await resp.json();
    renderWall();
    bindEvents();
  } catch (e) {
    console.error('[coverwall]', e);
    document.getElementById('cover-wall').innerHTML =
      '<p style="color:#888;padding:2rem">数据加载失败，请刷新重试。</p>';
  }
}

function escapeHTML(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderWall() {
  const wall = document.getElementById('cover-wall');
  // 按 date 降序（最新在前），跟专辑档案一致
  const sorted = [...albums].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  wall.innerHTML = sorted.map(a => {
    const payload = JSON.stringify({
      name: a.name, artist: a.artist, album_artist: a.album_artist,
      date: a.date, year: a.year, medium: a.medium,
      description: a.description || '', cover: a.cover
    });
    const cap = `
      <div class="wall-cap">
        <span class="wall-name">${escapeHTML(a.name)}</span>
        <span class="wall-year">${a.year || ''}</span>
      </div>`;
    if (a.cover) {
      return `<div class="wall-item" data-album="${escapeHTML(payload)}">
        <img src="covers/${escapeHTML(a.cover)}" alt="${escapeHTML(a.name)}" decoding="async">${cap}</div>`;
    }
    return `<div class="wall-item" data-album="${escapeHTML(payload)}">
      <div style="aspect-ratio:1;background:#151515;display:flex;align-items:center;justify-content:center;color:#555;font-size:0.7rem">${escapeHTML(a.year || '')}</div>${cap}</div>`;
  }).join('');
  document.getElementById('wall-count').textContent = sorted.length + ' 张封面';
}

function bindEvents() {
  // 点击封面 → Modal
  document.addEventListener('click', e => {
    const item = e.target.closest('.wall-item');
    if (!item) return;
    const raw = item.getAttribute('data-album');
    if (!raw) return;
    try { openModal(JSON.parse(raw)); } catch (err) { console.error('[wall click]', err); }
  });
  // Modal 关闭
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function mediumLabel(v) {
  const map = { D: '数字', CD: 'CD', LP: '黑胶', 磁带: '磁带', DVD: 'DVD', DLT: '数字录音带' };
  return map[v] || v || '';
}

function openModal(album) {
  const coverEl = document.getElementById('modal-cover');
  if (album.cover) {
    coverEl.innerHTML = `<img src="covers/${escapeHTML(album.cover)}" alt="${escapeHTML(album.name)}">`;
  } else {
    coverEl.innerHTML = `<div style="width:100%;height:100%;background:#151515;display:flex;align-items:center;justify-content:center;color:#555">${album.year || ''}</div>`;
  }
  document.getElementById('modal-name').textContent = album.name || '';
  const parts = [
    album.date ? escapeHTML(album.date) : '',
    (album.album_artist || album.artist) ? escapeHTML(album.album_artist || album.artist) : '',
    album.medium ? escapeHTML(mediumLabel(album.medium)) : ''
  ].filter(Boolean);
  const artist = album.album_artist || '';
  const player = album.artist && album.artist !== album.album_artist ? album.artist : '';
  let meta = parts.join('<span class="modal-meta-sep"> · </span>');
  if (player) meta += `<div class="modal-submeta">演奏 / 参与：${escapeHTML(player)}</div>`;
  document.getElementById('modal-meta').innerHTML = meta;
  const desc = (album.description || '').trim();
  document.getElementById('modal-desc').textContent = desc || '（暂无介绍）';
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

init();
