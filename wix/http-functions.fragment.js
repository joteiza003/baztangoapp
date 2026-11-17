import { response } from 'wix-http-functions';
import wixData from 'wix-data';
import { secrets } from 'wix-secrets-backend.v2';
import { elevate } from 'wix-auth';
import { createService } from 'backend/baztango/service';
import { createRepository } from 'backend/baztango/repository';

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

async function baztangoHandle(request, method) {
  let body = '';
  if (method === 'POST') {
    try { body = await request.body.text(); } catch { return response({ status: 400, headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'INVALID_BODY' }) }); }
  }
  const result = await baztangoService({ method, ip: request.ip, origin: request.headers.origin || request.headers.Origin || '', authorization: request.headers.authorization || request.headers.Authorization || '', body });
  return response({ status: result.status, headers: result.headers, body: result.body === null ? '' : JSON.stringify(result.body) });
}

export function post_baztango(request) { return baztangoHandle(request, 'POST'); }
export function options_baztango(request) { return baztangoHandle(request, 'OPTIONS'); }
