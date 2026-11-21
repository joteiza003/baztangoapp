import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository } from '../wix/repository.js';
import { project, schema } from '../wix/schema.js';
import { readFile } from 'node:fs/promises';
import { encodeRows, hashRows, packedId } from '../wix/snapshot-codec.js';

function packed(collection, rows) {
  return { _id: packedId(collection, 'v1'), ...scope, storageKind: 'gzip-v1', payloadGzip: encodeRows(rows), payloadHash: hashRows(rows), rowCount: rows.length };
}

const scope = { eventRef: 'e1', versionRef: 'v1' };
function database(extra = {}) {
  const tables = { BTEventos: [{ _id: 'e1', isActive: true, currentVersionRef: 'v1' }], BTVersiones: [{ _id: 'v1', eventRef: 'e1', state: 'ready', publishedAt: '2026-11-17', schemaVersion: 1 }], ...extra };
  const calls = [];
  return { tables, calls, get: async (table, id) => tables[table]?.find((row) => row._id === id), query(table) {
    const predicates = [];
    let offset = 0;
    let size = 50;
    const query = {
      eq(field, value) { predicates.push((row) => row[field] === value); return query; },
      ne(field, value) { predicates.push((row) => row[field] !== value); return query; },
      contains(field, value) { predicates.push((row) => String(row[field] || '').includes(value)); return query; },
      hasSome(field, values) { predicates.push((row) => values.includes(row[field])); return query; },
      ascending() { return query; }, descending() { return query; },
      skip(value) { offset = value; return query; }, limit(value) { size = value; return query; },
      async find(options) { calls.push({ table, options }); const rows = (tables[table] || []).filter((row) => predicates.every((predicate) => predicate(row))); return { totalCount: rows.length, items: rows.slice(offset, offset + size) }; },
      async count(options) { return (await query.find(options)).totalCount; }
    };
    return query;
  } };
}
test('rejects incomplete, foreign, inactive and stale versions', async () => {
  for (const change of [{ state: 'loading' }, { eventRef: 'other' }, { publishedAt: null }, { schemaVersion: 2 }]) {
    const data = database(); Object.assign(data.tables.BTVersiones[0], change);
    await assert.rejects(createRepository(data).context('e1', 'v1'), { code: 'NO_PUBLISHED_DATA' });
  }
  const data = database();
  await assert.rejects(createRepository(data).context('e1', 'old'), { code: 'VERSION_EXPIRED' });
  data.tables.BTEventos[0].isActive = false;
  await assert.rejects(createRepository(data).context('e1'), { code: 'ACCESS_DENIED' });
});
test('list filters and paginates only the selected snapshot and excludes sensitive fields', async () => {
  const data = database({ BTPersonas: [{ _id: 'p1', ...scope, state: 'accepted', searchText: 'inigo', email: 'ficticio@example.invalid', dietaryNotes: 'privado' }, { _id: 'p2', ...scope, state: 'cancelled' }, { _id: 'p3', ...scope, versionRef: 'v2', state: 'accepted' }] });
  const result = await createRepository(data).list({ resource: 'personas', eventId: 'e1', versionId: 'v1', filters: { state: 'accepted' }, search: 'inigo', page: 0, limit: 25 });
  assert.equal(result.total, 1);
  assert.equal(result.items[0]._id, 'p1');
  for (const field of ['email', 'dietaryNotes', 'searchText']) assert.equal(field in result.items[0], false);
  assert.ok(data.calls.every((call) => call.options.consistentRead && call.options.suppressAuth));
});
test('never offsets individual debt with overpayment, includes obligations of cancellations', async () => {
  const data = database({ BTPersonas: [{ _id: 'p1', ...scope, state: 'accepted', pendingCents: 10000, paidNetCents: 0 }, { _id: 'p2', ...scope, state: 'accepted', pendingCents: 0, overpaidCents: 20000 }, { _id: 'p3', ...scope, state: 'cancelled', pendingCents: 1500 }] });
  const result = await createRepository(data).summary('e1', 'v1');
  assert.equal(result.accepted, 2); assert.equal(result.pendingCents, 11500);
  delete data.tables.BTPersonas[0].pendingCents;
  assert.equal((await createRepository(data).summary('e1', 'v1')).pendingCents, null);
});
test('detail refuses cross-version references', async () => {
  const data = database({ BTPersonas: [{ _id: 'p1', ...scope, reservationRef: 'r1' }], BTReservas: [{ _id: 'r1', ...scope, versionRef: 'v2' }] });
  await assert.rejects(createRepository(data).detail('e1', 'v1', 'p1'), { code: 'INVALID_REFERENCE' });
});
test('lookup cannot filter by reference to a foreign snapshot', async () => {
  const data = database({ BTActividades: [{ _id: 'a1', eventRef: 'e2', versionRef: 'v2' }] });
  await assert.rejects(createRepository(data).list({ resource: 'participaciones', eventId: 'e1', versionId: 'v1', filters: { activityRef: 'a1' }, search: '', page: 0, limit: 25 }), { code: 'INVALID_REFERENCE' });
});
test('shared payment remains one movement and separate allocations', async () => {
  const data = database({ BTPersonas: [{ _id: 'p1', ...scope, reservationRef: 'r1' }, { _id: 'p2', ...scope, reservationRef: 'r1' }], BTReservas: [{ _id: 'r1', ...scope }], BTPagos: [{ _id: 'pay1', ...scope, amountCents: 20000 }], BTImputaciones: [{ _id: 'i1', ...scope, personRef: 'p1', paymentRef: 'pay1', amountCents: 10000 }, { _id: 'i2', ...scope, personRef: 'p2', paymentRef: 'pay1', amountCents: 10000 }] });
  const result = await createRepository(data).detail('e1', 'v1', 'p1');
  assert.equal(result.payments.length, 1); assert.equal(result.allocations.length, 1); assert.equal(result.allocations[0].amountCents, 10000);
});
test('projection fields match the delivered 14-collection dictionary', async () => {
  const dictionary = await readFile(new URL('../wix-importacion/COLECCIONES_WIX.md', import.meta.url), 'utf8');
  for (const [resource, [collection, fields]] of Object.entries(schema)) {
    const section = dictionary.split(new RegExp(`## \\d+\\. ${collection} `))[1]?.split(/\n## /)[0];
    assert.ok(section, collection);
    for (const field of fields.split(' ')) assert.ok(section.includes(`\x60${field}\x60`), `${resource}.${field}`);
  }
  assert.equal(project('personas', { searchText: 'private', email: 'private' }).email, undefined);
});
test('activity counts unique people, excludes inactive rights and retains attendance incidents', async () => {
  const data = database({ BTActividades: [{ _id: 'a1', ...scope, category: 'meal' }], BTPersonas: [{ _id: 'p1', ...scope, state: 'accepted', dietaryNotes: 'ficticio', dietaryKnown: true }, { _id: 'p2', ...scope, state: 'cancelled' }], BTParticipaciones: [{ _id: 'x1', ...scope, personRef: 'p1', activityRef: 'a1', entitlement: 'included', eligible: true, attendanceState: 'notRegistered', validRecordCount: 0 }, { _id: 'x2', ...scope, personRef: 'p2', activityRef: 'a1', entitlement: 'none', eligible: false, attendanceState: 'registered', validRecordCount: 4 }] });
  const repo = createRepository(data);
  const result = await repo.activityDetail('e1', 'v1', 'a1', { group: 'missing', search: '', page: 0, limit: 25 });
  assert.deepEqual(result.counts, { entitled: 1, registered: 1, missing: 1, issues: 1 });
  assert.equal(result.items[0].person.dietaryNotes, 'ficticio');
  data.tables.BTActividades[0].category = 'class';
  assert.equal((await repo.activityDetail('e1', 'v1', 'a1', { group: 'missing', search: '', page: 0, limit: 25 })).items[0].person.dietaryNotes, undefined);
});
test('room occupancy uses departure-exclusive nights and actual apartment capacity', async () => {
  const data = database({ BTHabitaciones: [{ _id: 'r1', ...scope, roomType: 'apartment', capacity: 5, isAvailable: true }], BTPersonas: [{ _id: 'p1', ...scope }, { _id: 'p2', ...scope }], BTEstancias: [{ _id: 's1', ...scope, personRef: 'p1', roomRef: 'r1', state: 'reserved', checkInDate: '2026-11-20', checkOutDate: '2026-11-22' }, { _id: 's2', ...scope, personRef: 'p2', roomRef: 'r1', state: 'reserved', checkInDate: '2026-11-22', checkOutDate: '2026-11-23' }] });
  const result = await createRepository(data).roomDetail('e1', 'v1', 'r1', '2026-11-22');
  assert.equal(result.assigned, 1); assert.equal(result.free, 4); assert.equal(result.items[0].person._id, 'p2');
  delete data.tables.BTEstancias[0].checkOutDate;
  assert.equal((await createRepository(data).roomDetail('e1', 'v1', 'r1', '2026-11-22')).free, null);
});
test('no route reassigns late night movements or invents reconciliation', async () => {
  const data = database({ BTCajas: [{ _id: 'c1', ...scope, businessDate: '2026-11-20', countedCashCents: null }], BTMovimientos: [{ _id: 'm1', ...scope, cashSessionRef: 'c1', businessDate: '2026-11-20', occurredAt: '2026-11-21T01:00:00Z', amountCents: 100 }] });
  const result = await createRepository(data).list({ resource: 'movimientos', eventId: 'e1', versionId: 'v1', search: '', filters: { cashSessionRef: 'c1' }, page: 0, limit: 25 });
  assert.equal(result.items[0].businessDate, '2026-11-20');
  assert.equal(project('cajas', data.tables.BTCajas[0]).countedCashCents, null);
  assert.equal(project('cajas', data.tables.BTCajas[0]).cashDifferenceCents, undefined);
});
test('accent-insensitive searches work on original activity names and concepts', async () => {
  const data = database({ BTActividades: [{ _id: 'a1', ...scope, name: 'Cóctel de bienvenida' }] });
  const result = await createRepository(data).list({ resource: 'actividades', eventId: 'e1', versionId: 'v1', search: 'coctel', filters: {}, page: 0, limit: 25 });
  assert.equal(result.total, 1);
});
test('expense payment lookup validates the referenced expense snapshot', async () => {
  const data = database({ BTGastos: [{ _id: 'g1', ...scope }], BTMovimientos: [{ _id: 'm1', ...scope, expenseRef: 'g1', amountCents: -1000 }] });
  const request = { resource: 'movimientos', eventId: 'e1', versionId: 'v1', search: '', filters: { expenseRef: 'g1' }, page: 0, limit: 25 };
  assert.equal((await createRepository(data).list(request)).total, 1);
  data.tables.BTGastos[0].versionRef = 'v2';
  await assert.rejects(createRepository(data).list(request), { code: 'INVALID_REFERENCE' });
});
test('backend collection mapping supports Wix assigned import IDs without changing the schema', async () => {
  const data = database({ Import1: [{ _id: 'e1', title: 'Edición ficticia', isActive: true, currentVersionRef: 'v1' }], Import2: [{ _id: 'v1', eventRef: 'e1', state: 'ready', publishedAt: '2026-11-17', schemaVersion: 1 }], Import4: [{ _id: 'p1', ...scope, fullName: 'Persona ficticia', state: 'accepted' }] });
  const repository = createRepository(data, { BTEventos: 'Import1', BTVersiones: 'Import2', BTPersonas: 'Import4' });
  assert.equal((await repository.events())[0].title, 'Edición ficticia');
  assert.equal((await repository.context('e1', 'v1')).version._id, 'v1');
  const result = await repository.list({ resource: 'personas', eventId: 'e1', versionId: 'v1', search: '', filters: {}, page: 0, limit: 25 });
  assert.equal(result.items[0]._id, 'p1');
  assert.ok(data.calls.some((call) => call.table === 'Import4'));
});

test('compact storage preserves list filters, details and summary without exposing envelopes', async () => {
  const people = [{ _id: 'p1', ...scope, reservationRef: 'r1', state: 'accepted', firstName: 'Synthetic', searchText: 'synthetic', pendingCents: 500, email: 'synthetic@example.invalid' }, { _id: 'p2', ...scope, reservationRef: 'r1', state: 'cancelled', pendingCents: 100 }];
  const data = database({ BTPersonas: [packed('BTPersonas', people)], BTReservas: [packed('BTReservas', [{ _id: 'r1', ...scope }])] });
  const repo = createRepository(data);
  const result = await repo.list({ resource: 'personas', eventId: 'e1', versionId: 'v1', search: 'synthetic', filters: { state: 'accepted' }, page: 0, limit: 25 });
  assert.equal(result.total, 1); assert.equal(result.items[0]._id, 'p1');
  assert.equal(result.items[0].email, undefined); assert.equal(result.items[0].payloadGzip, undefined);
  assert.equal((await repo.detail('e1', 'v1', 'p1')).person.email, 'synthetic@example.invalid');
  assert.equal((await repo.summary('e1', 'v1')).pendingCents, 600);
  data.tables.BTPersonas[0].payloadHash = '0'.repeat(64);
  await assert.rejects(repo.summary('e1', 'v1'), { code: 'INVALID_REFERENCE' });
});

test('overview aggregates people, program and lodging nights without private fields', async () => {
  const people = [
    { _id: 'p1', ...scope, state: 'accepted', fullName: 'A Uno', paymentState: 'partial', danceRole: 'leader', packageName: 'Completo', country: 'ES', dueCents: 1000, paidNetCents: 400, pendingCents: 600, refundPendingCents: 0, overpaidCents: 0, arrivalState: 'registered', arrivalDate: '2026-11-26', email: 'privado@example.invalid' },
    { _id: 'p2', ...scope, state: 'accepted', fullName: 'B Dos', paymentState: 'settled', danceRole: 'follower', dueCents: 500, paidNetCents: 500, pendingCents: 0, refundPendingCents: 0, overpaidCents: 0, arrivalState: 'notRegistered' },
    { _id: 'p3', ...scope, state: 'cancelled', pendingCents: 0, dueCents: 0, paidNetCents: 0, refundPendingCents: 50, overpaidCents: 0 }
  ];
  const data = database({
    BTPersonas: people,
    BTActividades: [{ _id: 'a1', ...scope, name: 'Milonga', category: 'milonga', eventDate: '2026-11-26', sortOrder: 1 }],
    BTParticipaciones: [
      { _id: 'q1', ...scope, personRef: 'p1', activityRef: 'a1', eligible: true, entitlement: 'included', attendanceState: 'registered' },
      { _id: 'q2', ...scope, personRef: 'p2', activityRef: 'a1', eligible: true, entitlement: 'included', attendanceState: 'notRegistered' },
      { _id: 'q3', ...scope, personRef: 'p3', activityRef: 'a1', eligible: false, entitlement: 'none', attendanceState: 'registered' }
    ],
    BTHabitaciones: [{ _id: 'h1', ...scope, unitCode: 'APT-1', capacity: 2, isAvailable: true }],
    BTEstancias: [
      { _id: 's1', ...scope, personRef: 'p1', roomRef: 'h1', state: 'reserved', checkInDate: '2026-11-26', checkOutDate: '2026-11-28' },
      { _id: 's2', ...scope, personRef: 'p2', roomRef: 'h1', state: 'reserved', checkInDate: '2026-11-27', checkOutDate: '2026-11-28' }
    ],
    BTCajas: [{ _id: 'c1', ...scope, cashDifferenceCents: -200 }],
    BTSolicitudes: [{ _id: 'r1', ...scope, state: 'waiting' }, { _id: 'r2', ...scope, state: 'promoted' }]
  });
  data.tables.BTEventos[0].startDate = '2026-11-26'; data.tables.BTEventos[0].endDate = '2026-11-29';
  const result = await createRepository(data).overview('e1', 'v1');
  assert.equal(result.totals.accepted, 2); assert.equal(result.totals.arrived, 1); assert.equal(result.totals.housed, 2);
  assert.equal(result.finance.pendingCents, 600); assert.equal(result.finance.dueCents, 1500); assert.equal(result.finance.withDebt, 1);
  assert.deepEqual(result.byPaymentState.map((row) => row.value).sort(), ['partial', 'settled']);
  assert.deepEqual(result.debtors.map((row) => row._id), ['p1']);
  assert.deepEqual({ entitled: result.program[0].entitled, registered: result.program[0].registered, missing: result.program[0].missing, issues: result.program[0].issues }, { entitled: 2, registered: 2, missing: 1, issues: 1 });
  assert.deepEqual(result.lodging.nights.map((night) => [night.date, night.assigned]), [['2026-11-26', 1], ['2026-11-27', 2], ['2026-11-28', 0], ['2026-11-29', 0]]);
  assert.equal(result.lodging.rooms[0].occupancy[1], 2); assert.equal(result.lodging.nights[0].capacity, 2);
  assert.equal(result.attention.requests, 1); assert.equal(result.attention.waiting, 1); assert.equal(result.attention.sessionsWithDifference, 1);
  assert.equal(JSON.stringify(result).includes('privado@example.invalid'), false);
});
