import { schema, project } from './schema.js';
import { fail, normalize } from './service.js';
import { createSnapshotQuery } from './snapshot-query.js';

const options = { suppressAuth: true, consistentRead: true };
const refId = (value) => typeof value === 'object' && value ? value._id : value;
const pick = (row, fields) => Object.fromEntries(fields.split(' ').filter((field) => Object.hasOwn(row, field)).map((field) => [field, row[field]]));
const searchFields = { personas: 'searchText', solicitudes: 'searchText', reservas: 'reservationCode', pagos: 'paymentCode', actividades: 'name', habitaciones: 'unitCode', gastos: 'concept', movimientos: 'concept', cajas: 'businessDate' };
const references = { reservationRef: 'reservas', personRef: 'personas', paymentRef: 'pagos', expenseRef: 'gastos', activityRef: 'actividades', roomRef: 'habitaciones', cashSessionRef: 'cajas' };

export function createRepository(data, collectionIds = {}) {
  const collectionId = (name) => collectionIds[name] || name;
  const base = (resource, eventId, versionId) => createSnapshotQuery(data, schema[resource][0], collectionId(schema[resource][0]), eventId, versionId);
  async function getScoped(resource, id, eventId, versionId) {
    const result = await base(resource, eventId, versionId).eq('_id', id).limit(1).find(options);
    const row = result.items[0];
    if (!row || refId(row.eventRef) !== eventId || refId(row.versionRef) !== versionId) fail(409, 'INVALID_REFERENCE');
    return row;
  }
  async function getManyScoped(resource, ids, eventId, versionId) {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const rows = [];
    for (let offset = 0; offset < unique.length; offset += 100) {
      const result = await base(resource, eventId, versionId).hasSome('_id', unique.slice(offset, offset + 100)).limit(100).find(options);
      rows.push(...result.items);
    }
    if (rows.length !== unique.length) fail(409, 'INVALID_REFERENCE');
    return rows;
  }
  async function context(eventId, versionId) {
    const event = await data.get(collectionId('BTEventos'), eventId, options);
    if (!event?.isActive) fail(403, 'ACCESS_DENIED');
    const current = refId(event.currentVersionRef);
    if (!current) fail(409, 'NO_PUBLISHED_DATA');
    if (versionId && current !== versionId) fail(409, 'VERSION_EXPIRED');
    const version = await data.get(collectionId('BTVersiones'), current, options);
    if (!version || refId(version.eventRef) !== eventId || version.state !== 'ready' || !version.publishedAt || version.schemaVersion !== 1) fail(409, 'NO_PUBLISHED_DATA');
    return { event: pick(event, '_id title eventKey year startDate endDate timeZone currency warningMinutes staleMinutes'), version: pick(version, '_id title capturedAt publishedAt schemaVersion personCount paymentCount recordCount') };
  }
  async function pageRows(resource, eventId, versionId, filters = {}, limit = 200) {
    let query = base(resource, eventId, versionId);
    for (const [field, value] of Object.entries(filters)) query = query.eq(field, value);
    const result = await query.ascending('_id').limit(limit).find(options);
    if (result.totalCount > limit) fail(422, 'DETAIL_LIMIT');
    return result.items;
  }
  async function queryList({ resource, eventId, versionId, search, filters, page, limit, order = 'default' }) {
    await context(eventId, versionId);
    const allowed = new Set(schema[resource][1].split(' '));
    let query = base(resource, eventId, versionId);
    for (const [field, value] of Object.entries(filters)) {
      if (resource === 'pagos' && field === 'personRef') {
        await getScoped('personas', value, eventId, versionId);
        const allocations = await pageRows('imputaciones', eventId, versionId, { personRef: value });
        const ids = [...new Set(allocations.map((row) => refId(row.paymentRef)).filter(Boolean))];
        if (!ids.length) return { items: [], total: 0, page, limit };
        query = query.hasSome('_id', ids);
        continue;
      }
      if (!allowed.has(field)) fail(400, 'INVALID_QUERY');
      if (references[field] && value) await getScoped(references[field], value, eventId, versionId);
      query = query.eq(field, value);
    }
    if (search) {
      if (!searchFields[resource]) fail(400, 'SEARCH_UNAVAILABLE');
      if (searchFields[resource] === 'searchText') query = query.contains('searchText', search);
    }
    const dateFields = { personas: 'arrivedAt', reservas: 'registeredAt', solicitudes: 'priorityAt', pagos: 'paymentDate', actividades: 'eventDate', participaciones: 'firstRegisteredAt', estancias: 'checkInDate', cajas: 'businessDate', movimientos: 'occurredAt', gastos: 'expenseDate' };
    const nameFields = { personas: 'lastName', reservas: 'reservationCode', solicitudes: 'applicantNames', pagos: 'payerName', actividades: 'name', habitaciones: 'unitCode', movimientos: 'concept', gastos: 'concept' };
    if (order === 'name' && nameFields[resource]) query = query.ascending(nameFields[resource], '_id');
    else if (order === 'date' && dateFields[resource]) query = query.ascending(dateFields[resource], '_id');
    else if (order === 'pendingDesc' && allowed.has('pendingCents')) query = query.descending('pendingCents').ascending('_id');
    else if (resource === 'personas') query = query.ascending('lastName', 'firstName', 'personCode', '_id');
    else if (resource === 'solicitudes') query = query.ascending('priorityAt', 'requestCode', '_id');
    else if (resource === 'actividades') query = query.ascending('eventDate', 'sortOrder', '_id');
    else query = query.ascending('_id');
    if (search && searchFields[resource] !== 'searchText') {
      const result = await query.limit(1000).find(options);
      if (result.totalCount > 1000) fail(422, 'SEARCH_LIMIT');
      const selected = result.items.filter((row) => normalize(resource === 'pagos' ? [row.paymentCode, row.payerName, row.externalReference].filter(Boolean).join(' ') : String(row[searchFields[resource]] || '')).includes(search));
      await context(eventId, versionId);
      return { items: selected.slice(page * limit, (page + 1) * limit).map((row) => project(resource, row)), total: selected.length, page, limit };
    }
    const result = await query.skip(page * limit).limit(limit).find(options);
    await context(eventId, versionId);
    return { items: result.items.map((row) => project(resource, row)), total: result.totalCount, page, limit };
  }
  async function summary(eventId, versionId) {
    await context(eventId, versionId);
    const people = [];
    let total = 0;
    do {
      const result = await base('personas', eventId, versionId).ascending('_id').skip(people.length).limit(1000).find(options);
      total = result.totalCount;
      if (total > 10000) fail(422, 'SUMMARY_LIMIT');
      if (!result.items.length && people.length < total) fail(409, 'VERSION_EXPIRED');
      people.push(...result.items);
    } while (people.length < total);
    const accepted = people.filter((person) => person.state === 'accepted');
    let pendingCents = 0;
    for (const person of people) {
      if (!Number.isSafeInteger(person.pendingCents) || person.pendingCents < 0 || !Number.isSafeInteger(pendingCents + person.pendingCents)) { pendingCents = null; break; }
      pendingCents += person.pendingCents;
    }
    const requests = await base('solicitudes', eventId, versionId).ne('state', 'promoted').count(options);
    const stays = [];
    do {
      const result = await base('estancias', eventId, versionId).ascending('_id').skip(stays.length).limit(1000).find(options);
      if (result.totalCount > 10000) fail(422, 'SUMMARY_LIMIT');
      if (!result.items.length && stays.length < result.totalCount) fail(409, 'VERSION_EXPIRED');
      stays.push(...result.items);
      if (stays.length >= result.totalCount) break;
    } while (true);
    const acceptedIds = new Set(accepted.map((person) => person._id));
    const housed = new Set(stays.filter((stay) => stay.state === 'reserved' && acceptedIds.has(refId(stay.personRef))).map((stay) => refId(stay.personRef))).size;
    function sumKnown(field) {
      let total = 0;
      for (const person of people) {
        if (!Number.isSafeInteger(person[field]) || !Number.isSafeInteger(total + person[field])) return null;
        total += person[field];
      }
      return total;
    }
    await context(eventId, versionId);
    return { accepted: accepted.length, arrived: accepted.filter((person) => person.arrivalState === 'registered').length, pendingCents, dueCents: sumKnown('dueCents'), paidNetCents: sumKnown('paidNetCents'), refundPendingCents: sumKnown('refundPendingCents'), housed, issues: people.filter((person) => person.hasDataIssues).length, requests };
  }
  async function readAll(resource, eventId, versionId, max) {
    const rows = [];
    let total = 0;
    do {
      const result = await base(resource, eventId, versionId).ascending('_id').skip(rows.length).limit(1000).find(options);
      total = result.totalCount;
      if (total > max) fail(422, 'SUMMARY_LIMIT');
      if (!result.items.length && rows.length < total) fail(409, 'VERSION_EXPIRED');
      rows.push(...result.items);
    } while (rows.length < total);
    return rows;
  }
  const countBy = (rows, key, label = (value) => value) => {
    const counts = new Map();
    for (const row of rows) { const value = label(key(row)); counts.set(value, (counts.get(value) || 0) + 1); }
    return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
  };
  const isoDay = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null);
  const addDays = (day, amount) => new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86400000).toISOString().slice(0, 10);
  // Vista agregada de solo lectura para el panel de control. No añade datos privados: solo recuentos, importes ya proyectados y referencias.
  async function overview(eventId, versionId) {
    const { event } = await context(eventId, versionId);
    const [people, stays, rooms, activities, participations, cashSessions] = await Promise.all([
      readAll('personas', eventId, versionId, 10000), readAll('estancias', eventId, versionId, 10000), readAll('habitaciones', eventId, versionId, 2000),
      readAll('actividades', eventId, versionId, 500), readAll('participaciones', eventId, versionId, 60000), readAll('cajas', eventId, versionId, 1000)
    ]);
    const requests = await base('solicitudes', eventId, versionId).ne('state', 'promoted').count(options);
    const waiting = await base('solicitudes', eventId, versionId).eq('state', 'waiting').count(options);
    const accepted = people.filter((person) => person.state === 'accepted');
    const acceptedIds = new Set(accepted.map((person) => person._id));
    const sumKnown = (field) => {
      let total = 0;
      for (const person of people) {
        if (!Number.isSafeInteger(person[field]) || !Number.isSafeInteger(total + person[field])) return null;
        total += person[field];
      }
      return total;
    };
    let pendingCents = 0;
    for (const person of people) {
      if (!Number.isSafeInteger(person.pendingCents) || person.pendingCents < 0 || !Number.isSafeInteger(pendingCents + person.pendingCents)) { pendingCents = null; break; }
      pendingCents += person.pendingCents;
    }
    const reservedStays = stays.filter((stay) => stay.state === 'reserved' && acceptedIds.has(refId(stay.personRef)));
    const arrived = accepted.filter((person) => person.arrivalState === 'registered');
    const unknown = (value) => value || 'unknown';
    // Programa: derechos y asistencia por actividad, contando personas únicas.
    const byActivity = new Map(activities.map((activity) => [activity._id, { entitled: new Set(), registered: new Set(), issues: new Set() }]));
    const peopleById = new Map(people.map((person) => [person._id, person]));
    for (const row of participations) {
      const bucket = byActivity.get(refId(row.activityRef));
      const personId = refId(row.personRef);
      const person = peopleById.get(personId);
      if (!bucket || !person) continue;
      const entitled = person.state === 'accepted' && row.eligible === true && ['included', 'extra'].includes(row.entitlement);
      const registered = row.attendanceState === 'registered';
      if (entitled) bucket.entitled.add(personId);
      if (registered) bucket.registered.add(personId);
      if (row.needsReview === true || (registered && !entitled)) bucket.issues.add(personId);
    }
    const program = activities.map((activity) => {
      const bucket = byActivity.get(activity._id);
      const missing = [...bucket.entitled].filter((id) => !bucket.registered.has(id)).length;
      return { ...pick(activity, '_id name category eventDate startsAt endsAt timeConfirmed venue capacity sortOrder isGeneralArrival'), entitled: bucket.entitled.size, registered: bucket.registered.size, missing, issues: bucket.issues.size };
    }).sort((a, b) => String(a.eventDate || '').localeCompare(String(b.eventDate || '')) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name || '').localeCompare(String(b.name || '')));
    // Alojamiento: ocupación por noche y unidad con el mismo criterio que roomDetail (estancias no anuladas, salida excluida).
    const live = stays.filter((stay) => stay.state !== 'cancelled');
    const dated = live.filter((stay) => isoDay(stay.checkInDate) && isoDay(stay.checkOutDate) && stay.checkInDate < stay.checkOutDate);
    const unknownDates = live.length - dated.length;
    let first = isoDay(event.startDate); let last = isoDay(event.endDate);
    for (const stay of dated) { const start = stay.checkInDate.slice(0, 10); const end = addDays(stay.checkOutDate.slice(0, 10), -1); if (!first || start < first) first = start; if (!last || end > last) last = end; }
    const nights = [];
    if (first && last) for (let day = first; day <= last && nights.length < 45; day = addDays(day, 1)) nights.push(day);
    const roomIndex = new Map(rooms.map((room, index) => [room._id, index]));
    const grid = rooms.map(() => nights.map(() => 0));
    for (const stay of dated) {
      const row = grid[roomIndex.get(refId(stay.roomRef))];
      if (!row) continue;
      nights.forEach((night, index) => { if (stay.checkInDate.slice(0, 10) <= night && night < stay.checkOutDate.slice(0, 10)) row[index] += 1; });
    }
    const available = rooms.filter((room) => room.isAvailable === true && Number.isSafeInteger(room.capacity) && room.capacity > 0);
    const totalCapacity = available.reduce((sum, room) => sum + room.capacity, 0);
    const lodging = {
      nights: nights.map((night, index) => ({ date: night, assigned: grid.reduce((sum, row) => sum + row[index], 0), capacity: totalCapacity })),
      rooms: rooms.map((room, index) => ({ ...pick(room, '_id unitCode hotelRoomNumber roomType capacity isAvailable area'), occupancy: grid[index] })).sort((a, b) => String(a.hotelRoomNumber || a.unitCode || '').localeCompare(String(b.hotelRoomNumber || b.unitCode || ''), 'es', { numeric: true })),
      unknownDates,
      overCapacityRooms: rooms.filter((room, index) => Number.isSafeInteger(room.capacity) && grid[index].some((count) => count > room.capacity)).length
    };
    const arrivalsByDate = countBy(arrived.filter((person) => isoDay(person.arrivalDate)), (person) => isoDay(person.arrivalDate)).sort((a, b) => a.value.localeCompare(b.value)).slice(0, 31);
    const debtors = accepted.filter((person) => Number.isSafeInteger(person.pendingCents) && person.pendingCents > 0)
      .sort((a, b) => b.pendingCents - a.pendingCents || String(a.fullName || '').localeCompare(String(b.fullName || ''))).slice(0, 8)
      .map((person) => pick(person, '_id fullName personCode packageName pendingCents paymentState'));
    const sessionsWithDifference = cashSessions.filter((session) => Number.isSafeInteger(session.cashDifferenceCents) && session.cashDifferenceCents !== 0).length;
    await context(eventId, versionId);
    return {
      totals: { people: people.length, accepted: accepted.length, cancelled: people.filter((person) => person.state === 'cancelled').length, review: people.filter((person) => person.state === 'review').length, arrived: arrived.length, housed: new Set(reservedStays.map((stay) => refId(stay.personRef))).size, team: accepted.filter((person) => person.isTeam).length, guests: accepted.filter((person) => person.isGuest).length },
      finance: { dueCents: sumKnown('dueCents'), paidNetCents: sumKnown('paidNetCents'), pendingCents, refundPendingCents: sumKnown('refundPendingCents'), overpaidCents: sumKnown('overpaidCents'), withDebt: accepted.filter((person) => person.pendingCents > 0).length, withRefund: people.filter((person) => person.refundPendingCents > 0).length },
      byPaymentState: countBy(accepted, (person) => unknown(person.paymentState)),
      byRole: countBy(accepted, (person) => unknown(person.danceRole)),
      byPackage: countBy(accepted, (person) => person.packageName || 'Sin paquete').slice(0, 8),
      byCountry: countBy(accepted, (person) => person.country || 'Sin dato').slice(0, 8),
      arrivalsByDate, debtors, program, lodging,
      attention: { issues: people.filter((person) => person.hasDataIssues).length, requests, waiting, withRefund: people.filter((person) => person.refundPendingCents > 0).length, activitiesWithIssues: program.filter((activity) => activity.issues > 0).length, sessionsWithDifference }
    };
  }
  async function detail(eventId, versionId, personId) {
    await context(eventId, versionId);
    const person = await getScoped('personas', personId, eventId, versionId);
    const reservationId = refId(person.reservationRef);
    if (!reservationId) fail(409, 'INVALID_REFERENCE');
    const reservation = await getScoped('reservas', reservationId, eventId, versionId);
    const [people, allocations, participations, stays] = await Promise.all([
      pageRows('personas', eventId, versionId, { reservationRef: reservationId }),
      pageRows('imputaciones', eventId, versionId, { personRef: personId }),
      pageRows('participaciones', eventId, versionId, { personRef: personId }),
      pageRows('estancias', eventId, versionId, { personRef: personId })
    ]);
    async function related(resource, rows, field) {
      const ids = [...new Set(rows.map((row) => refId(row[field])).filter(Boolean))];
      return getManyScoped(resource, ids, eventId, versionId);
    }
    const [payments, activities, rooms] = await Promise.all([related('pagos', allocations, 'paymentRef'), related('actividades', participations, 'activityRef'), related('habitaciones', stays, 'roomRef')]);
    await context(eventId, versionId);
    return { person: project('personas', person, true), reservation: project('reservas', reservation), people: people.map((row) => project('personas', row)), allocations: allocations.map((row) => project('imputaciones', row)), participations: participations.map((row) => project('participaciones', row)), stays: stays.map((row) => project('estancias', row)), payments: payments.map((row) => project('pagos', row)), activities: activities.map((row) => project('actividades', row)), rooms: rooms.map((row) => project('habitaciones', row)) };
  }
  async function requestDetail(eventId, versionId, requestId) {
    await context(eventId, versionId);
    const request = await getScoped('solicitudes', requestId, eventId, versionId);
    await context(eventId, versionId);
    return { request: { ...project('solicitudes', request), ...pick(request, 'email phone') } };
  }
  async function activityDetail(eventId, versionId, activityId, { group, search, page, limit }) {
    await context(eventId, versionId);
    const activity = await getScoped('actividades', activityId, eventId, versionId);
    const rows = await pageRows('participaciones', eventId, versionId, { activityRef: activityId }, 1000);
    const people = new Map((await getManyScoped('personas', rows.map((row) => refId(row.personRef)), eventId, versionId)).map((person) => [person._id, person]));
    const personIds = new Set();
    const items = [];
    for (const row of rows) {
      const personId = refId(row.personRef);
      if (!personId || personIds.has(personId)) fail(409, 'INVALID_REFERENCE');
      personIds.add(personId);
      const person = people.get(personId);
      if (!person) fail(409, 'INVALID_REFERENCE');
      const entitled = person.state === 'accepted' && row.eligible === true && ['included', 'extra'].includes(row.entitlement);
      const registered = row.attendanceState === 'registered';
      items.push({ row, person, entitled, registered, issue: row.needsReview === true || (registered && !entitled) });
    }
    const counts = { entitled: items.filter((item) => item.entitled).length, registered: items.filter((item) => item.registered).length, missing: items.filter((item) => item.entitled && !item.registered).length, issues: items.filter((item) => item.issue).length };
    const selected = items.filter((item) => (group === 'entitled' ? item.entitled : group === 'registered' ? item.registered : item.entitled && !item.registered) && (!search || normalize(item.person.searchText || item.person.fullName || '').includes(search)));
    await context(eventId, versionId);
    return { activity: project('actividades', activity), counts, total: selected.length, page, limit, items: selected.slice(page * limit, (page + 1) * limit).map((item) => ({ ...project('participaciones', item.row), person: { ...project('personas', item.person), ...(activity.category === 'meal' ? pick(item.person, 'dietaryNotes dietaryKnown') : {}) } })) };
  }
  async function roomDetail(eventId, versionId, roomId, night) {
    await context(eventId, versionId);
    const room = await getScoped('habitaciones', roomId, eventId, versionId);
    const stays = await pageRows('estancias', eventId, versionId, { roomRef: roomId }, 1000);
    const active = stays.filter((stay) => stay.state !== 'cancelled');
    const unknownDates = active.filter((stay) => !stay.checkInDate || !stay.checkOutDate || stay.checkInDate >= stay.checkOutDate).length;
    const selected = active.filter((stay) => stay.checkInDate && stay.checkOutDate && stay.checkInDate <= night && night < stay.checkOutDate);
    const people = new Map((await getManyScoped('personas', selected.map((stay) => refId(stay.personRef)), eventId, versionId)).map((person) => [person._id, person]));
    const seen = new Set();
    const items = [];
    for (const stay of selected) {
      const personId = refId(stay.personRef);
      if (seen.has(personId)) fail(409, 'INVALID_REFERENCE');
      seen.add(personId);
      const person = people.get(personId);
      if (!person) fail(409, 'INVALID_REFERENCE');
      items.push({ ...project('estancias', stay), person: project('personas', person) });
    }
    await context(eventId, versionId);
    return { room: project('habitaciones', room), night, assigned: items.length, free: !unknownDates && room.isAvailable === true && Number.isSafeInteger(room.capacity) && room.capacity > 0 ? Math.max(room.capacity - items.length, 0) : null, unknownDates, overCapacity: Number.isSafeInteger(room.capacity) ? items.length > room.capacity : null, items };
  }
  return {
    events: async () => { const result = await data.query(collectionId('BTEventos')).eq('isActive', true).ascending('eventKey').limit(100).find(options); return result.items.map((row) => pick(row, '_id title eventKey currentVersionRef')); },
    context, list: queryList, summary, overview, detail, requestDetail, activityDetail, roomDetail
  };
}
