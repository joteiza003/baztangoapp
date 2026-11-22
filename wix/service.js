import { createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto';

export const ALLOWED_ORIGIN = 'https://joteiza003.github.io';
const resources = new Set(['personas', 'solicitudes', 'reservas', 'pagos', 'imputaciones', 'actividades', 'participaciones', 'habitaciones', 'estancias', 'cajas', 'movimientos', 'gastos']);
const filterFields = new Set(['state', 'paymentState', 'arrivalState', 'danceRole', 'eventDate', 'category', 'activityRef', 'attendanceState', 'roomType', 'roomRef', 'businessDate', 'cashSessionRef', 'personRef', 'reservationRef', 'paymentRef', 'expenseRef', 'needsReview', 'hasDataIssues', 'eligible', 'packageName', 'isTeam', 'isGuest', 'country', 'requestedPackage', 'requestedRole', 'reason', 'paymentDate', 'kind', 'method', 'destination', 'receivedBy']);
class ServiceError extends Error {
  constructor(status, code, retryAfter) {
    super(code);
    Object.assign(this, { status, code, retryAfter });
  }
}
export function fail(status, code, retryAfter) { throw new ServiceError(status, code, retryAfter); }
export function normalize(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' '); }
function equal(left, right) {
  return timingSafeEqual(createHash('sha256').update(left).digest(), createHash('sha256').update(right).digest());
}
function identifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) fail(400, 'INVALID_QUERY');
  return value;
}
export function createService({ repository, getPassword, now = Date.now }) {
  let passwordRequest = null;
  function readPassword() {
    if (!passwordRequest) passwordRequest = Promise.resolve().then(getPassword).finally(() => { passwordRequest = null; });
    return passwordRequest;
  }
  return async function handle(request) {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff', 'X-Baztango-Backend': 'no-request-limits-1' };
    let readingData = false;
    try {
      if (request.origin !== ALLOWED_ORIGIN) fail(403, 'ACCESS_DENIED');
      headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
      headers['Access-Control-Expose-Headers'] = 'Retry-After';
      if (request.method === 'OPTIONS') return { status: 204, headers, body: null };
      if (request.method !== 'POST') fail(405, 'METHOD_NOT_ALLOWED');
      const raw = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
      if (!raw || raw.length > 4000) fail(413, 'INVALID_BODY');
      let body;
      try { body = JSON.parse(raw); } catch { fail(400, 'INVALID_BODY'); }
      if (!body || Array.isArray(body) || typeof body !== 'object') fail(400, 'INVALID_BODY');
      const token = request.authorization?.startsWith('Bearer ') ? request.authorization.slice(7) : '';
      if (body.action !== 'login' && (!token || token.length > 1000 || token.split('.').length !== 2)) fail(401, 'ACCESS_DENIED');
      const password = await readPassword();
      if (typeof password !== 'string' || password.length < 12) fail(503, 'CONFIGURATION_PENDING');
      const sign = (payload) => createHmac('sha256', password).update(`baztango-session-v1:${payload}`).digest('base64url');
      if (body.action === 'login') {
        if (typeof body.password !== 'string' || !equal(body.password, password)) fail(401, 'ACCESS_DENIED');
        const expiresAt = now() + 900000;
        const payload = Buffer.from(JSON.stringify({ exp: expiresAt, nonce: randomBytes(24).toString('hex'), aud: ALLOWED_ORIGIN })).toString('base64url');
        readingData = true;
        return { status: 200, headers, body: { token: `${payload}.${sign(payload)}`, expiresAt, events: await repository.events() } };
      }
      const [payload, signature, extra] = token.split('.');
      if (extra || !payload || !signature || !equal(signature, sign(payload))) fail(401, 'ACCESS_DENIED');
      let claims;
      try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { fail(401, 'ACCESS_DENIED'); }
      if (claims.aud !== ALLOWED_ORIGIN || !Number.isSafeInteger(claims.exp) || claims.exp <= now() || claims.exp > now() + 900000) fail(401, 'ACCESS_DENIED');
      const eventId = identifier(body.eventId);
      readingData = true;
      if (body.action === 'context') return { status: 200, headers, body: await repository.context(eventId) };
      const versionId = identifier(body.versionId);
      let result;
      if (body.action === 'list') {
        const { resource, search = '', filters = {}, page = 0, limit = 25, order = 'default' } = body;
        if (!resources.has(resource) || typeof search !== 'string' || search.length > 100 || !Number.isInteger(page) || page < 0 || page > 200 || !Number.isInteger(limit) || limit < 1 || limit > 100 || !filters || Array.isArray(filters) || typeof filters !== 'object') fail(400, 'INVALID_QUERY');
        for (const [field, value] of Object.entries(filters)) {
          if (!filterFields.has(field) || (['eligible', 'needsReview', 'hasDataIssues', 'isTeam', 'isGuest'].includes(field) ? typeof value !== 'boolean' : typeof value !== 'string' || value.length > 100)) fail(400, 'INVALID_QUERY');
        }
        if (!['default', 'name', 'pendingDesc', 'date'].includes(order)) fail(400, 'INVALID_QUERY');
        result = await repository.list({ eventId, versionId, resource, search: normalize(search), filters, page, limit, order });
      } else if (body.action === 'summary') result = await repository.summary(eventId, versionId);
      else if (body.action === 'overview') {
        if (typeof repository.overview !== 'function') fail(400, 'INVALID_QUERY');
        result = await repository.overview(eventId, versionId);
      }
      else if (body.action === 'detail') result = await repository.detail(eventId, versionId, identifier(body.personId));
      else if (body.action === 'requestDetail') result = await repository.requestDetail(eventId, versionId, identifier(body.requestId));
      else if (body.action === 'roomDetail') {
        const nightDate = new Date(`${body.night}T00:00:00Z`);
        if (typeof body.night !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.night) || !Number.isFinite(nightDate.getTime()) || nightDate.toISOString().slice(0, 10) !== body.night) fail(400, 'INVALID_QUERY');
        result = await repository.roomDetail(eventId, versionId, identifier(body.roomId), body.night);
      } else if (body.action === 'activityDetail') {
        const { group = 'entitled', search = '', page = 0, limit = 25 } = body;
        if (!['entitled', 'registered', 'missing'].includes(group) || typeof search !== 'string' || search.length > 100 || !Number.isInteger(page) || page < 0 || page > 200 || !Number.isInteger(limit) || limit < 1 || limit > 100) fail(400, 'INVALID_QUERY');
        result = await repository.activityDetail(eventId, versionId, identifier(body.activityId), { group, search: normalize(search), page, limit });
      }
      else fail(400, 'INVALID_QUERY');
      return { status: 200, headers, body: result };
    } catch (error) {
      const known = error instanceof ServiceError;
      const upstreamLimit = !known && (Number(error.status || error.httpStatus || error.response?.status) === 429 || ['RATE_LIMIT', 'TOO_MANY_REQUESTS', 'RESOURCE_EXHAUSTED'].includes(error.code));
      const status = known ? error.status : upstreamLimit ? 429 : 503;
      const code = known ? error.code : upstreamLimit ? readingData ? 'DATA_SERVICE_BUSY' : 'ACCESS_SERVICE_BUSY' : 'SERVICE_UNAVAILABLE';
      const body = { error: code };
      if (!known && !upstreamLimit) {
        body.diagnostic = /unknown encoding|unsupported encoding/i.test(String(error.message)) ? 'UNSUPPORTED_ENCODING' : typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{0,50}$/.test(error.code) ? error.code : 'BACKEND_ERROR';
        body.stage = readingData ? 'data' : 'access';
      }
      if (status === 429) {
        const retryAfter = known ? error.retryAfter || 60 : 60;
        headers['Retry-After'] = String(retryAfter);
        body.retryAfter = retryAfter;
      }
      return { status, headers, body };
    }
  };
}
