import { response as baztangoSyncResponse } from 'wix-http-functions';
import baztangoSyncData from 'wix-data';
import { secrets as baztangoSyncSecrets } from 'wix-secrets-backend.v2';
import { elevate as baztangoSyncElevate } from 'wix-auth';
import { createSyncService } from 'backend/baztango/sync-service';
import { createSyncRepository } from 'backend/baztango/sync-repository';

const baztangoSyncGetSecret = baztangoSyncElevate(baztangoSyncSecrets.getSecretValue);
const baztangoSyncService = createSyncService({
  repository: createSyncRepository(baztangoSyncData, {
    BTEventos: 'Import1', BTVersiones: 'Import2', BTReservas: 'Import3', BTPersonas: 'Import4',
    BTPagos: 'Import5', BTImputaciones: 'Import6', BTActividades: 'Import7', BTParticipaciones: 'Import8',
    BTHabitaciones: 'Import9', BTEstancias: 'Import10', BTCajas: 'Import11', BTMovimientos: 'Import12',
    BTGastos: 'Import13', BTSolicitudes: 'Import14'
  }, { onStep: (step, collection, count) => console.info('BAZTANGO_SYNC', step, collection, count) }),
  getAdminSecret: async () => {
    const secret = await baztangoSyncGetSecret('baztango-reservations-export-token');
    return typeof secret === 'string' ? secret : secret.value;
  }
});

export async function post_baztangoSync(request) {
  let body;
  try { body = await request.body.text(); }
  catch {
    return baztangoSyncResponse({ status: 400, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ ok: false, error: 'INVALID_BODY' }) });
  }
  const result = await baztangoSyncService({ method: 'POST', headers: request.headers, body });
  return baztangoSyncResponse({ status: result.status, headers: result.headers, body: JSON.stringify(result.body) });
}
