import { createHmac, timingSafeEqual } from 'crypto';
import { canonicalJSON, hashRows, hashValue as hash, decodeRows } from './snapshot-codec.js';
export { canonicalJSON, hashRows } from './snapshot-codec.js';
import { Buffer } from 'buffer';
import { SYNC_COLLECTIONS, SYNC_MAX_ROWS, SYNC_PREFIX, SYNC_REFERENCES, SyncError, syncFail, syncId, syncDate, normalizeSyncRow } from './sync-repository.js';

export const SYNC_MAX_BYTES = 400000;
const hashPattern = /^[a-f0-9]{64}$/;
const responseHeaders = Object.freeze({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) syncFail(400, 'INVALID_BODY');
  return value;
}
function onlyKeys(value, keys) {
  object(value);
  if (Object.keys(value).some((key) => !keys.includes(key))) syncFail(400, 'UNKNOWN_FIELD');
}
function manifestOf(value) {
  onlyKeys(value, SYNC_COLLECTIONS);
  if (Object.keys(value).length !== SYNC_COLLECTIONS.length) syncFail(400, 'INVALID_MANIFEST');
  let total = 0;
  const manifest = {};
  for (const collection of SYNC_COLLECTIONS) {
    const entry = value[collection]; onlyKeys(entry, ['count', 'hash']);
    if (!Number.isSafeInteger(entry.count) || entry.count < 0 || entry.count > SYNC_MAX_ROWS || typeof entry.hash !== 'string' || !hashPattern.test(entry.hash)) syncFail(400, 'INVALID_MANIFEST');
    if (entry.count === 0 && entry.hash !== hashRows([])) syncFail(400, 'INVALID_MANIFEST');
    total += entry.count;
    manifest[collection] = { count: entry.count, hash: entry.hash };
  }
  if (total > SYNC_MAX_ROWS) syncFail(422, 'ROW_LIMIT');
  return { manifest, total };
}
function summaryOf(version) {
  if (typeof version.validationSummary !== 'string' || !version.validationSummary.startsWith(SYNC_PREFIX)) syncFail(409, 'INVALID_LOAD_STATE');
  let summary;
  try { summary = JSON.parse(version.validationSummary.slice(SYNC_PREFIX.length)); } catch { syncFail(409, 'INVALID_LOAD_STATE'); }
  if (summary?.protocol !== 1 || !['loading', 'validated'].includes(summary.phase) || !Object.hasOwn(summary, 'baseVersionRef')) syncFail(409, 'INVALID_LOAD_STATE');
  if (summary.baseVersionRef !== null) syncId(summary.baseVersionRef);
  manifestOf(summary.manifest);
  return summary;
}
const technical = (summary) => `${SYNC_PREFIX}${JSON.stringify(summary)}`;
function versionIdentity(version) {
  const { publishedAt, validationSummary, state, ...identity } = normalizeSyncRow('BTVersiones', version, { stored: true });
  return hash(identity);
}
function validatePerson(person) {
  const known = (...fields) => fields.every((field) => Number.isSafeInteger(person[field]));
  if (known('eventDueCents', 'hotelDueCents', 'dueCents')) {
    const due = person.eventDueCents + person.hotelDueCents;
    if (!Number.isSafeInteger(due) || person.dueCents !== due) syncFail(409, 'FINANCE_MISMATCH');
  }
  if (known('dueCents', 'paidNetCents')) {
    const balance = person.dueCents - person.paidNetCents;
    if (!Number.isSafeInteger(balance)) syncFail(409, 'FINANCE_MISMATCH');
    if (!known('pendingCents', 'overpaidCents') || person.pendingCents !== Math.max(balance, 0) || person.overpaidCents !== Math.max(-balance, 0)) syncFail(409, 'FINANCE_MISMATCH');
  }
  if (known('pendingCents', 'overpaidCents') && person.pendingCents > 0 && person.overpaidCents > 0) syncFail(409, 'FINANCE_MISMATCH');
}
function validateRows(rows, eventId, versionId) {
  const maps = Object.fromEntries(SYNC_COLLECTIONS.map((c) => [c, new Map()]));
  const uniqueFields = { BTReservas: ['reservationCode'], BTPersonas: ['personCode'], BTPagos: ['paymentCode'], BTActividades: ['activityCode'], BTHabitaciones: ['unitCode'], BTSolicitudes: ['requestCode'] };
  const sums = new Map();
  for (const collection of SYNC_COLLECTIONS) {
    const seen = new Map(['key', 'sourceId', ...(uniqueFields[collection] || [])].map((field) => [field, new Set()]));
    for (const raw of rows[collection]) {
      const row = normalizeSyncRow(collection, raw, { stored: true });
      if (row.eventRef !== eventId || row.versionRef !== versionId || maps[collection].has(row._id)) syncFail(409, 'SCOPE_MISMATCH');
      maps[collection].set(row._id, row);
      for (const [field, values] of seen) if (row[field] !== undefined) {
        if (values.has(row[field])) syncFail(409, 'DUPLICATE_KEY');
        values.add(row[field]);
      }
      for (const [field, value] of Object.entries(row)) if (field.endsWith('Cents')) {
        const sumKey = `${collection}:${field}`;
        const total = (sums.get(sumKey) || 0) + value;
        if (!Number.isSafeInteger(total)) syncFail(409, 'INTEGER_OVERFLOW');
        sums.set(sumKey, total);
      }
      if (collection === 'BTPersonas') validatePerson(row);
    }
  }
  const allocations = new Map();
  const pairs = new Set();
  function civil(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) syncFail(409, 'INVALID_STAY_DATE');
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) syncFail(409, 'INVALID_STAY_DATE');
    return value;
  }
  for (const collection of SYNC_COLLECTIONS) for (const row of maps[collection].values()) {
    for (const [field, target] of Object.entries(SYNC_REFERENCES)) if (row[field] !== undefined && !maps[target].has(row[field])) syncFail(409, 'INVALID_REFERENCE');
    if (collection === 'BTImputaciones') {
      const payment = maps.BTPagos.get(row.paymentRef);
      if (!Number.isSafeInteger(row.amountCents) || !Number.isSafeInteger(payment.amountCents) || (row.amountCents !== 0 && Math.sign(row.amountCents) !== Math.sign(payment.amountCents))) syncFail(409, 'FINANCE_MISMATCH');
      const allocated = (allocations.get(row.paymentRef) || 0) + Math.abs(row.amountCents);
      if (!Number.isSafeInteger(allocated) || allocated > Math.abs(payment.amountCents)) syncFail(409, 'FINANCE_MISMATCH');
      allocations.set(row.paymentRef, allocated);
    }
    if (collection === 'BTParticipaciones') {
      const pair = JSON.stringify([row.personRef, row.activityRef]);
      if (pairs.has(pair)) syncFail(409, 'DUPLICATE_PARTICIPATION');
      pairs.add(pair);
    }
    if (collection === 'BTEstancias') {
      if (row.checkInDate !== undefined) civil(row.checkInDate);
      if (row.checkOutDate !== undefined) civil(row.checkOutDate);
      if (row.checkInDate && row.checkOutDate && row.checkInDate >= row.checkOutDate) syncFail(409, 'INVALID_STAY_DATE');
    }
  }
}

export function createSyncService({ repository, getAdminSecret, now = Date.now }) {
  async function context(eventId, versionId) {
    const event = await repository.get('BTEventos', eventId);
    const version = await repository.get('BTVersiones', versionId);
    if (!event || !version || version.eventRef !== eventId || version.schemaVersion !== 1) syncFail(409, 'SCOPE_MISMATCH');
    const summary = summaryOf(version);
    return { event, version, summary };
  }
  function checkBase(event, versionId, summary) {
    if ((event.currentVersionRef || null) !== summary.baseVersionRef && event.currentVersionRef !== versionId) syncFail(409, 'VERSION_CONFLICT');
  }
  async function begin(packet, lease) {
    onlyKeys(packet, ['action', 'event', 'version', 'manifest', 'storage']);
    const storage = packet.storage || 'rows-v1';
    if (!['rows-v1', 'gzip-v1'].includes(storage)) syncFail(400, 'INVALID_STORAGE');
    const event = normalizeSyncRow('BTEventos', packet.event);
    const version = normalizeSyncRow('BTVersiones', packet.version);
    const { manifest, total } = manifestOf(packet.manifest);
    if (!event.eventKey || !version.versionKey || version.versionKey.startsWith('__baztango_sync_') || version.eventRef !== event._id || version.state !== 'loading' || version.schemaVersion !== 1 || !version.capturedAt || !hashPattern.test(version.contentHash || '') || version.publishedAt || version.validationSummary) syncFail(400, 'INVALID_BEGIN');
    if (version.personCount !== manifest.BTPersonas.count || version.paymentCount !== manifest.BTPagos.count || version.recordCount !== total) syncFail(400, 'COUNT_MISMATCH');
    const previousEvent = await repository.get('BTEventos', event._id);
    const sameKey = await repository.byKey('BTEventos', 'eventKey', event.eventKey);
    if ((previousEvent && previousEvent.eventKey !== event.eventKey) || (sameKey && sameKey._id !== event._id)) syncFail(409, 'IDENTITY_CONFLICT');
    if (previousEvent?.currentVersionRef) {
      const active = await repository.get('BTVersiones', previousEvent.currentVersionRef);
      if (!active || active.eventRef !== event._id || active.state !== 'ready' || !active.publishedAt || active.schemaVersion !== 1) syncFail(409, 'INVALID_CURRENT_VERSION');
      if (active.contentHash === version.contentHash) return { ok: true, versionId: active._id, eventId: event._id, unchanged: true };
    }
    const existing = await repository.get('BTVersiones', version._id);
    const sameVersionKey = await repository.byKey('BTVersiones', 'versionKey', version.versionKey);
    if (sameVersionKey && sameVersionKey._id !== version._id) syncFail(409, 'IDENTITY_CONFLICT');
    if (existing) {
      const summary = summaryOf(existing);
      if (existing.eventRef !== event._id || versionIdentity(existing) !== versionIdentity(version) || canonicalJSON(summary.manifest) !== canonicalJSON(manifest) || (summary.storage || 'rows-v1') !== storage) syncFail(409, 'VERSION_CONFLICT');
      if (!previousEvent) syncFail(409, 'SCOPE_MISMATCH');
      checkBase(previousEvent, version._id, summary);
      if (existing.state !== 'loading' && existing.state !== 'ready') syncFail(409, 'VERSION_IMMUTABLE');
      return { ok: true, versionId: version._id, eventId: event._id, unchanged: false };
    }
    if (!previousEvent) {
      delete event.currentVersionRef;
      await repository.insert('BTEventos', event, lease);
    }
    const baseVersionRef = previousEvent?.currentVersionRef || null;
    version.validationSummary = technical({ protocol: 1, phase: 'loading', storage, baseVersionRef, manifest });
    await repository.insert('BTVersiones', version, lease);
    return { ok: true, versionId: version._id, eventId: event._id, unchanged: false };
  }
  async function chunk(packet, lease) {
    onlyKeys(packet, ['action', 'eventId', 'versionId', 'collection', 'items']);
    if (!SYNC_COLLECTIONS.includes(packet.collection) || !Array.isArray(packet.items) || !packet.items.length || packet.items.length > 100) syncFail(400, 'INVALID_CHUNK');
    const { event, version, summary } = await context(packet.eventId, packet.versionId);
    checkBase(event, version._id, summary);
    if (version.state !== 'loading' || summary.phase !== 'loading') syncFail(409, 'VERSION_IMMUTABLE');
    if (summary.storage === 'gzip-v1') syncFail(400, 'INVALID_STORAGE');
    if (packet.items.length > summary.manifest[packet.collection].count) syncFail(400, 'INVALID_CHUNK');
    const written = await repository.bulkSave(packet.collection, packet.eventId, packet.versionId, packet.items, lease);
    return { ok: true, written };
  }
  async function collection(packet, lease) {
    onlyKeys(packet, ['action', 'eventId', 'versionId', 'collection', 'data']);
    if (!SYNC_COLLECTIONS.includes(packet.collection)) syncFail(400, 'INVALID_COLLECTION');
    const { event, version, summary } = await context(packet.eventId, packet.versionId);
    checkBase(event, version._id, summary);
    if (version.state !== 'loading' || summary.phase !== 'loading') syncFail(409, 'VERSION_IMMUTABLE');
    if (summary.storage !== 'gzip-v1') syncFail(400, 'INVALID_STORAGE');
    let rows;
    try { rows = decodeRows(packet.data); } catch { syncFail(400, 'INVALID_COMPACT_DATA'); }
    rows = rows.map((row) => normalizeSyncRow(packet.collection, row));
    if (rows.some((row) => row.eventRef !== event._id || row.versionRef !== version._id)) syncFail(409, 'SCOPE_MISMATCH');
    const expected = summary.manifest[packet.collection];
    if (rows.length !== expected.count || hashRows(rows) !== expected.hash) syncFail(409, 'MANIFEST_MISMATCH');
    await repository.savePacked(packet.collection, event._id, version._id, rows, expected.hash, lease);
    return { ok: true, written: rows.length };
  }
  async function commit(packet, lease) {
    onlyKeys(packet, ['action', 'eventId', 'versionId']);
    const { event, version, summary } = await context(packet.eventId, packet.versionId);
    checkBase(event, version._id, summary);
    if (version.state === 'ready') {
      if (summary.phase !== 'validated' || !version.publishedAt) syncFail(409, 'INVALID_LOAD_STATE');
      await repository.activate(event._id, version._id, summary.baseVersionRef, lease);
      return { ok: true, versionId: version._id, recordCount: version.recordCount };
    }
    if (version.state !== 'loading' || summary.phase !== 'loading') syncFail(409, 'VERSION_IMMUTABLE');
    const rows = {}; let recordCount = 0;
    for (const collection of SYNC_COLLECTIONS) {
      rows[collection] = await repository.readRows(collection, event._id, version._id);
      recordCount += rows[collection].length;
      if (recordCount > SYNC_MAX_ROWS) syncFail(422, 'ROW_LIMIT');
      const expected = summary.manifest[collection];
      if (rows[collection].length !== expected.count || hashRows(rows[collection]) !== expected.hash) syncFail(409, 'MANIFEST_MISMATCH');
    }
    validateRows(rows, event._id, version._id);
    if (version.personCount !== rows.BTPersonas.length || version.paymentCount !== rows.BTPagos.length || version.recordCount !== recordCount) syncFail(409, 'COUNT_MISMATCH');
    const current = await repository.get('BTEventos', event._id);
    checkBase(current, version._id, summary);
    await repository.saveVersion({ ...version, state: 'ready', publishedAt: new Date(now()), validationSummary: technical({ ...summary, phase: 'validated' }) }, lease);
    await repository.activate(event._id, version._id, summary.baseVersionRef, lease);
    return { ok: true, versionId: version._id, recordCount };
  }
  return async function sync(request) {
    try {
      if (request?.method !== 'POST') syncFail(405, 'METHOD_NOT_ALLOWED');
      const headers = {};
      for (const [name, value] of Object.entries(request.headers || {})) {
        const lower = name.toLowerCase();
        if (Object.hasOwn(headers, lower) || typeof value !== 'string') syncFail(400, 'INVALID_HEADERS');
        headers[lower] = value;
      }
      if (headers.origin || request.origin) syncFail(403, 'ORIGIN_NOT_ALLOWED');
      const body = request.body;
      if (typeof body !== 'string') syncFail(400, 'INVALID_BODY');
      if (Buffer.byteLength(body, 'utf8') > SYNC_MAX_BYTES) syncFail(413, 'BODY_TOO_LARGE');
      const timestamp = headers['x-baztango-timestamp'];
      const signature = headers['x-baztango-signature'];
      if (typeof timestamp !== 'string' || !/^\d{1,16}$/.test(timestamp) || !Number.isSafeInteger(Number(timestamp)) || Math.abs(Number(now()) - Number(timestamp)) > 300000 || typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) syncFail(401, 'UNAUTHORIZED');
      const secret = await getAdminSecret();
      if (typeof secret !== 'string' || !secret) syncFail(503, 'ADMIN_SECRET_UNAVAILABLE');
      const expected = createHmac('sha256', secret).update(`${timestamp}\n`, 'utf8').update(body, 'utf8').digest();
      if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) syncFail(401, 'UNAUTHORIZED');
      let packet;
      try { packet = JSON.parse(body); } catch { syncFail(400, 'INVALID_JSON'); }
      object(packet);
      if (!['begin', 'chunk', 'collection', 'commit', 'cleanupFailed'].includes(packet.action)) syncFail(400, 'INVALID_ACTION');
      const eventId = syncId(packet.action === 'begin' ? packet.event?._id : packet.eventId);
      if (packet.action !== 'cleanupFailed') syncId(packet.action === 'begin' ? packet.version?._id : packet.versionId);
      if (packet.action === 'cleanupFailed') {
        onlyKeys(packet, ['action', 'eventId']);
        const result = await repository.withLock(eventId, (lease) => repository.cleanupFailed(eventId, lease));
        return { status: 200, headers: { ...responseHeaders }, body: result };
      }
      const result = await repository.withLock(eventId, (lease) => packet.action === 'begin' ? begin(packet, lease) : packet.action === 'chunk' ? chunk(packet, lease) : packet.action === 'collection' ? collection(packet, lease) : commit(packet, lease));
      return { status: 200, headers: { ...responseHeaders }, body: result };
    } catch (error) {
      const retry = error instanceof SyncError && ['SYNC_BUSY', 'LEASE_EXPIRED'].includes(error.code) ? { 'Retry-After': '30' } : {};
      return { status: error instanceof SyncError ? error.status : 503, headers: { ...responseHeaders, ...retry }, body: { ok: false, error: error instanceof SyncError ? error.code : 'SYNC_UNAVAILABLE' } };
    }
  };
}
