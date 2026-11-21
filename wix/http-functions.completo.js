import wixData from 'wix-data';
import { getSecret } from 'wix-secrets-backend';
import { badRequest, forbidden, ok, response, serverError } from 'wix-http-functions';
import { secrets } from 'wix-secrets-backend.v2';
import { elevate } from 'wix-auth';
import { createService } from 'backend/baztango/service';
import { createRepository } from 'backend/baztango/repository';
import {
  buildBaztangoPreviewHtml,
  buildBaztangoWizardHtml
} from '../public/baztangoInlineHtml';
import { buildJbSitePremiumPageHtml } from '../public/jbSitePremiumInlineHtml';
import {
  baztangoSeoImageBase64,
  baztangoSeoImageMimeType
} from './baztangoSeoImageData';
import {
  JB_SITE_PAGE_KEYS,
  normalizeJbSiteLocale
} from '../public/jbSitePageConfig';
import {
  post_walletGenerate as walletGenerate,
  options_walletGenerate as walletOptions,
  get_walletDownload as walletDownload,
  post_walletSync as walletSync
} from 'backend/walletApi';

const BAZTANGO_RESERVATIONS_COLLECTION_ID = 'BaztangoReservations';
const BAZTANGO_EXPORT_SECRET_NAME = 'baztango-reservations-export-token';
const DEFAULT_EXPORT_PAGE_SIZE = 100;
const MAX_EXPORT_PAGE_SIZE = 1000;
const DATA_OPTIONS = {
  suppressAuth: true,
  suppressHooks: true
};

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Baztango-Token'
};

const IMAGE_HEADERS = {
  'Content-Type': baztangoSeoImageMimeType,
  'Cache-Control': 'public, max-age=31536000, immutable',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Baztango-Token'
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Baztango-Token'
};

const baztangoGetSecret = elevate(secrets.getSecretValue);
const baztangoService = createService({
  repository: createRepository(wixData, {
    BTEventos: 'Import1', BTVersiones: 'Import2', BTReservas: 'Import3', BTPersonas: 'Import4',
    BTPagos: 'Import5', BTImputaciones: 'Import6', BTActividades: 'Import7', BTParticipaciones: 'Import8',
    BTHabitaciones: 'Import9', BTEstancias: 'Import10', BTCajas: 'Import11', BTMovimientos: 'Import12',
    BTGastos: 'Import13', BTSolicitudes: 'Import14'
  }),
  getPassword: async () => {
    const secret = await baztangoGetSecret('BAZTANGO_APP_ACCESS_PASSWORD');
    return typeof secret === 'string' ? secret : secret.value;
  }
});

export function get_baztangoApp(request) {
  return serveBaztangoHtml({
    title: 'No se ha podido servir la portada de Baztango.',
    buildHtml: () => buildBaztangoPreviewHtml(resolveRequestLanguage(request))
  });
}

export function get_baztangoWizard(request) {
  return serveBaztangoHtml({
    title: 'No se ha podido servir el formulario de reserva.',
    buildHtml: () => buildBaztangoWizardHtml(resolveRequestLanguage(request))
  });
}

export function get_jbSitePage(request) {
  const locale = resolveRequestLanguage(request);
  const pageKey = resolveJbSitePageKey(request);

  return serveHtml({
    title: 'No se ha podido servir esta pagina.',
    buildHtml: () => buildJbSitePremiumPageHtml(pageKey, locale)
  });
}

export function get_baztangoSeoImage() {
  try {
    return ok({
      headers: IMAGE_HEADERS,
      body: Buffer.from(baztangoSeoImageBase64, 'base64')
    });
  } catch (error) {
    return serverError({
      headers: HTML_HEADERS,
      body: buildErrorHtml('No se ha podido servir la imagen SEO de Baztango.', error)
    });
  }
}

export function options_baztangoReservationsExport() {
  return response({ status: 204, headers: JSON_HEADERS });
}

export function options_baztangoReservationsSeed() {
  return response({ status: 204, headers: JSON_HEADERS });
}

export async function get_baztangoReservationsExport(request) {
  try {
    const isAuthorized = await validateBaztangoExportAuthorization(request);

    if (!isAuthorized) {
      return forbidden({
        headers: JSON_HEADERS,
        body: JSON.stringify({ ok: false, error: 'No autorizado.' })
      });
    }

    const exportMode = resolveExportMode(request);

    if (exportMode === 'page') {
      const pagePayload = await buildReservationsPagePayload(request);
      return jsonOk(pagePayload);
    }

    if (exportMode === 'full') {
      const exportPayload = await buildReservationsFullExportPayload();
      return jsonOk(exportPayload);
    }

    return badRequest({
      headers: JSON_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'El parametro "mode" debe ser "full" o "page".'
      })
    });
  } catch (error) {
    return serverError({
      headers: JSON_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'No se ha podido exportar la BD de Baztango.',
        details: stringifyError(error)
      })
    });
  }
}

export async function post_baztangoReservationsSeed(request) {
  try {
    const isAuthorized = await validateBaztangoExportAuthorization(request);

    if (!isAuthorized) {
      return forbidden({
        headers: JSON_HEADERS,
        body: JSON.stringify({ ok: false, error: 'No autorizado.' })
      });
    }

    const body = await parseJsonBody(request);
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return badRequest({
        headers: JSON_HEADERS,
        body: JSON.stringify({
          ok: false,
          error: 'Debes enviar un array "items" con al menos una reserva.'
        })
      });
    }

    await removeExistingSeedReservations();

    const insertedIds = [];

    for (const rawItem of items) {
      const reservationItem = normalizeSeedReservationItem(rawItem);
      const inserted = await wixData.save(
        BAZTANGO_RESERVATIONS_COLLECTION_ID,
        reservationItem,
        DATA_OPTIONS
      );
      insertedIds.push(String(inserted?._id || reservationItem._id || ''));
    }

    return jsonOk({
      ok: true,
      mode: 'seed',
      collectionId: BAZTANGO_RESERVATIONS_COLLECTION_ID,
      insertedCount: insertedIds.length,
      insertedIds
    });
  } catch (error) {
    return serverError({
      headers: JSON_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'No se han podido sembrar reservas de prueba.',
        details: stringifyError(error)
      })
    });
  }
}

async function removeExistingSeedReservations() {
  let queryResult = await wixData
    .query(BAZTANGO_RESERVATIONS_COLLECTION_ID)
    .eq('sourceChannel', 'seed_test')
    .limit(MAX_EXPORT_PAGE_SIZE)
    .find(DATA_OPTIONS);

  while (queryResult) {
    for (const item of queryResult.items || []) {
      const itemId = String(item && item._id ? item._id : '').trim();
      if (!itemId) continue;
      await wixData.remove(BAZTANGO_RESERVATIONS_COLLECTION_ID, itemId, DATA_OPTIONS);
    }

    if (!(typeof queryResult.hasNext === 'function' && queryResult.hasNext())) break;
    queryResult = await queryResult.next();
  }
}

function serveBaztangoHtml({ title, buildHtml }) {
  return serveHtml({ title, buildHtml });
}

function serveHtml({ title, buildHtml }) {
  try {
    return ok({ headers: HTML_HEADERS, body: buildHtml() });
  } catch (error) {
    return serverError({ headers: HTML_HEADERS, body: buildErrorHtml(title, error) });
  }
}

function resolveRequestLanguage(request) {
  return normalizeJbSiteLocale(resolveQueryValue(request, 'lang'));
}

function resolveJbSitePageKey(request) {
  const rawPageKey = resolveQueryValue(request, 'page');
  const supportedPageKeys = new Set(['home', ...JB_SITE_PAGE_KEYS]);
  return supportedPageKeys.has(rawPageKey) ? rawPageKey : 'home';
}

function resolveQueryValue(request, key) {
  const query = request && request.query ? request.query : {};
  const value = query[key];
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === 'string' && firstValue ? firstValue : '';
}

function resolveExportMode(request) {
  return String(resolveQueryValue(request, 'mode') || 'full').trim().toLowerCase();
}

async function validateBaztangoExportAuthorization(request) {
  const configuredToken = String(await getSecret(BAZTANGO_EXPORT_SECRET_NAME) || '').trim();
  const requestToken = resolveBaztangoExportToken(request);

  if (!configuredToken) {
    throw new Error(`No existe el secreto "${BAZTANGO_EXPORT_SECRET_NAME}" en Wix Secrets Manager.`);
  }

  return requestToken && requestToken === configuredToken;
}

function resolveBaztangoExportToken(request) {
  const authorizationHeader = resolveHeaderValue(request, 'authorization');
  const directTokenHeader = resolveHeaderValue(request, 'x-baztango-token');

  if (authorizationHeader) {
    const bearerMatch = authorizationHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch && bearerMatch[1]) return bearerMatch[1].trim();
  }

  return directTokenHeader;
}

function resolveHeaderValue(request, key) {
  const headers = request && request.headers ? request.headers : null;
  if (!headers) return '';

  if (typeof headers.get === 'function') {
    return String(headers.get(key) || headers.get(key.toLowerCase()) || '').trim();
  }

  const directValue = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
  if (Array.isArray(directValue)) return String(directValue[0] || '').trim();
  return String(directValue || '').trim();
}

async function buildReservationsPagePayload(request) {
  const limit = resolvePageSize(request);
  const offset = resolveNonNegativeInteger(resolveQueryValue(request, 'offset'), 0);
  const queryResult = await wixData
    .query(BAZTANGO_RESERVATIONS_COLLECTION_ID)
    .ascending('_createdDate')
    .skip(offset)
    .limit(limit)
    .find(DATA_OPTIONS);

  return {
    ok: true,
    mode: 'page',
    collectionId: BAZTANGO_RESERVATIONS_COLLECTION_ID,
    totalCount: Number(queryResult.totalCount || 0),
    offset,
    pageSize: limit,
    returnedCount: queryResult.items.length,
    hasNext: Boolean(typeof queryResult.hasNext === 'function' ? queryResult.hasNext() : false),
    items: queryResult.items.map(mapExportItem)
  };
}

async function buildReservationsFullExportPayload() {
  let queryResult = await wixData
    .query(BAZTANGO_RESERVATIONS_COLLECTION_ID)
    .ascending('_createdDate')
    .limit(MAX_EXPORT_PAGE_SIZE)
    .find(DATA_OPTIONS);

  const items = [];

  while (queryResult) {
    items.push(...queryResult.items.map(mapExportItem));
    if (!(typeof queryResult.hasNext === 'function' && queryResult.hasNext())) break;
    queryResult = await queryResult.next();
  }

  return {
    ok: true,
    mode: 'full',
    collectionId: BAZTANGO_RESERVATIONS_COLLECTION_ID,
    exportedAt: new Date().toISOString(),
    totalCount: items.length,
    items
  };
}

function mapExportItem(item) {
  return {
    _id: String(item && item._id ? item._id : ''),
    editionYear: String(item && item.editionYear ? item.editionYear : item && item.payload && item.payload.editionYear ? item.payload.editionYear : ''),
    baseId: String(item && item.baseId ? item.baseId : ''),
    reservationStatus: String(item && item.reservationStatus ? item.reservationStatus : ''),
    paymentStatus: String(item && item.paymentStatus ? item.paymentStatus : ''),
    idPackCode: String(item && item.idPackCode ? item.idPackCode : ''),
    idPackSequence: Number(item && item.idPackSequence ? item.idPackSequence : 0),
    reservationMode: String(item && item.reservationMode ? item.reservationMode : ''),
    reservationModeLabel: String(item && item.reservationModeLabel ? item.reservationModeLabel : ''),
    attendeeCount: Number(item && item.attendeeCount ? item.attendeeCount : 0),
    totalEstimate: Number(item && item.totalEstimate ? item.totalEstimate : 0),
    primaryEmail: String(item && item.primaryEmail ? item.primaryEmail : ''),
    primaryPhone: String(item && item.primaryPhone ? item.primaryPhone : ''),
    displayName: String(item && item.displayName ? item.displayName : ''),
    sourceChannel: String(item && item.sourceChannel ? item.sourceChannel : ''),
    generatedAt: toIsoString(item && item.generatedAt),
    lastStatusChangeAt: toIsoString(item && item.lastStatusChangeAt),
    createdAt: toIsoString(item && item._createdDate),
    updatedAt: toIsoString(item && item._updatedDate),
    payload: cloneValue(item && item.payload ? item.payload : null)
  };
}

function resolvePageSize(request) {
  const requestedValue = resolveNonNegativeInteger(resolveQueryValue(request, 'pageSize'), DEFAULT_EXPORT_PAGE_SIZE);
  return Math.min(Math.max(requestedValue, 1), MAX_EXPORT_PAGE_SIZE);
}

function resolveNonNegativeInteger(rawValue, fallbackValue) {
  const parsedValue = Number.parseInt(String(rawValue || ''), 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallbackValue;
}

function jsonOk(payload) {
  return ok({ headers: JSON_HEADERS, body: JSON.stringify(payload) });
}

async function parseJsonBody(request) {
  if (!request || !request.body || typeof request.body.json !== 'function') return {};
  return request.body.json();
}

function normalizeSeedReservationItem(rawItem) {
  const item = cloneValue(rawItem || {}) || {};
  const payload = cloneValue(item.payload || {}) || {};
  const fallbackBaseId = String(item.baseId || payload.idBase || payload.reservaGlobal || '').trim();

  if (!fallbackBaseId) {
    throw new Error('Cada reserva de prueba debe incluir baseId o payload.idBase.');
  }

  const generatedAt = toDateOrNow(item.generatedAt || payload.generatedAt);
  const lastStatusChangeAt = toDateOrNow(item.lastStatusChangeAt || generatedAt);
  const editionYear = String(
    item.editionYear || payload.editionYear || resolveEditionYearFromText(fallbackBaseId) || generatedAt.getUTCFullYear()
  ).trim();

  return {
    _id: String(item._id || fallbackBaseId).trim(),
    editionYear,
    baseId: fallbackBaseId,
    reservationStatus: String(item.reservationStatus || payload.status || 'pending_review').trim(),
    paymentStatus: String(item.paymentStatus || payload.paymentStatus || 'pending').trim(),
    idPackCode: String(item.idPackCode || payload.idPackCode || '').trim(),
    idPackSequence: Number(item.idPackSequence || payload.idPackSequence || 0),
    reservationMode: String(item.reservationMode || payload.reservationMode || '').trim(),
    reservationModeLabel: String(item.reservationModeLabel || payload.reservationModeLabel || '').trim(),
    attendeeCount: Number(item.attendeeCount || payload.attendeeCount || 0),
    totalEstimate: Number(item.totalEstimate || payload.totalEstimate || 0),
    primaryEmail: String(item.primaryEmail || payload.primaryEmail || '').trim(),
    primaryPhone: String(item.primaryPhone || payload.primaryPhone || '').trim(),
    displayName: String(item.displayName || payload.displayName || fallbackBaseId).trim(),
    sourceChannel: String(item.sourceChannel || payload.sourceChannel || 'seed_test').trim(),
    generatedAt,
    lastStatusChangeAt,
    payload: {
      ...payload,
      editionYear,
      idBase: String(payload.idBase || fallbackBaseId).trim(),
      reservaGlobal: String(payload.reservaGlobal || fallbackBaseId).trim(),
      generatedAt: toIsoString(payload.generatedAt || generatedAt),
      paymentStatus: String(payload.paymentStatus || item.paymentStatus || 'pending').trim(),
      status: String(payload.status || item.reservationStatus || 'pending_review').trim()
    }
  };
}

function resolveEditionYearFromText(value) {
  const match = String(value || '').match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/);
  return match && match[1] ? match[1] : '';
}

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function toDateOrNow(value) {
  const candidate = value ? new Date(value) : null;
  return candidate && !Number.isNaN(candidate.getTime()) ? candidate : new Date();
}

function toIsoString(value) {
  const candidate = value instanceof Date ? value : value ? new Date(value) : null;
  return candidate && !Number.isNaN(candidate.getTime()) ? candidate.toISOString() : '';
}

function stringifyError(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return [error.message, error.code, error.name].filter(Boolean).join(' ');
}

function buildErrorHtml(title, error) {
  const message = escapeHtml(String(error && error.message ? error.message : error));

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html, body {
        margin: 0;
        min-height: 100%;
        background: #f7f3ee;
        color: #5b2418;
        font-family: Georgia, "Times New Roman", serif;
      }
      body {
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        max-width: 620px;
        border: 1px solid rgba(91, 36, 24, 0.18);
        border-radius: 16px;
        background: #ffffff;
        box-shadow: 0 10px 30px rgba(66, 41, 33, 0.08);
        padding: 20px 24px;
      }
      strong {
        display: block;
        margin-bottom: 8px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <strong>${escapeHtml(title)}</strong>
      <div>${message}</div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function options_baztangoReservationsDelete() {
  return response({ status: 204, headers: JSON_HEADERS });
}

export async function post_baztangoReservationsDelete(request) {
  try {
    const isAuthorized = await validateBaztangoExportAuthorization(request);

    if (!isAuthorized) {
      return forbidden({
        headers: JSON_HEADERS,
        body: JSON.stringify({ ok: false, error: 'No autorizado.' })
      });
    }

    const body = await parseJsonBody(request);
    const baseId = String(body?.baseId || '').trim();

    if (!baseId) {
      return badRequest({
        headers: JSON_HEADERS,
        body: JSON.stringify({
          ok: false,
          error: 'Debes enviar "baseId" en el cuerpo de la peticion.'
        })
      });
    }

    const queryResult = await wixData
      .query(BAZTANGO_RESERVATIONS_COLLECTION_ID)
      .eq('baseId', baseId)
      .limit(MAX_EXPORT_PAGE_SIZE)
      .find(DATA_OPTIONS);

    const items = queryResult.items || [];
    if (!items.length) return jsonOk({ ok: true, baseId, found: false, removedCount: 0 });

    for (const item of items) {
      const itemId = String(item && item._id ? item._id : '').trim();
      if (itemId) await wixData.remove(BAZTANGO_RESERVATIONS_COLLECTION_ID, itemId, DATA_OPTIONS);
    }

    return jsonOk({ ok: true, baseId, found: true, removedCount: items.length });
  } catch (error) {
    return serverError({
      headers: JSON_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'No se ha podido borrar la reserva de Baztango.',
        details: stringifyError(error)
      })
    });
  }
}

export function post_walletGenerate(request) {
  return walletGenerate(request);
}

export function options_walletGenerate(request) {
  return walletOptions(request);
}

export function get_walletDownload(request) {
  return walletDownload(request);
}

export function post_walletSync(request) {
  return walletSync(request);
}

async function baztangoHandle(request, method) {
  let body = '';

  if (method === 'POST') {
    try {
      body = await request.body.text();
    } catch {
      return response({
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({ error: 'INVALID_BODY' })
      });
    }
  }

  const result = await baztangoService({
    method,
    ip: request.ip,
    origin: resolveHeaderValue(request, 'origin'),
    authorization: resolveHeaderValue(request, 'authorization'),
    body
  });

  return response({
    status: result.status,
    headers: result.headers,
    body: result.body === null ? '' : JSON.stringify(result.body)
  });
}

export function post_baztango(request) {
  return baztangoHandle(request, 'POST');
}

export function options_baztango(request) {
  return baztangoHandle(request, 'OPTIONS');
}
