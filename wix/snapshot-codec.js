import { createHash } from 'crypto';
import { Buffer } from 'buffer';
import { gzipSync, gunzipSync } from 'zlib';

const omitted = new Set(['_createdDate', '_updatedDate', '_owner']);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export function canonicalJSON(value) {
  function canonical(item, key = '') {
    if (item instanceof Date || (key.endsWith('At') && typeof item === 'string')) return JSON.stringify(new Date(item).toISOString());
    if (Array.isArray(item)) return `[${item.map((entry) => canonical(entry) ?? 'null').join(',')}]`;
    if (item && typeof item === 'object') return `{${Object.keys(item).sort(compare).filter((field) => !omitted.has(field) && item[field] !== null && item[field] !== undefined).map((field) => `${JSON.stringify(field)}:${canonical(item[field], field)}`).join(',')}}`;
    if (typeof item === 'number' && !Number.isFinite(item)) throw new Error('INVALID_NUMBER');
    return JSON.stringify(item);
  }
  return canonical(value);
}
export const hashValue = (value) => createHash('sha256').update(canonicalJSON(value), 'utf8').digest('hex');
export const hashRows = (rows) => hashValue([...rows].sort((a, b) => compare(a._id, b._id)));
export const packedId = (collection, versionId) => `compact_${createHash('sha256').update(`${collection}:${versionId}`).digest('hex').slice(0, 48)}`;
export const encodeRows = (rows) => gzipSync(Buffer.from(canonicalJSON(rows), 'utf8')).toString('base64');
export function decodeRows(data) {
  if (typeof data !== 'string' || data.length > 470000 || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || Buffer.from(data, 'base64').toString('base64') !== data) throw new Error('INVALID_COMPACT_DATA');
  const rows = JSON.parse(gunzipSync(Buffer.from(data, 'base64'), { maxOutputLength: 16000000 }).toString('utf8'));
  if (!Array.isArray(rows) || rows.length > 20000 || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('INVALID_COMPACT_DATA');
  return rows;
}
export function unpackRow(row, collection, eventId, versionId) {
  if (row._id !== packedId(collection, versionId) || row.storageKind !== 'gzip-v1' || row.eventRef !== eventId || row.versionRef !== versionId) throw new Error('INVALID_COMPACT_SCOPE');
  const rows = decodeRows(row.payloadGzip);
  if (row.rowCount !== rows.length || row.payloadHash !== hashRows(rows) || new Set(rows.map((item) => item._id)).size !== rows.length || rows.some((item) => typeof item._id !== 'string' || item.eventRef !== eventId || item.versionRef !== versionId)) throw new Error('INVALID_COMPACT_DATA');
  return rows;
}
