import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID, createHash } from 'node:crypto';
import { createSyncService, canonicalJSON, hashRows } from '../wix/sync-service.js';
import { createSyncRepository, SYNC_COLLECTIONS } from '../wix/sync-repository.js';

const instant = Date.parse('2026-11-17T12:00:00.000Z');
const adminSecret = 'synthetic-admin-export-secret';
const copy = (value) => structuredClone(value);

function fakeDB() {
  const tables = {};
  const calls = [];
  const db = { tables, calls, clock: instant, beforeWrite: null, beforeFind: null,
    query(table) {
      const predicates = []; let offset = 0; let size = 50;
      const q = {
        eq(k, v) { predicates.push((r) => r[k] === v); return q; },
        hasSome(k, vs) { predicates.push((r) => vs.includes(r[k])); return q; },
        ascending() { return q; }, skip(n) { offset = n; return q; }, limit(n) { size = n; return q; },
        async find(options) {
          calls.push({ op: 'find', table, options, size, offset });
          if (db.beforeFind) await db.beforeFind(table);
          const all = Object.values(tables[table] || {}).filter((r) => predicates.every((p) => p(r))).sort((a, b) => a._id < b._id ? -1 : a._id > b._id ? 1 : 0);
          return { items: copy(all.slice(offset, offset + size)), totalCount: all.length };
        }
      }; return q;
    },
    async insert(table, row, options) {
      calls.push({ op: 'insert', table, options });
      tables[table] ||= {};
      if (tables[table][row._id]) throw new Error('duplicate');
      if (db.beforeWrite) await db.beforeWrite(table, row, 'insert');
      tables[table][row._id] = copy({ _createdDate: new Date(db.clock), ...row }); return copy(tables[table][row._id]);
    },
    async update(table, row, options) {
      calls.push({ op: 'update', table, options });
      if (!tables[table]?.[row._id]) throw new Error('missing');
      if (db.beforeWrite) await db.beforeWrite(table, row, 'update');
      tables[table][row._id] = copy(row); return copy(row);
    },
    async bulkSave(table, rows, options) {
      calls.push({ op: 'bulkSave', table, options }); tables[table] ||= {};
      if (db.bulkFailure) return { inserted: 0, updated: 0, errors: [{ message: 'PII must never escape' }] };
      let inserted = 0; let updated = 0;
      for (const row of rows) { if (tables[table][row._id]) updated++; else inserted++; tables[table][row._id] = copy(row); }
      return { inserted, updated, errors: [], skipped: 0 };
    },
    async remove(table, id, options) { calls.push({ op: 'remove', table, options }); const row = tables[table]?.[id]; delete tables[table]?.[id]; return copy(row); }
  }; return db;
}

function fixture() {
  const db = fakeDB(); const eventId = randomUUID(); const versionId = randomUUID();
  const event = { _id: eventId, title: 'Fixture', eventKey: 'fixture-2026', sourceEditionId: 'fixture', year: 2026, startDate: '2026-11-17', endDate: '2026-11-19', timeZone: 'Europe/Madrid', currency: 'EUR', isActive: true, warningMinutes: 5, staleMinutes: 15 };
  const row = (collection, fields = {}) => ({ _id: randomUUID(), title: 'Fixture', key: `${versionId}:${collection}:${randomUUID()}`, sourceId: randomUUID(), eventRef: eventId, versionRef: versionId, ...fields });
  const reservation = row('BTReservas', { reservationCode: 'R1', sourceState: 'accepted' });
  const person = row('BTPersonas', { reservationRef: reservation._id, personCode: 'P1', firstName: 'Fixture', fullName: 'Fixture', searchText: 'fixture', state: 'accepted', danceRole: 'unknown', isTeam: false, isGuest: false, dietaryKnown: false, arrivalState: 'unknown', paymentState: 'partial', hasDataIssues: false, dueCents: 10000, paidNetCents: 2500, pendingCents: 7500, overpaidCents: 0 });
  const rows = Object.fromEntries(SYNC_COLLECTIONS.map((c) => [c, []]));
  rows.BTReservas = [reservation]; rows.BTPersonas = [person];
  const begin = () => ({ action: 'begin', event, version: { _id: versionId, title: 'Fixture', versionKey: versionId, eventRef: eventId, state: 'loading', capturedAt: '2026-11-17T12:00:00Z', schemaVersion: 1, sourceLabel: 'fixture', contentHash: 'a'.repeat(64), personCount: rows.BTPersonas.length, paymentCount: rows.BTPagos.length, recordCount: Object.values(rows).reduce((n, rs) => n + rs.length, 0) }, manifest: Object.fromEntries(SYNC_COLLECTIONS.map((c) => [c, { count: rows[c].length, hash: hashRows(rows[c]) }])) });
  const service = createSyncService({ repository: createSyncRepository(db, {}, { now: () => db.clock }), getAdminSecret: async () => adminSecret, now: () => instant });
  const send = async (payload, overrides = {}) => {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const timestamp = String(instant);
    return service({ method: 'POST', body, headers: { 'X-Baztango-Timestamp': timestamp, 'X-Baztango-Signature': createHmac('sha256', adminSecret).update(`${timestamp}\n${body}`).digest('hex') }, ...overrides });
  };
  const chunk = (collection, items = rows[collection]) => ({ action: 'chunk', eventId, versionId, collection, items });
  const commit = () => send({ action: 'commit', eventId, versionId });
  const load = async () => { assert.equal((await send(begin())).status, 200); for (const c of SYNC_COLLECTIONS) if (rows[c].length) assert.equal((await send(chunk(c))).status, 200); };
  return { db, eventId, versionId, event, row, rows, reservation, person, begin, send, chunk, commit, load };
}

test('canonical JSON omits null/system fields, normalizes At and preserves array order', () => {
  assert.equal(canonicalJSON({ z: null, b: [2, 1], a: { z: 1, A: 2 }, capturedAt: '2026-11-17T13:00:00+01:00', _owner: 'ignored' }), '{"a":{"A":2,"z":1},"b":[2,1],"capturedAt":"2026-11-17T12:00:00.000Z"}');
  assert.equal(hashRows([{ _id: 'b', x: null }, { _id: 'a', x: new Date(instant) }]), hashRows([{ _id: 'a', x: new Date(instant) }, { _id: 'b' }]));
  assert.equal(hashRows([]), createHash('sha256').update('[]').digest('hex'));
  assert.equal(canonicalJSON({ nested: { 2: 'two', 10: 'ten' } }), '{"nested":{"10":"ten","2":"two"}}');
});

test('rejects wrong auth, panel token, expired/future timestamps before any database access', async () => {
  const f = fixture();
  for (const headers of [{ authorization: 'Bearer panel-token' }, { 'X-Baztango-Timestamp': String(instant), 'X-Baztango-Signature': '0'.repeat(64) }, ...[-300001, 300001].map((delta) => { const timestamp = String(instant + delta); return { 'X-Baztango-Timestamp': timestamp, 'X-Baztango-Signature': createHmac('sha256', adminSecret).update(`${timestamp}\n${JSON.stringify(f.begin())}`).digest('hex') }; })]) {
    assert.equal((await f.send(f.begin(), { headers })).status, 401);
  }
  assert.equal(f.db.calls.length, 0);
});

test('replays begin/chunk/commit idempotently, stores Wix dates and activates last', async () => {
  const f = fixture(); f.reservation.registeredAt = '2026-11-17T13:00:00+01:00';
  await f.load();
  assert.equal((await f.send(f.begin())).status, 200);
  assert.equal((await f.send(f.chunk('BTPersonas'))).body.written, 1);
  assert.ok(f.db.tables.BTVersiones[f.versionId].capturedAt instanceof Date);
  assert.ok(f.db.tables.BTReservas[f.reservation._id].registeredAt instanceof Date);
  assert.equal(f.db.tables.BTEventos[f.eventId].currentVersionRef, undefined);
  const result = await f.commit(); assert.equal(result.status, 200); assert.equal(result.body.recordCount, 2);
  assert.equal(f.db.tables.BTEventos[f.eventId].currentVersionRef, f.versionId);
  const version = copy(f.db.tables.BTVersiones[f.versionId]);
  assert.equal((await f.commit()).status, 200); assert.deepEqual(f.db.tables.BTVersiones[f.versionId], version);
  assert.equal((await f.send(f.chunk('BTPersonas'))).status, 409);
});

test('incomplete chunks and changed hashes never activate', async () => {
  for (const corrupt of [false, true]) {
    const f = fixture(); await f.send(f.begin()); await f.send(f.chunk('BTReservas'));
    if (corrupt) { await f.send(f.chunk('BTPersonas')); f.db.tables.BTPersonas[f.person._id].fullName = 'changed'; }
    assert.equal((await f.commit()).status, 409);
    assert.equal(f.db.tables.BTEventos[f.eventId].currentVersionRef, undefined);
    assert.equal(f.db.tables.BTVersiones[f.versionId].state, 'loading');
  }
});

test('rejects cross-scope overwrites and dangling references', async () => {
  const f = fixture(); await f.send(f.begin());
  assert.equal((await f.send(f.chunk('BTPersonas', [{ ...f.person, eventRef: randomUUID() }]))).status, 409);
  f.db.tables.BTPersonas = { [f.person._id]: { ...f.person, versionRef: randomUUID() } };
  assert.equal((await f.send(f.chunk('BTPersonas'))).status, 409);
  delete f.db.tables.BTPersonas[f.person._id]; f.person.reservationRef = randomUUID();
  const g = fixture(); g.person.reservationRef = randomUUID(); await g.load();
  assert.equal((await g.commit()).status, 409);
});

test('preserves active version at begin, rejects obsolete commit and keeps dates on unchanged', async () => {
  const f = fixture(); const activeId = randomUUID();
  f.db.tables.BTEventos = { [f.eventId]: { ...f.event, currentVersionRef: activeId } };
  f.db.tables.BTVersiones = { [activeId]: { _id: activeId, eventRef: f.eventId, state: 'ready', contentHash: 'b'.repeat(64), capturedAt: new Date(instant - 1000), publishedAt: new Date(instant - 500), schemaVersion: 1 } };
  f.event.currentVersionRef = randomUUID(); await f.load();
  assert.equal(f.db.tables.BTEventos[f.eventId].currentVersionRef, activeId);
  f.db.tables.BTEventos[f.eventId].currentVersionRef = randomUUID();
  assert.equal((await f.commit()).status, 409);
  f.db.tables.BTEventos[f.eventId].currentVersionRef = activeId;
  f.db.tables.BTVersiones[activeId].contentHash = 'a'.repeat(64);
  const before = copy(f.db.tables.BTVersiones[activeId]);
  const result = await f.send(f.begin()); assert.equal(result.body.unchanged, true); assert.equal(result.body.versionId, activeId);
  assert.deepEqual(f.db.tables.BTVersiones[activeId], before);
});

test('rejects oversized UTF8 bodies, browser origins, OPTIONS and malformed JSON', async () => {
  const f = fixture();
  assert.equal((await f.send('á'.repeat(200001))).status, 413);
  assert.equal((await f.send(f.begin(), { origin: 'https://example.invalid' })).status, 403);
  assert.equal((await f.send(f.begin(), { method: 'OPTIONS' })).status, 405);
  assert.equal((await f.send('{')).status, 400);
  assert.equal((await f.send('null')).status, 400);
  assert.equal(f.db.calls.length, 0);
});

test('signs raw UTF8 bytes, validates timestamp boundaries and never emits CORS', async () => {
  const f = fixture(); f.event.title = 'Edición á ñ 🎶';
  const body = ` ${JSON.stringify(f.begin())}\n`;
  for (const delta of [-300000, 300000]) {
    const timestamp = String(instant + delta);
    const headers = { 'x-baztango-timestamp': timestamp, 'x-baztango-signature': createHmac('sha256', adminSecret).update(`${timestamp}\n${body}`).digest('hex').toUpperCase() };
    const result = await f.send(body, { headers });
    assert.equal(result.status, 200);
    assert.ok(!Object.keys(result.headers).some((k) => k.toLowerCase().startsWith('access-control-')));
  }
  const timestamp = String(instant);
  const headers = { 'X-Baztango-Timestamp': timestamp, 'X-Baztango-Signature': createHmac('sha256', adminSecret).update(`${timestamp}\n${body}`).digest('hex') };
  assert.equal((await f.send(body.trim(), { headers })).status, 401);
});

test('whitelists canonical collections and fields, rejects numeric reference IDs and unsafe cents', async () => {
  const f = fixture(); await f.send(f.begin());
  for (const collection of ['Import4', 'BTEventos', 'BTVersiones', 'free', '__proto__']) assert.equal((await f.send(f.chunk(collection, [f.person]))).status, 400);
  for (const change of [{ injected: 'never stored' }, { _owner: 'injected' }, { pendingCents: 1.5 }, { pendingCents: Number.MAX_SAFE_INTEGER + 1 }, { pendingCents: -1 }, { reservationRef: 123 }, { reservationRef: '123' }, { reservationRef: { _id: f.reservation._id } }, { arrivedAt: '2026-11-17' }, { arrivedAt: '2026-02-30T12:00:00Z' }]) {
    assert.equal((await f.send(f.chunk('BTPersonas', [{ ...f.person, ...change }]))).status, 400);
  }
  assert.equal(f.db.calls.filter((c) => c.op === 'bulkSave').length, 0);
});

test('limits chunks, rejects duplicate IDs and immutable begin collisions', async () => {
  const f = fixture(); await f.send(f.begin());
  assert.equal((await f.send(f.chunk('BTPersonas', []))).status, 400);
  assert.equal((await f.send(f.chunk('BTPersonas', Array(101).fill(f.person)))).status, 400);
  const changed = f.begin(); changed.version.contentHash = 'b'.repeat(64);
  assert.equal((await f.send(changed)).status, 409);
  const changedKey = f.begin(); changedKey.event.eventKey = 'other';
  assert.equal((await f.send(changedKey)).status, 409);
  const changedManifest = f.begin(); changedManifest.manifest.BTPersonas.hash = 'b'.repeat(64);
  assert.equal((await f.send(changedManifest)).status, 409);
  const g = fixture(); g.rows.BTPersonas.push({ ...g.person, _id: randomUUID(), personCode: 'P2', sourceId: randomUUID(), key: 'other' });
  await g.send(g.begin());
  assert.equal((await g.send(g.chunk('BTPersonas', [g.person, g.person]))).status, 400);
});

test('checks manifests and declared counts before inserting an event', async () => {
  for (const mutate of [
    (p) => { delete p.manifest.BTGastos; },
    (p) => { p.manifest.Import4 = { count: 0, hash: hashRows([]) }; },
    (p) => { p.manifest.BTGastos.count = 20001; },
    (p) => { p.manifest.BTGastos.hash = '0'.repeat(64); },
    (p) => { p.version.personCount++; },
    (p) => { p.version.paymentCount++; },
    (p) => { p.version.recordCount++; },
    (p) => { p.version.eventRef = randomUUID(); }
  ]) {
    const f = fixture(); const packet = f.begin(); mutate(packet);
    assert.notEqual((await f.send(packet)).status, 200);
    assert.equal(f.db.tables.BTEventos, undefined);
    assert.equal(Object.keys(f.db.tables.BTVersiones || {}).length, 0);
  }
});

test('never offsets one person debt with another person overpayment', async () => {
  const f = fixture();
  f.rows.BTPersonas.push(f.row('BTPersonas', { ...f.person, _id: randomUUID(), key: 'P2-key', sourceId: 'P2-source', personCode: 'P2', dueCents: 1000, paidNetCents: 20000, pendingCents: 0, overpaidCents: 19000 }));
  await f.load(); assert.equal((await f.commit()).status, 200);
  assert.equal(f.db.tables.BTPersonas[f.person._id].pendingCents, 7500);
  const g = fixture(); g.person.pendingCents = 0; await g.load();
  assert.equal((await g.commit()).body.error, 'FINANCE_MISMATCH');
  assert.equal(g.db.tables.BTEventos[g.eventId].currentVersionRef, undefined);
});

test('bulkSave partial errors and internal failures never expose payloads', async () => {
  const f = fixture(); await f.send(f.begin()); f.db.bulkFailure = true;
  const result = await f.send(f.chunk('BTPersonas'));
  assert.equal(result.status, 503); assert.deepEqual(result.body, { ok: false, error: 'WRITE_INCOMPLETE' });
  f.db.beforeFind = () => { throw new Error('private-person@example.invalid'); };
  const failed = await f.commit();
  assert.equal(failed.status, 503); assert.deepEqual(failed.body, { ok: false, error: 'SYNC_UNAVAILABLE' });
});

test('failed pointer update leaves the old pointer and commit can resume a ready version', async () => {
  const f = fixture(); await f.load();
  f.db.beforeWrite = (table, row, op) => { if (table === 'BTEventos' && op === 'update') throw new Error('write failed'); };
  assert.equal((await f.commit()).status, 503);
  assert.equal(f.db.tables.BTEventos[f.eventId].currentVersionRef, undefined);
  assert.equal(f.db.tables.BTVersiones[f.versionId].state, 'ready');
  const publishedAt = f.db.tables.BTVersiones[f.versionId].publishedAt;
  f.db.beforeWrite = null;
  assert.equal((await f.commit()).status, 200);
  assert.deepEqual(f.db.tables.BTVersiones[f.versionId].publishedAt, publishedAt);
  assert.equal(f.db.tables.BTEventos[f.eventId].currentVersionRef, f.versionId);
});

test('two backend instances cannot publish or write concurrently', async () => {
  const f = fixture(); await f.load();
  let release; const gate = new Promise((resolve) => { release = resolve; });
  let entered; const started = new Promise((resolve) => { entered = resolve; });
  f.db.beforeFind = async (table) => { if (table === 'BTReservas') { entered(); await gate; } };
  const committing = f.commit(); await started;
  const other = createSyncService({ repository: createSyncRepository(f.db), getAdminSecret: async () => adminSecret, now: () => instant });
  const packet = f.chunk('BTPersonas'); const body = JSON.stringify(packet); const timestamp = String(instant);
  const result = await other({ method: 'POST', body, headers: { 'X-Baztango-Timestamp': timestamp, 'X-Baztango-Signature': createHmac('sha256', adminSecret).update(`${timestamp}\n${body}`).digest('hex') } });
  assert.equal(result.status, 409); assert.equal(result.body.error, 'SYNC_BUSY');
  release(); assert.equal((await committing).status, 200);
});

test('commit scans all twelve collections in pages of 1000 with consistent reads and bounded totals', async () => {
  const f = fixture(); f.rows.BTReservas = [];
  for (let i = 0; i < 1001; i++) f.rows.BTReservas.push(f.row('BTReservas', { reservationCode: `R${i}` }));
  f.person.reservationRef = f.rows.BTReservas[0]._id;
  assert.equal((await f.send(f.begin())).status, 200);
  for (let i = 0; i < f.rows.BTReservas.length; i += 100) assert.equal((await f.send(f.chunk('BTReservas', f.rows.BTReservas.slice(i, i + 100)))).status, 200);
  assert.equal((await f.send(f.chunk('BTPersonas'))).status, 200);
  f.db.calls.length = 0;
  assert.equal((await f.commit()).status, 200);
  const scans = f.db.calls.filter((c) => c.op === 'find' && c.size === 1000);
  assert.equal(scans.length, 13); assert.equal(scans.filter((c) => c.table === 'BTReservas')[1].offset, 1000);
  assert.ok(scans.every((c) => c.options.suppressAuth && c.options.consistentRead && c.options.suppressHooks));
  const writes = f.db.calls.filter((c) => ['insert', 'update', 'bulkSave'].includes(c.op));
  assert.equal(writes.at(-1).table, 'BTEventos');
  assert.ok(writes.every((c) => c.options.suppressAuth && c.options.suppressHooks));
});

test('normalizes nulls and system dates on database read without losing the data hash', async () => {
  const f = fixture(); f.reservation.registeredAt = '2026-11-17T12:00:00Z'; f.person.email = null;
  await f.load();
  for (const collection of SYNC_COLLECTIONS) for (const row of Object.values(f.db.tables[collection] || {})) {
    delete row.email; row._owner = 'wix-owner'; row._createdDate = new Date(instant); row._updatedDate = new Date(instant);
  }
  assert.equal((await f.commit()).status, 200);
});

test('maps only canonical IDs to Import1 through Import14 and wires the existing elevated secret', async () => {
  const db = fakeDB(); const ids = { BTEventos: 'Import1', BTVersiones: 'Import2', ...Object.fromEntries(SYNC_COLLECTIONS.map((c, i) => [c, `Import${i + 3}`])) };
  const repository = createSyncRepository(db, ids);
  for (const c of ['BTEventos', 'BTVersiones', ...SYNC_COLLECTIONS]) await repository.get(c, randomUUID());
  assert.deepEqual(db.calls.map((c) => c.table), Array.from({ length: 14 }, (_, i) => `Import${i + 1}`));
  const { readFile } = await import('node:fs/promises');
  const fragment = await readFile(new URL('../wix/http-sync.fragment.js', import.meta.url), 'utf8');
  assert.match(fragment, /baztangoSyncElevate\(baztangoSyncSecrets\.getSecretValue\)/);
  assert.match(fragment, /baztango-reservations-export-token/);
  assert.match(fragment, /export async function post_baztangoSync/);
  assert.doesNotMatch(fragment, /BAZTANGO_APP_ACCESS_PASSWORD|options_baztango|Access-Control-Allow-Origin/);
});

test('recovers a mutex after ten minutes without deleting expired generations or allowing late writes', async () => {
  const f = fixture(); await f.load();
  let release; const gate = new Promise((resolve) => { release = resolve; });
  let entered; const started = new Promise((resolve) => { entered = resolve; });
  let blocked = false;
  f.db.beforeFind = async (table) => { if (table === 'BTReservas' && !blocked) { blocked = true; entered(); await gate; } };
  const old = f.commit(); await started;
  const oldLock = Object.values(f.db.tables.BTVersiones).find((r) => r.versionKey?.startsWith('__baztango_sync_mutex'));
  assert.equal(oldLock.eventRef, undefined);
  f.db.clock += 599999;
  assert.equal((await f.send(f.begin())).body.error, 'SYNC_BUSY');
  f.db.clock += 2;
  assert.equal((await f.send(f.begin())).status, 200);
  assert.ok(f.db.tables.BTVersiones[oldLock._id]);
  release();
  assert.equal((await old).body.error, 'LEASE_EXPIRED');
  assert.equal(f.db.tables.BTEventos[f.eventId].currentVersionRef, undefined);
  assert.equal((await f.commit()).status, 200);
  assert.ok(f.db.tables.BTVersiones[oldLock._id]);
});

test('rejects overallocated payments, duplicate participation pairs and invalid stay dates', async () => {
  for (const kind of ['allocation', 'pair', 'date', 'order']) {
    const f = fixture();
    if (kind === 'allocation') {
      const p = f.row('BTPagos', { paymentCode: 'pay', amountCents: 1000 }); f.rows.BTPagos.push(p);
      f.rows.BTImputaciones.push(...[600, 600].map((amountCents) => f.row('BTImputaciones', { paymentRef: p._id, personRef: f.person._id, amountCents })));
    } else if (kind === 'pair') {
      const a = f.row('BTActividades', { activityCode: 'a' }); f.rows.BTActividades.push(a);
      for (let i = 0; i < 2; i++) f.rows.BTParticipaciones.push(f.row('BTParticipaciones', { personRef: f.person._id, activityRef: a._id }));
    } else {
      f.rows.BTEstancias.push(f.row('BTEstancias', { personRef: f.person._id, checkInDate: kind === 'date' ? '2026-02-30' : '2026-11-19', checkOutDate: '2026-11-18' }));
    }
    await f.load();
    assert.equal((await f.commit()).status, 409);
    assert.equal(f.db.tables.BTEventos[f.eventId].currentVersionRef, undefined);
  }
});

test('allows a shared payment across reservations while keeping every reference in the snapshot', async () => {
  const f = fixture();
  const reservation = f.row('BTReservas', { reservationCode: 'R2' }); f.rows.BTReservas.push(reservation);
  const p = f.row('BTPagos', { paymentCode: 'pay', amountCents: 1000, reservationRef: reservation._id, payerRef: f.person._id }); f.rows.BTPagos.push(p);
  f.rows.BTImputaciones.push(f.row('BTImputaciones', { paymentRef: p._id, personRef: f.person._id, amountCents: 1000 }));
  await f.load(); assert.equal((await f.commit()).status, 200);
});
