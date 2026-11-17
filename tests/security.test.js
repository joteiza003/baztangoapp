import test from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../wix/service.js';

const password = 'ficticia-de-pruebas-32-caracteres';
const origin = 'https://joteiza003.github.io';
function setup() {
  let now = 1000000;
  const reads = [];
  const repository = { events: async () => [{ _id: 'e1' }], context: async (id, version) => { reads.push([id, version]); return { event: { _id: id }, version: { _id: 'v1' } }; }, list: async (request) => { reads.push(request); return { items: [], total: 0 }; }, summary: async () => ({}), detail: async () => ({}) };
  return { service: createService({ repository, getPassword: async () => password, now: () => now }), reads, advance: () => { now += 901000; } };
}
const call = (service, body, token, suppliedOrigin = origin) => service({ method: 'POST', origin: suppliedOrigin, authorization: token ? `Bearer ${token}` : '', body });
test('denies anonymous queries and incorrect passwords without data reads', async () => {
  const { service, reads } = setup();
  assert.equal((await call(service, { action: 'list' })).status, 401);
  assert.equal((await call(service, { action: 'login', password: 'incorrecta' })).status, 401);
  assert.deepEqual(reads, []);
});
test('rejects missing or foreign origin, including preflight', async () => {
  const { service } = setup();
  for (const suppliedOrigin of ['', 'https://evil.example']) {
    assert.equal((await call(service, { action: 'login', password }, null, suppliedOrigin)).status, 403);
    assert.equal((await service({ method: 'OPTIONS', origin: suppliedOrigin })).status, 403);
  }
});
test('signed sessions expire and tampering fails', async () => {
  const { service, advance } = setup();
  const login = await call(service, { action: 'login', password });
  assert.equal(login.status, 200);
  const { token } = login.body;
  assert.equal((await call(service, { action: 'context', eventId: 'e1' }, token)).status, 200);
  assert.equal((await call(service, { action: 'context', eventId: 'e1' }, `${token}x`)).status, 401);
  advance();
  assert.equal((await call(service, { action: 'context', eventId: 'e1' }, token)).status, 401);
});
test('validates pagination, resources, filters and required version before reading', async () => {
  const { service, reads } = setup();
  const { token } = (await call(service, { action: 'login', password })).body;
  for (const extra of [{ limit: 101 }, { page: -1 }, { resource: 'users' }, { filters: { arbitrary: 'x' } }, { versionId: '' }, { filters: { eligible: 'true' } }]) {
    const response = await call(service, { action: 'list', eventId: 'e1', versionId: 'v1', resource: 'personas', ...extra }, token);
    assert.equal(response.status, 400);
  }
  assert.deepEqual(reads, []);
  assert.equal((await call(service, { action: 'list', eventId: 'e1', versionId: 'v1', resource: 'personas', search: 'Íñigo' }, token)).status, 200);
  assert.equal(reads.at(-1).search, 'inigo');
});
test('rejects writes, unknown actions and oversized input', async () => {
  const { service } = setup();
  const { token } = (await call(service, { action: 'login', password })).body;
  assert.equal((await service({ method: 'DELETE', origin })).status, 405);
  assert.equal((await call(service, { action: 'insert' }, token)).status, 400);
  assert.equal((await call(service, { action: 'login', password: 'x'.repeat(5000) })).status, 413);
});
test('limits failed logins and authenticated requests', async () => {
  const { service } = setup();
  for (let attempt = 0; attempt < 10; attempt++) await call(service, { action: 'login', password: 'wrong' });
  assert.equal((await call(service, { action: 'login', password })).status, 429);
  const other = setup().service;
  const { token } = (await call(other, { action: 'login', password })).body;
  for (let attempt = 0; attempt < 60; attempt++) await call(other, { action: 'context', eventId: 'e1' }, token);
  assert.equal((await call(other, { action: 'context', eventId: 'e1' }, token)).status, 429);
});
test('secret rotation invalidates existing sessions and internal errors expose no details', async () => {
  let secret = password;
  const service = createService({ getPassword: async () => secret, repository: { events: async () => [], context: async () => { throw new Error('private internal detail'); } } });
  const { token } = (await call(service, { action: 'login', password })).body;
  const error = await call(service, { action: 'context', eventId: 'e1' }, token);
  assert.deepEqual(error.body, { error: 'SERVICE_UNAVAILABLE' });
  assert.equal(error.headers['Cache-Control'], 'no-store, private');
  secret = 'otra-clave-ficticia-con-32-caracteres';
  assert.equal((await call(service, { action: 'context', eventId: 'e1' }, token)).status, 401);
});
test('invalid calendar night and unauthorized detail paths fail before data reads', async () => {
  const { service, reads } = setup();
  const { token } = (await call(service, { action: 'login', password })).body;
  for (const night of ['2026-99-99', '2026-02-31', '../secret', null]) {
    assert.equal((await call(service, { action: 'roomDetail', eventId: 'e1', versionId: 'v1', roomId: 'r1', night }, token)).status, 400);
  }
  assert.equal((await call(service, { action: 'activityDetail', eventId: 'e1', versionId: 'v1', activityId: 'a1', group: 'all' }, token)).status, 400);
  assert.deepEqual(reads, []);
});
