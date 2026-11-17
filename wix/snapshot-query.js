import { packedId, unpackRow } from './snapshot-codec.js';
import { fail } from './service.js';

export function createSnapshotQuery(data, collection, physicalCollection, eventId, versionId) {
  const operations = [];
  const query = {};
  for (const method of ['eq', 'ne', 'hasSome', 'contains', 'ascending', 'descending', 'skip', 'limit']) {
    query[method] = (...args) => { operations.push([method, args]); return query; };
  }
  async function packedRows(options) {
    const result = await data.query(physicalCollection).eq('_id', packedId(collection, versionId)).limit(1).find(options);
    if (!result.items.length) return null;
    try { return unpackRow(result.items[0], collection, eventId, versionId); }
    catch { fail(409, 'INVALID_REFERENCE'); }
  }
  function selected(rows) {
    let offset = 0; let limit = 50;
    const sort = [];
    for (const [method, args] of operations) {
      const [field, value] = args;
      if (method === 'eq') rows = rows.filter((row) => row[field] === value);
      if (method === 'ne') rows = rows.filter((row) => row[field] !== value);
      if (method === 'hasSome') rows = rows.filter((row) => value.includes(row[field]));
      if (method === 'contains') rows = rows.filter((row) => String(row[field] || '').includes(value));
      if (method === 'skip') offset = field;
      if (method === 'limit') limit = field;
      if (method === 'ascending' || method === 'descending') sort.push(...args.map((key) => [key, method === 'ascending' ? 1 : -1]));
    }
    rows.sort((a, b) => {
      for (const [key, direction] of sort) {
        const left = a[key] ?? null; const right = b[key] ?? null;
        const comparison = left === right ? 0 : left === null ? -1 : right === null ? 1 : left < right ? -1 : 1;
        if (comparison) return direction * comparison;
      }
      return 0;
    });
    return { totalCount: rows.length, items: rows.slice(offset, offset + limit) };
  }
  function legacy() {
    let original = data.query(physicalCollection).eq('eventRef', eventId).eq('versionRef', versionId);
    for (const [method, args] of operations) original = original[method](...args);
    return original;
  }
  query.find = async (options) => {
    const rows = await packedRows(options);
    return rows === null ? legacy().find(options) : selected(rows);
  };
  query.count = async (options) => {
    const rows = await packedRows(options);
    return rows === null ? legacy().count(options) : selected(rows).totalCount;
  };
  return query;
}
