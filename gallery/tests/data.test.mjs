import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const moduleUrl = new URL('../data.mjs', import.meta.url);
test('shared data module exists and sorts releases rather than array order', async () => {
  assert.ok(existsSync(moduleUrl), 'Gallery data module has not been implemented');
  const { prepare, summary } = await import(moduleUrl);
  const data = prepare([{name:'旧作',date:'1994-10-06',album_artist:'窦唯'}, {name:'新作',date:'2026-09-09',album_artist:'窦唯'}]);
  assert.equal(data[0].name, '新作');
  assert.deepEqual(summary(data), {count:2, first:1994, last:2026});
  assert.equal(prepare([...data].reverse())[0].id, data[0].id);
});
test('search intersects year and artist and searches track names', async () => {
  const { prepare, selectWorks } = await import(moduleUrl);
  assert.equal(typeof selectWorks, 'function');
  const data = prepare([
    {name:'甲',date:'2026-02-01',album_artist:'朝简',tracks:[{title:'秋声赋'}]},
    {name:'乙',date:'2025-02-01',album_artist:'窦唯'},
    {name:'丙',date:'2026-03-01',album_artist:'窦唯'}
  ]);
  assert.deepEqual(selectWorks(data,{q:'秋声',year:'2026',group:'朝简'}).map(a=>a.name),['甲']);
  assert.equal(selectWorks(data,{q:'秋声',group:'窦唯'}).length,0);
  assert.deepEqual(selectWorks(data,{sort:'asc'}).map(a=>a.name),['乙','甲','丙']);
});
test('decade scope includes every year in that decade', async () => {
  const { prepare, selectWorks }=await import(moduleUrl);
  const data=prepare([{name:'甲',date:'1999-01-01'},{name:'乙',date:'2000-01-01'},{name:'丙',date:'2009-01-01'},{name:'丁',date:'2010-01-01'}]);
  assert.deepEqual(selectWorks(data,{year:'2000s',sort:'asc'}).map(a=>a.name),['乙','丙']);
});
test('bad dates and duplicate works do not silently corrupt the catalogue', async () => {
  const { prepare, summary } = await import(moduleUrl);
  assert.throws(()=>prepare([{name:'甲',date:'2026-02-30'}]));
  const a={name:'甲',date:'2026-02-01'};
  assert.throws(()=>prepare([a,a]));
  assert.deepEqual(summary(prepare([])),{count:0,first:null,last:null});
});
test('every work carries a stable unique short id for share links', async () => {
  const { prepare, shortId } = await import(moduleUrl);
  const raw = [
    {name:'甲',date:'2026-02-01',album_artist:'朝简'},
    {name:'乙',date:'2025-02-01',album_artist:'窦唯'},
    {name:'东游记(现场版)',date:'2007-02-01',album_artist:'窦唯; 宁英杰; 巫娜; 张荐; 文智勇'}
  ];
  const data = prepare(raw);
  const shorts = data.map(a=>a.short);
  assert.equal(new Set(shorts).size, shorts.length, 'short ids must be unique');
  for (const s of shorts) assert.match(s, /^[0-9a-z]{7}$/);
  // Deterministic across reloads, independent of array order.
  assert.deepEqual(prepare([...raw].reverse()).map(a=>a.short).sort(), [...shorts].sort());
  assert.equal(shortId('x'), shortId('x'));
  // The long composite id stays available for old links.
  assert.ok(data.every(a=>a.id.includes('|')));
});
