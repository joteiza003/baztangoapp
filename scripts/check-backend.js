import assert from 'node:assert/strict';
import { config } from '../docs/config.js';

assert.ok(config.apiUrl, 'Falta configurar apiUrl');
for (const probe of [
  { name: 'preflight', method: 'OPTIONS', origin: 'https://joteiza003.github.io', status: 204 },
  { name: 'anonymous', method: 'POST', origin: 'https://joteiza003.github.io', status: 401 },
  { name: 'foreign-origin', method: 'POST', origin: 'https://example.invalid', status: 403 }
]) {
  const result = await fetch(config.apiUrl, {
    method: probe.method,
    redirect: 'error',
    headers: {
      Origin: probe.origin,
      'Content-Type': 'application/json',
      ...(probe.method === 'OPTIONS' ? {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type'
      } : {})
    },
    ...(probe.method === 'POST' ? { body: JSON.stringify({ action: 'context', eventId: 'connection-check' }) } : {})
  });
  assert.equal(result.status, probe.status, probe.name);
  assert.ok(result.headers.get('cache-control')?.includes('no-store'), probe.name);
  assert.equal(result.headers.get('access-control-allow-origin'), probe.name === 'foreign-origin' ? null : 'https://joteiza003.github.io');
  if (probe.method === 'POST') assert.deepEqual(await result.json(), { error: 'ACCESS_DENIED' });
  console.log(`${probe.name}: HTTP ${result.status}, acceso y caché verificados`);
}
console.log('Backend Wix accesible. No se han enviado contraseñas ni consultado datos privados.');
