export function prepare(raw) {
  if (!Array.isArray(raw)) throw new Error('作品数据格式不正确');
  const ids = new Set();
  return raw.map(a => {
    if (!a || typeof a.name !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.date || '') || Number.isNaN(Date.parse(a.date)) || new Date(a.date).toISOString().slice(0,10) !== a.date) throw new Error('存在名称或发行日期不完整的作品');
    const id = [a.date,a.name,a.album_artist || a.artist || ''].join('|');
    if (ids.has(id)) throw new Error('存在重复作品：' + a.name);
    ids.add(id);
    return {...a, id, year:Number(a.date.slice(0,4)), group:a.album_artist || a.artist || '未注明', tracks:Array.isArray(a.tracks) ? a.tracks : []};
  }).sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id,'zh-CN'));
}
export function selectWorks(data, {q='', year='', group='', sort='desc'} = {}) {
  const query = q.trim().toLocaleLowerCase();
  const decade = /^\d{3}0s$/.test(year) ? Number(year.slice(0,4)) : null;
  return data.filter(a => (!year || (decade !== null ? a.year >= decade && a.year < decade + 10 : String(a.year) === year)) && (!group || a.group === group) && (!query || [a.name,a.artist,a.group,...a.tracks.map(t=>t.title)].join(' ').toLocaleLowerCase().includes(query)))
    .sort((a,b) => (sort === 'asc' ? 1 : -1) * (a.date.localeCompare(b.date) || a.id.localeCompare(b.id,'zh-CN')));
}
export function summary(data) {
  const years = data.map(a=>a.year);
  return {count:data.length, first:years.length ? Math.min(...years) : null, last:years.length ? Math.max(...years) : null};
}
