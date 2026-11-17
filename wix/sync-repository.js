import { schema, detailFields } from './schema.js';
import { createHash, randomUUID } from 'crypto';
import { Buffer } from 'buffer';
import { packedId, encodeRows, unpackRow } from './snapshot-codec.js';

export const SYNC_COLLECTIONS = Object.freeze(Object.values(schema).map(([name]) => name));
export const SYNC_MAX_ROWS = 20000;
export const SYNC_PREFIX = 'BAZTANGO_SYNC_V1:';
const readOptions = Object.freeze({ suppressAuth: true, suppressHooks: true, consistentRead: true });
const writeOptions = Object.freeze({ suppressAuth: true, suppressHooks: true });
const mutexId = 'fa586f13-f830-5dac-a966-b829a49d1418';
const mutexKey = '__baztango_sync_mutex_v1__';
const writeLeaseMs = 60000;
export const SYNC_RECOVERY_MS = 600000;
const systemFields = new Set(['_createdDate', '_updatedDate', '_owner']);
const common = '_id title key sourceId eventRef versionRef sourceUpdatedAt';
const fields = Object.fromEntries(Object.entries(schema).map(([resource, [name, names]]) => [name, new Set(`${common} ${names} ${resource === 'personas' ? `${detailFields} searchText` : resource === 'solicitudes' ? 'email phone searchText' : ''}`.split(' ').filter(Boolean))]));
fields.BTEventos = new Set('_id title eventKey sourceEditionId year startDate endDate timeZone currency isActive currentVersionRef warningMinutes staleMinutes'.split(' '));
fields.BTVersiones = new Set('_id title versionKey eventRef state capturedAt publishedAt schemaVersion sourceLabel contentHash personCount paymentCount recordCount validationSummary'.split(' '));
const booleanFields = new Set('isActive isTeam isGuest dietaryKnown hasDataIssues timeConfirmed isGeneralArrival eligible needsReview isAvailable'.split(' '));
const integerFields = new Set('year warningMinutes staleMinutes schemaVersion personCount paymentCount recordCount capacity sortOrder validRecordCount operationCount declaredPeopleCount'.split(' '));
const nonnegativeCents = new Set('eventDueCents hotelDueCents dueCents pendingCents overpaidCents refundPendingCents openingFloatCents grossReceiptsCents refundsCents expensesPaidCents withdrawalsCents totalCents'.split(' '));
export const SYNC_REFERENCES = Object.freeze({ reservationRef: 'BTReservas', payerRef: 'BTPersonas', originPaymentRef: 'BTPagos', paymentRef: 'BTPagos', personRef: 'BTPersonas', activityRef: 'BTActividades', roomRef: 'BTHabitaciones', cashSessionRef: 'BTCajas', expenseRef: 'BTGastos', parentRequestRef: 'BTSolicitudes', promotedReservationRef: 'BTReservas' });
const requiredRefs = { BTPersonas: ['reservationRef'], BTImputaciones: ['paymentRef', 'personRef'], BTParticipaciones: ['personRef', 'activityRef'], BTEstancias: ['personRef'] };

export class SyncError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
export function syncFail(status, code) { throw new SyncError(status, code); }
export function syncId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value) || /^\d+$/.test(value) || value === mutexId) syncFail(400, 'INVALID_ID');
  return value;
}
export function syncDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return new Date(value);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) syncFail(400, 'INVALID_DATE');
  const civil = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(civil.getTime()) || civil.toISOString().slice(0, 10) !== value.slice(0, 10)) syncFail(400, 'INVALID_DATE');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) < '0001-01-01') syncFail(400, 'INVALID_DATE');
  return date;
}
export function normalizeSyncRow(collection, row, { stored = false } = {}) {
  if (!fields[collection] || !row || typeof row !== 'object' || Array.isArray(row)) syncFail(400, 'INVALID_ROW');
  const result = {};
  for (const [field, value] of Object.entries(row)) {
    if (stored && systemFields.has(field)) continue;
    if (!fields[collection].has(field)) syncFail(400, 'UNKNOWN_FIELD');
    if (value === null || value === undefined) continue;
    if (field === '_id' || field.endsWith('Ref')) result[field] = syncId(value);
    else if (field.endsWith('At')) result[field] = syncDate(value);
    else if (field.endsWith('Cents') || integerFields.has(field)) {
      if (!Number.isSafeInteger(value) || (nonnegativeCents.has(field) && value < 0)) syncFail(400, 'INVALID_INTEGER');
      result[field] = value;
    } else if (booleanFields.has(field)) {
      if (typeof value !== 'boolean') syncFail(400, 'INVALID_BOOLEAN');
      result[field] = value;
    } else {
      if (typeof value !== 'string' || value.length > 20000) syncFail(400, 'INVALID_FIELD');
      result[field] = value;
    }
  }
  syncId(result._id);
  if (SYNC_COLLECTIONS.includes(collection)) {
    syncId(result.eventRef); syncId(result.versionRef);
    for (const field of requiredRefs[collection] || []) syncId(result[field]);
    if (typeof result.key !== 'string' || !result.key || typeof result.sourceId !== 'string' || !result.sourceId) syncFail(400, 'INVALID_ROW');
  }
  return result;
}

export function createSyncRepository(wixData, collectionIds = {}, { now = Date.now, onStep = () => {} } = {}) {
  const allowed = new Set(['BTEventos', 'BTVersiones', ...SYNC_COLLECTIONS]);
  const collectionId = (name) => { if (!allowed.has(name)) syncFail(400, 'INVALID_COLLECTION'); return collectionIds[name] || name; };
  const query = (name) => wixData.query(collectionId(name));
  async function get(name, id) {
    const result = await query(name).eq('_id', id).limit(1).find(readOptions);
    return result.items[0] || null;
  }
  async function byKey(name, field, key) {
    const result = await query(name).eq(field, key).limit(2).find(readOptions);
    if (result.items.length > 1) syncFail(409, 'IDENTITY_CONFLICT');
    return result.items[0] || null;
  }
  function lockState(row) {
    let state;
    try { state = JSON.parse(row.validationSummary.slice(SYNC_PREFIX.length)); } catch { syncFail(409, 'SYNC_BUSY'); }
    const created = new Date(row._createdDate).getTime();
    if (!row.validationSummary.startsWith(SYNC_PREFIX) || state.kind !== 'mutex' || typeof state.owner !== 'string' || !/^[a-f0-9-]{36}$/.test(state.owner) || !Number.isFinite(created)) syncFail(409, 'SYNC_BUSY');
    return { owner: state.owner, created };
  }
  async function withLock(_eventId, operation) {
    let id = mutexId;
    for (let generation = 0; generation < 32; generation++) {
      const previous = await get('BTVersiones', id);
      if (previous) {
        const state = lockState(previous);
        if (now() - state.created < SYNC_RECOVERY_MS) syncFail(409, 'SYNC_BUSY');
        const digest = createHash('sha256').update(`${id}:${state.owner}`).digest('hex');
        id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
        continue;
      }
      const owner = randomUUID();
      const lock = { _id: id, title: 'Sync mutex', versionKey: `${mutexKey}:${id}`, state: 'loading', schemaVersion: 1, personCount: 0, paymentCount: 0, recordCount: 0, sourceLabel: 'sync-internal', validationSummary: `${SYNC_PREFIX}${JSON.stringify({ kind: 'mutex', owner })}` };
      let saved;
      try { saved = await wixData.insert(collectionId('BTVersiones'), lock, writeOptions); }
      catch (error) { if (await get('BTVersiones', id)) syncFail(409, 'SYNC_BUSY'); throw error; }
      const lease = { async assertHeld() {
        const current = await get('BTVersiones', id);
        if (!current) syncFail(409, 'LEASE_EXPIRED');
        const state = lockState(current);
        if (state.owner !== owner || now() - state.created >= writeLeaseMs || state.created - now() > 5000) syncFail(409, 'LEASE_EXPIRED');
      } };
      try { lockState(saved); await lease.assertHeld(); return await operation(lease); }
      finally {
        const current = await get('BTVersiones', id);
        if (current) {
          const state = lockState(current);
          if (state.owner === owner && now() - state.created < writeLeaseMs) await wixData.remove(collectionId('BTVersiones'), id, writeOptions);
        }
      }
    }
    syncFail(409, 'SYNC_BUSY');
  }
  async function guard(lease) { if (!lease?.assertHeld) syncFail(409, 'LEASE_REQUIRED'); await lease.assertHeld(); }
  async function insert(name, row, lease) {
    const normalized = normalizeSyncRow(name, row);
    await guard(lease);
    return wixData.insert(collectionId(name), normalized, writeOptions);
  }
  async function saveVersion(row, lease) {
    const previous = await get('BTVersiones', row._id);
    if (!previous || previous.state !== 'loading' || previous.eventRef !== row.eventRef) syncFail(409, 'VERSION_IMMUTABLE');
    const normalized = normalizeSyncRow('BTVersiones', row, { stored: true });
    await guard(lease);
    return wixData.update(collectionId('BTVersiones'), normalized, writeOptions);
  }
  async function bulkSave(collection, eventId, versionId, items, lease) {
    if (!SYNC_COLLECTIONS.includes(collection)) syncFail(400, 'INVALID_COLLECTION');
    if (!Array.isArray(items) || !items.length || items.length > 100) syncFail(400, 'INVALID_CHUNK');
    onStep('chunk-version', collection, items.length);
    const version = await get('BTVersiones', versionId);
    if (!version || version.state !== 'loading' || version.eventRef !== eventId) syncFail(409, 'VERSION_IMMUTABLE');
    const normalized = items.map((row) => normalizeSyncRow(collection, row));
    const ids = normalized.map((row) => row._id);
    if (new Set(ids).size !== ids.length) syncFail(400, 'DUPLICATE_ID');
    if (normalized.some((row) => row.eventRef !== eventId || row.versionRef !== versionId)) syncFail(409, 'SCOPE_MISMATCH');
    onStep('chunk-existing', collection, items.length);
    const existing = await query(collection).hasSome('_id', ids).limit(100).find(readOptions);
    if (existing.items.some((row) => row.eventRef !== eventId || row.versionRef !== versionId)) syncFail(409, 'SCOPE_MISMATCH');
    onStep('chunk-lease', collection, items.length);
    await guard(lease);
    onStep('chunk-write', collection, items.length);
    const result = await wixData.bulkSave(collectionId(collection), normalized, writeOptions);
    onStep('chunk-written', collection, items.length);
    if (!result || result.errors?.length || result.skipped || result.inserted + result.updated !== normalized.length) {
      onStep('chunk-result', collection, JSON.stringify({ inserted: result?.inserted, updated: result?.updated, skipped: result?.skipped, errors: result?.errors?.length, codes: (result?.errors || []).map((error) => /^WDE\d{4}$/.test(error.code || '') ? error.code : 'DATA_ERROR') }));
      syncFail(422, 'WRITE_INCOMPLETE');
    }
    return normalized.length;
  }
  async function readRows(collection, eventId, versionId) {
    if (!SYNC_COLLECTIONS.includes(collection)) syncFail(400, 'INVALID_COLLECTION');
    const packed = await get(collection, packedId(collection, versionId));
    if (packed) {
      try { return unpackRow(packed, collection, eventId, versionId); }
      catch { syncFail(409, 'INVALID_COMPACT_DATA'); }
    }
    const rows = []; let total;
    do {
      const result = await query(collection).eq('eventRef', eventId).eq('versionRef', versionId).ascending('_id').skip(rows.length).limit(1000).find(readOptions);
      if (!Number.isSafeInteger(result.totalCount) || result.totalCount < 0 || result.totalCount > SYNC_MAX_ROWS) syncFail(422, 'ROW_LIMIT');
      if (total !== undefined && total !== result.totalCount) syncFail(409, 'DATA_CHANGED');
      total = result.totalCount;
      if (!Array.isArray(result.items) || result.items.length > 1000 || (!result.items.length && rows.length < total)) syncFail(409, 'READ_INCOMPLETE');
      rows.push(...result.items);
      if (rows.length > total || rows.length > SYNC_MAX_ROWS) syncFail(409, 'READ_INCOMPLETE');
    } while (rows.length < total);
    return rows;
  }
  async function savePacked(collection, eventId, versionId, rows, payloadHash, lease) {
    if (!SYNC_COLLECTIONS.includes(collection)) syncFail(400, 'INVALID_COLLECTION');
    const version = await get('BTVersiones', versionId);
    if (!version || version.state !== 'loading' || version.eventRef !== eventId) syncFail(409, 'VERSION_IMMUTABLE');
    const id = packedId(collection, versionId);
    const existing = await get(collection, id);
    if (existing && (existing.eventRef !== eventId || existing.versionRef !== versionId || existing.storageKind !== 'gzip-v1')) syncFail(409, 'SCOPE_MISMATCH');
    const row = { _id: id, title: `Snapshot ${collection}`, key: `${versionId}:${collection}:compact-v1`, sourceId: '__compact_v1__', eventRef: eventId, versionRef: versionId, storageKind: 'gzip-v1', payloadGzip: encodeRows(rows), payloadHash, rowCount: rows.length };
    if (Buffer.byteLength(JSON.stringify(row), 'utf8') > 480000) syncFail(422, 'COMPACT_COLLECTION_TOO_LARGE');
    await guard(lease);
    try {
      if (existing) await wixData.update(collectionId(collection), row, writeOptions);
      else await wixData.insert(collectionId(collection), row, writeOptions);
    } catch (error) {
      if (error?.code === 'WDE0195') syncFail(422, 'CMS_STORAGE_FULL');
      throw error;
    }
  }
  async function cleanupFailed(eventId, lease) {
    const result = await query('BTVersiones').eq('eventRef', eventId).eq('state', 'loading').limit(100).find(readOptions);
    const candidates = result.items.filter((version) => {
      if (!String(version.sourceLabel || '').startsWith('Baztango Manager Pro') || !String(version.validationSummary || '').startsWith(SYNC_PREFIX) || now() - new Date(version._createdDate).getTime() < SYNC_RECOVERY_MS || !Number.isFinite(new Date(version._createdDate).getTime())) return false;
      try { const summary = JSON.parse(version.validationSummary.slice(SYNC_PREFIX.length)); return summary.protocol === 1 && summary.phase === 'loading' && summary.manifest && Object.keys(summary.manifest).length === 12; } catch { return false; }
    });
    let removedItems = 0; let removedVersions = 0;
    async function guardFailed(versionId) {
      await guard(lease);
      const [event, version] = await Promise.all([get('BTEventos', eventId), get('BTVersiones', versionId)]);
      if (!event || event.currentVersionRef === versionId || !version || version.state !== 'loading' || version.eventRef !== eventId) syncFail(409, 'VERSION_IMMUTABLE');
    }
    for (const version of candidates.slice(0, 3)) {
      for (const collection of SYNC_COLLECTIONS) {
        while (true) {
          const rows = await query(collection).eq('eventRef', eventId).eq('versionRef', version._id).limit(1000).find(readOptions);
          if (!rows.items.length) break;
          if (rows.items.some((row) => row.eventRef !== eventId || row.versionRef !== version._id || !String(row.key || '').startsWith(`${version._id}:`))) syncFail(409, 'SCOPE_MISMATCH');
          await guardFailed(version._id);
          const removed = await wixData.bulkRemove(collectionId(collection), rows.items.map((row) => row._id), writeOptions);
          if (removed.errors?.length || removed.skipped || removed.removed !== rows.items.length) syncFail(422, 'CLEANUP_INCOMPLETE');
          removedItems += removed.removed;
          if (removedItems > SYNC_MAX_ROWS) syncFail(422, 'ROW_LIMIT');
        }
      }
      await guardFailed(version._id);
      await wixData.remove(collectionId('BTVersiones'), version._id, writeOptions);
      removedVersions++;
    }
    return { ok: true, removedVersions, removedItems, hasMore: candidates.length > 3 };
  }
  async function activate(eventId, versionId, baseVersionRef, lease) {
    const event = await get('BTEventos', eventId);
    const version = await get('BTVersiones', versionId);
    if (!event || !version || version.eventRef !== eventId || version.state !== 'ready' || !version.publishedAt) syncFail(409, 'VERSION_NOT_READY');
    if (event.currentVersionRef === versionId) return;
    if ((event.currentVersionRef || null) !== baseVersionRef) syncFail(409, 'VERSION_CONFLICT');
    const normalized = { ...normalizeSyncRow('BTEventos', event, { stored: true }), currentVersionRef: versionId };
    await guard(lease);
    await wixData.update(collectionId('BTEventos'), normalized, writeOptions);
    const activated = await get('BTEventos', eventId);
    if (activated?.currentVersionRef !== versionId) syncFail(409, 'VERSION_CONFLICT');
  }
  return { get, byKey, withLock, insert, saveVersion, bulkSave, savePacked, cleanupFailed, readRows, activate };
}
