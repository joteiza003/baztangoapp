import { config } from './config.js';
import { retrySeconds } from './retry.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const announcer = document.querySelector('#announcer');
import { sections, resources, tabs, labels, values, enums, booleanFields, noSearch } from './catalogue.js';

const state = { route:'resumen', resource:'personas', query:{}, token:'', expiresAt:0, events:[], eventId:'', context:null, data:null, summary:null, detail:null, previous:null, loading:false, message:'', activity:null, activityQuery:{group:'entitled',page:0,limit:25,search:''}, room:null };
let lastActivity = Date.now();
let revision = 0;
let controller = new AbortController();
let retryAt = 0;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ref = (value) => typeof value === 'object' && value ? value._id : value;
const money = (value) => Number.isSafeInteger(value) ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(value/100) : 'Sin dato';
const date = (value) => {
  if (!value) return 'Sin dato';
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',...(String(value).includes('T') ? {timeStyle:'short',timeZone:'Europe/Madrid'} : {timeZone:'UTC'})}).format(parsed) : 'Sin dato';
};
function display(field, value) {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (field.endsWith('Cents')) return money(value);
  if (field.endsWith('At') || field.endsWith('Date')) return date(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (field.endsWith('Ref')) return ref(value) || 'Sin dato';
  return values[value] || String(value);
}
function icon(name) {
  const paths = { resumen:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',clientes:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',pagos:'M2 5h20v14H2z M2 10h20 M6 15h3',programa:'M3 5h18v16H3z M16 3v4 M8 3v4 M3 11h18',alojamiento:'M3 21V3h13v18 M16 10h5v11 M7 7h5 M7 11h5 M7 15h5 M8 21v-3h4v3',caja:'M3 7h18v14H3z M7 7V3h10v4 M8 12h8',lock:'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 15v2',more:'M5 12h1 M11 12h1 M17 12h1' };
  return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.resumen}"/></svg>`;
}
function button(action, text, attrs = '', className = '') { return `<button type="button" data-action="${action}" ${attrs} class="${className}">${text}</button>`; }
function nav(route, mobile = false) { return button('nav',`${icon(route)}<span class="${mobile ? '' : 'nav-label'}">${sections[route][0]}</span>`,`data-route="${route}" aria-label="${sections[route][0]}" ${state.route === route ? 'aria-current="page"' : ''}`,mobile ? '' : 'nav-button'); }
function configured() {
  try { const url = new URL(config.apiUrl); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; } catch { return false; }
}
function clearSession(message = '') {
  revision++;
  controller.abort(); controller = new AbortController();
  Object.assign(state,{token:'',expiresAt:0,events:[],eventId:'',query:{},context:null,data:null,summary:null,detail:null,previous:null,activity:null,activityQuery:{group:'entitled',page:0,limit:25,search:''},room:null,loading:false,message});
  dialog.close(); dialog.innerHTML = '';
  render();
}
async function api(body) {
  const requestRevision = revision;
  const requestToken = state.token;
  if (body.action !== 'login' && (!state.token || Date.now() >= state.expiresAt)) throw new Error('SESSION_EXPIRED');
  const response = await fetch(config.apiUrl,{method:'POST',headers:{'Content-Type':'application/json',...(state.token ? {Authorization:`Bearer ${state.token}`} : {})},body:JSON.stringify(body),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal});
  let data;
  try { data = await response.json(); } catch { if (response.status === 429) data = {}; else throw new Error('SERVICE_UNAVAILABLE'); }
  if (response.status === 429) throw Object.assign(new Error(['RATE_LIMIT','DATA_SERVICE_BUSY','ACCESS_SERVICE_BUSY'].includes(data.error) ? data.error : 'UPSTREAM_RATE_LIMIT'), { retryAfter: retrySeconds(response,data) });
  if (!response.ok) throw new Error(data.error || 'SERVICE_UNAVAILABLE');
  if (requestRevision !== revision || requestToken !== state.token) throw new DOMException('Consulta descartada','AbortError');
  return data;
}
const errorMessages = {ACCESS_DENIED:'Acceso denegado. Comprueba la contraseña o vuelve a acceder.',SESSION_EXPIRED:'La sesión ha caducado. Vuelve a acceder.',VERSION_EXPIRED:'La copia ha cambiado. Accede de nuevo para consultar la versión actual.',NO_PUBLISHED_DATA:'Esta edición aún no tiene una copia completa publicada.',RATE_LIMIT:'Se ha alcanzado el límite de consultas. Espera un minuto y vuelve a acceder.',CONFIGURATION_PENDING:'El servicio de consulta todavía necesita configuración en Wix.',DETAIL_LIMIT:'El detalle supera el límite de consulta. Reduce el alcance desde el listado.',SUMMARY_LIMIT:'La copia supera el límite del resumen. Consulta los listados.',SEARCH_LIMIT:'La búsqueda abarca demasiados registros. Aplica filtros más específicos.',INVALID_QUERY:'La consulta no es válida. Revisa los filtros.',INVALID_REFERENCE:'La copia contiene una referencia incoherente. Necesita revisión antes de consultarla.'};
function onError(error) {
  if (error.name === 'AbortError') return;
  if (error.retryAfter || ['RATE_LIMIT','DATA_SERVICE_BUSY','ACCESS_SERVICE_BUSY','UPSTREAM_RATE_LIMIT'].includes(error.message)) {
    retryAt = Date.now() + (error.retryAfter || 60) * 1000;
    const message = error.message === 'DATA_SERVICE_BUSY' ? 'Wix ha limitado temporalmente las consultas de datos. No indica una contraseña incorrecta.' : error.message === 'ACCESS_SERVICE_BUSY' ? 'El servicio de acceso de Wix está temporalmente ocupado.' : 'El servicio ha pedido una pausa temporal. Puede afectar incluso al primer intento de acceso.';
    clearSession(`${message} Podrás volver a intentarlo cuando termine la cuenta atrás.`);
    updateRetryButton();
    return;
  }
  clearSession(errorMessages[error.message] || 'No se ha podido consultar el servicio. Comprueba la conexión y vuelve a acceder.');
}
function updateRetryButton() {
  const submit = document.querySelector('#login-form button[type="submit"]');
  if (!submit) return;
  const seconds = Math.max(0,Math.ceil((retryAt-Date.now())/1000));
  submit.disabled = state.loading || seconds > 0;
  submit.textContent = seconds > 0 ? `Reintentar en ${seconds} s` : state.loading ? 'Verificando…' : 'Acceder';
}
function scope() { return {eventId:state.context.event._id,versionId:state.context.version._id}; }
function query() { return state.query[state.resource] || (state.query[state.resource] = {search:'',filters:state.resource === 'personas' ? {state:'accepted'} : {},page:0,limit:25,order:'default'}); }
function copyMeta() {
  if (!state.context?.version) return 'Sin copia consultada';
  const captured = state.context.version.capturedAt;
  const age = Math.max(0,Math.floor((Date.now()-new Date(captured).getTime())/60000));
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid'}).format(new Date());
  const event = state.context.event;
  const during = today >= event.startDate && today <= event.endDate;
  return `Datos del ${esc(date(captured))}${during && Number.isFinite(age) ? ` · Antigüedad ${age} min${age >= (event.staleMinutes || 15) ? ' · Copia antigua' : age >= (event.warningMinutes || 5) ? ' · Revisar antigüedad' : ''}` : ''}`;
}
function render() {
  const heading = sections[state.route];
  app.innerHTML = `<aside class="sidebar"><div class="brand"><div class="wordmark">baztango</div><p>Consulta del evento</p></div><nav aria-label="Principal">${Object.keys(sections).map((route) => nav(route)).join('')}</nav><div class="side-foot"><p>Acceso de organización</p><strong>Solo consulta</strong>${button(state.token ? 'logout' : 'session',state.token ? 'Cerrar sesión' : 'Cuenta y sesión')}</div></aside><div class="workspace"><header class="topbar"><div class="event-meta">${state.events.length ? `<label class="sr-only" for="event-selector">Edición</label><select id="event-selector">${state.events.map((event) => `<option value="${esc(event._id)}" ${state.eventId === event._id ? 'selected' : ''}>${esc(event.title || event.eventKey)}</option>`).join('')}</select>` : '<strong>Baztango · Organización</strong>'}<span class="badge ${state.token ? 'green' : 'blue'}">${state.token ? 'Acceso de consulta' : 'Solo consulta'}</span></div><div class="copy-meta">${copyMeta()}</div><div class="top-actions">${button('refresh','Volver a consultar',state.token && state.eventId ? '' : 'disabled')}</div></header><main id="main" tabindex="-1"><div class="page-heading"><div><div class="eyebrow">${esc(heading[0])}</div><h1>${esc(heading[1])}</h1><p>${esc(heading[2])}</p></div><span class="badge">Solo consulta</span></div>${state.message ? `<div role="alert" class="notice">${esc(state.message)}</div>` : ''}${content()}<footer><span>Baztango · Consulta del evento</span><span>Consultar Wix no inicia la carga desde el gestor.</span></footer></main></div><nav class="bottom-nav" aria-label="Navegación móvil">${['resumen','clientes','programa'].map((route) => nav(route,true)).join('')}${button('more',`${icon('more')}<span>Más</span>`,'aria-label="Más apartados"')}</nav>`;
  updateRetryButton();
}
function content() {
  if (!state.token) return configured() ? loginView() : pendingView();
  if (state.loading) return '<div class="panel busy" role="status">Consultando la copia publicada…</div>';
  if (!state.context?.version) return '<section class="panel empty"><h2>Sin datos publicados</h2><p>Esta edición todavía no tiene una copia completa para consultar.</p></section>';
  if (state.detail) return detailView();
  if (state.activity) return activityView();
  if (state.room) return roomView();
  return state.route === 'resumen' ? summaryView() : listView();
}
function pendingView() {
  return `<div class="stack"><section class="panel connection"><div class="connection-grid"><div><div class="connection-symbol">${icon('lock')}</div><div class="eyebrow">Acceso de organización</div><h2>Todo el evento.<br>Una consulta clara.</h2><p>Un espacio para encontrar personas, entender los saldos y consultar el programa. La conexión privada con los datos se activará cuando esté preparada en Wix.</p><p><span class="badge amber">Conexión pendiente</span></p></div><ul class="status-list"><li><span class="status-dot ready"></span>Interfaz de consulta preparada</li><li><span class="status-dot"></span>Acceso privado por configurar</li><li><span class="status-dot"></span>Primera copia de datos pendiente</li></ul></div></section><div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Lo que podrás consultar</h2><p>Información relacionada, con el contexto de cada persona.</p></div></div>${[['clientes','Clientes y solicitudes','Personas, reservas y estado de las solicitudes.'],['programa','Programa y recuentos','Derechos, asistencia y participantes por actividad.'],['alojamiento','Alojamiento','Unidades, estancias y asignaciones por noche.']].map(([route,title,description]) => button('nav',`<strong>${title} →</strong><span>${description}</span>`,`data-route="${route}"`,'feature-link')).join('')}</section><section class="panel"><div class="panel-head"><h2>Los datos, con su fecha</h2></div><p>Cuando exista una copia publicada, verás de cuándo son los datos y podrás volver a consultarlos.</p><div class="detail-section"><h3>Acceso del equipo</h3><p>La interfaz está preparada para consultar los datos tras verificar el acceso. Aquí todavía no se muestran cifras ni personas del evento.</p></div><div class="detail-section"><h3>Solo consulta</h3><p>Consulta de pagos y caja, sin acciones de cobro o modificación.</p></div></section></div></div>`;
}
function loginView() { return `<section class="panel login"><div class="connection-symbol">${icon('lock')}</div><h2>Acceso del equipo</h2><p>Introduce la contraseña compartida de organización. La sesión dura un máximo de 15 minutos.</p><form id="login-form"><label for="password">Contraseña de acceso<input id="password" type="password" name="password" autocomplete="off" required maxlength="512"></label><button class="primary" type="submit" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Verificando…' : 'Acceder'}</button><p class="small">Al cerrar o recargar esta página tendrás que acceder de nuevo.</p></form></section>`; }
function summaryView() {
  const data = state.summary || {};
  const metrics = [['Aceptados activos',data.accepted,'personas','clientes'],['Pendiente de cobro',money(data.pendingCents),'incluye bajas con obligaciones','pagos'],['Llegada general',data.arrived,'personas aceptadas con registro','clientes'],['Con alojamiento',data.housed,'personas con estancia vigente','alojamiento']];
  return `<div class="stack"><div class="metrics">${metrics.map(([title,value,unit,route],index) => button('metric',`<span>${title}</span><strong>${value === null || value === undefined ? 'Sin dato' : esc(value)}</strong><small>${unit}</small>`,`data-route="${route}" data-metric="${index}"`,`metric ${index === 1 ? 'money' : ''}`)).join('')}</div><div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Programa de la edición</h2><p>Abre una actividad para consultar sus recuentos completos.</p></div></div>${state.data?.items?.length ? state.data.items.map((activity) => button('open',`<strong>${esc(activity.name)}</strong><span>${esc(date(activity.eventDate))} · ${esc(display('category',activity.category))} · ${activity.timeConfirmed ? esc(date(activity.startsAt)) : 'Horario por confirmar'}</span>` ,`data-id="${esc(activity._id)}" data-resource="actividades"`,'feature-link')).join('') : '<p>No hay actividades en esta copia.</p>'}${button('nav','Consultar todo el programa','data-route="programa"')}</section><section class="panel"><div class="panel-head"><div><h2>Necesita revisión</h2><p>Condiciones informadas por la copia.</p></div></div>${button('issues',`<strong>Datos incompletos →</strong><span>${esc(data.issues ?? 'Sin dato')} personas con incidencias</span>`,'','feature-link')}${button('requests',`<strong>Solicitudes →</strong><span>${esc(data.requests ?? 'Sin dato')} solicitudes sin promocionar</span>`,'','feature-link')}<div class="detail-section"><p class="small">Un importe desconocido aparece como Sin dato. Las llegadas registradas no indican ocupación en vivo.</p></div></section></div><section class="panel"><form id="quick-form" class="form-row"><label>Encuentra una persona<input name="search" type="search" maxlength="100" placeholder="Nombre, reserva, ID, correo o teléfono"></label><button type="submit" class="primary">Buscar en clientes</button></form></section></div>`;
}
function financeSummary() {
  return `<div class="metrics">${[['Exigible total','dueCents'],['Cobrado neto','paidNetCents'],['Pendiente de cobro','pendingCents'],['Devolución pendiente','refundPendingCents']].map(([title,field]) => `<div class="panel metric"><span>${title}</span><strong>${esc(money(state.summary?.[field]))}</strong><small>Alcance: todas las personas de la copia, incluidas bajas</small></div>`).join('')}</div><p class="small muted">Los anticipos, pagos directos al hotel y devoluciones siguen las proyecciones del gestor. Los excesos no compensan deudas ajenas.</p>`;
}
function filterControl(field) {
  const current = query().filters[field];
  const options = booleanFields.has(field) ? ['true','false'] : field === 'state' ? state.resource === 'personas' ? ['accepted','cancelled','review'] : state.resource === 'solicitudes' ? ['review','waiting','rejected','promoted'] : state.resource === 'cajas' ? ['pending','open','closed','review'] : state.resource === 'gastos' ? ['unpaid','partial','paid','overpaid','unknown'] : state.resource === 'estancias' ? ['reserved','cancelled','review'] : ['valid','voided','review'] : enums[field];
  if (options) return `<label>${esc(labels[field] || field)}<select name="${field}"><option value="">Todos</option>${options.map((value) => `<option value="${value}" ${String(current) === value ? 'selected' : ''}>${booleanFields.has(field) ? value === 'true' ? 'Sí' : 'No' : esc(values[value] || value)}</option>`).join('')}</select></label>`;
  return `<label>${esc(labels[field] || field)}<input name="${field}" ${field.endsWith('Date') ? 'type="date"' : 'type="text" maxlength="100"'} value="${esc(current || '')}"></label>`;
}
function listView() {
  const resource = state.resource;
  const current = query();
  const data = state.data || {items:[],total:0};
  return `${state.route === 'pagos' ? financeSummary() : ''}<section class="panel"><div class="tabs" role="group" aria-label="Tipo de consulta">${tabs[state.route].map((tab) => button('tab',state.route === 'pagos' && tab === 'personas' ? 'Saldos por persona' : resources[tab][0],`data-resource="${tab}" aria-pressed="${tab === resource}"`)).join('')}</div><form id="search-form"><div class="form-row">${noSearch.has(resource) ? '<p class="small">Usa los filtros por referencia para consultar este listado.</p>' : `<label>Buscar en ${esc(resources[resource][0].toLowerCase())}<input name="search" type="search" maxlength="100" value="${esc(current.search)}" placeholder="${resource === 'personas' ? 'Nombre, reserva, ID, correo o teléfono' : 'Código, nombre o concepto'}"></label>`}<label>Orden<select name="order"><option value="default" ${current.order === 'default' ? 'selected' : ''}>Orden de consulta</option><option value="name" ${current.order === 'name' ? 'selected' : ''}>Nombre / referencia</option><option value="pendingDesc" ${current.order === 'pendingDesc' ? 'selected' : ''}>Pendiente descendente</option><option value="date" ${current.order === 'date' ? 'selected' : ''}>Fecha</option></select></label><button type="submit" class="primary">Buscar</button></div><details><summary>Filtros ${Object.keys(current.filters).length ? `· ${Object.keys(current.filters).length} activos` : ''}</summary><div class="filter-grid">${resources[resource][2].filter((field) => field !== 'sourceState').map(filterControl).join('')}</div><div class="form-row"><button class="primary" type="submit">Aplicar filtros</button>${button('clear','Limpiar filtros')}</div></details></form><div class="tabs" role="group" aria-label="Filtros activos">${Object.entries(current.filters).map(([field,value]) => `<span class="badge blue">${esc(labels[field] || field)}: ${esc(display(field,value))}</span>`).join('')}</div><div class="results-head"><h2>${esc(resources[resource][0])}</h2><p role="status">${data.total} ${resource === 'personas' ? 'personas' : resource === 'solicitudes' ? 'solicitudes' : 'registros'} · página ${current.page+1}</p></div>${data.items.length ? table(resource,data.items) : '<div class="empty"><h2>Sin resultados</h2><p>No hay registros que coincidan con esta consulta.</p>'+button('clear','Limpiar filtros')+'</div>'}<div class="pagination"><span>${data.total ? current.page*current.limit+1 : 0}–${Math.min((current.page+1)*current.limit,data.total)} de ${data.total}</span><div>${button('page','Anterior',`data-step="-1" ${!current.page ? 'disabled' : ''}`)}${button('page','Siguiente',`data-step="1" ${(current.page+1)*current.limit >= data.total || current.page >= 200 ? 'disabled' : ''}`)}</div></div><p class="small muted">Los importes y estados proceden de la copia. Consulta el detalle para ver el contexto completo.</p></section>`;
}
function table(resource, rows) {
  const fields = resources[resource][1];
  return `<div class="records"><table class="record-table"><caption class="sr-only">${esc(resources[resource][0])}</caption><thead><tr>${fields.map((field) => `<th scope="col">${esc(labels[field] || field)}</th>`).join('')}<th scope="col">Consulta</th></tr></thead><tbody>${rows.map((row) => `<tr>${fields.map((field,index) => `<td><span class="cell-label">${esc(labels[field] || field)}</span><span class="${index === 0 ? 'record-title' : field.endsWith('Cents') ? 'number' : ''}">${esc(display(field,row[field]))}</span>${index === 0 && resource === 'personas' ? `<span class="record-sub">${esc(display('state',row.state))} · ${esc(display('danceRole',row.danceRole))}${row.isTeam ? ' · Equipo' : ''}${row.isGuest ? ' · Invitado' : ''}</span>` : ''}</td>`).join('')}<td>${button('open',resource === 'personas' ? 'Ver ficha' : 'Consultar',`data-id="${esc(row._id)}" data-resource="${resource}" aria-label="${resource === 'personas' ? 'Ver ficha de' : 'Consultar'} ${esc(row.fullName || row.name || row.applicantNames || row.title || row.unitCode || row.concept || row.paymentCode || row._id)}"`)}</td></tr>`).join('')}</tbody></table></div>`;
}
function facts(row, allowed) { return `<dl class="facts">${(allowed || Object.keys(row)).filter((field) => !['_id','title','eventRef','versionRef','searchText'].includes(field)).map((field) => `<div><dt>${esc(labels[field] || field)}</dt><dd>${esc(display(field,row[field]))}</dd></div>`).join('')}</dl>`; }
function relatedRows(title, resource, rows) { return `<section class="detail-section"><h3>${title}</h3>${rows?.length ? `<div class="inline-list">${rows.map((row) => `<div class="inline-row">${facts(row)}${row.personRef ? button('person-ref','Ver ficha de la persona',`data-id="${esc(ref(row.personRef))}"`) : ''}</div>`).join('')}</div>` : '<p class="small">Sin registros relacionados en esta copia.</p>'}</section>`; }
function detailView() {
  const data = state.detail;
  return `<div class="stack"><div>${button('back','← Volver a la consulta')}</div><section class="panel"><div class="panel-head"><div><div class="eyebrow">Ficha de consulta</div><h2>${esc(data.person.fullName)}</h2><p>${esc(data.person.personCode)} · ${esc(data.reservation.reservationCode)}</p></div><span class="badge blue">${esc(display('state',data.person.state))}</span></div>${facts(data.person,['packageName','danceRole','isTeam','isGuest','arrivalState','arrivedAt','arrivalDate','dataIssueDetail'])}${relatedRows('Reserva','reservas',[data.reservation])}<section class="detail-section"><h3>Otras personas de la reserva</h3>${data.people.filter((person) => person._id !== data.person._id).map((person) => button('person-ref',`${esc(person.fullName)} · ${esc(person.personCode)}`,`data-id="${esc(person._id)}"`)).join('') || '<p class="small">No hay otras personas en esta reserva.</p>'}</section></section><section class="panel"><h2>Pagos y saldo individual</h2>${facts(data.person,['eventDueCents','hotelDueCents','dueCents','advanceNetCents','eventPaidNetCents','hotelDirectPaidCents','paidNetCents','pendingCents','overpaidCents','refundPendingCents'])}${relatedRows('Parte imputada a esta persona','imputaciones',data.allocations)}${relatedRows('Movimientos económicos originales','pagos',data.payments)}</section><section class="panel"><h2>Programa y asistencia</h2>${relatedRows('Participaciones de la persona','participaciones',data.participations)}${relatedRows('Actividades relacionadas','actividades',data.activities)}</section><section class="panel"><h2>Alojamiento</h2>${relatedRows('Estancias','estancias',data.stays)}${relatedRows('Unidades asignadas','habitaciones',data.rooms)}</section><section class="panel"><details><summary>Contacto y notas operativas</summary>${facts(data.person,['email','phone','dietaryKnown','dietaryNotes','operationNote','country','nationality','city'])}</details></section></div>`;
}
function activityView() {
  const data = state.activity;
  return `<section class="panel"><div class="panel-head"><div><h2>${esc(data.activity.name)}</h2><p>${esc(date(data.activity.eventDate))} · ${data.activity.timeConfirmed ? esc(date(data.activity.startsAt)) : 'Horario por confirmar'}</p></div>${button('back','← Volver')}</div><div class="tabs">${[['entitled','Con derecho'],['registered','Asistencia registrada'],['missing','Con derecho, sin registro']].map(([group,title]) => button('activity-group',`${title} · ${data.counts[group]}`,`data-group="${group}" aria-pressed="${state.activityQuery.group === group}"`)).join('')}</div><p class="small">${data.counts.issues} personas con incidencia. Las asistencias fuera de derecho se conservan; los registros repetidos no aumentan el número de personas.</p><form id="activity-search" class="form-row"><label>Buscar participante<input type="search" name="search" maxlength="100" value="${esc(state.activityQuery.search)}"></label><button class="primary" type="submit">Buscar</button></form><div class="results-head"><h3>${data.total} personas en este grupo</h3></div><div class="inline-list">${data.items.map((item) => `<div class="inline-row"><strong>${esc(item.person.fullName)} · ${esc(item.person.personCode)}</strong>${facts(item,['entitlement','attendanceState','validRecordCount','needsReview','reviewReason'])}${data.activity.category === 'meal' ? facts(item.person,['dietaryKnown','dietaryNotes']) : ''}${button('person-ref','Ver ficha',`data-id="${esc(item.person._id)}"`)}</div>`).join('') || '<p>Sin resultados.</p>'}</div><div class="pagination"><span>Página ${data.page+1}</span><div>${button('activity-page','Anterior',`data-step="-1" ${data.page === 0 ? 'disabled' : ''}`)}${button('activity-page','Siguiente',`data-step="1" ${(data.page+1)*data.limit >= data.total ? 'disabled' : ''}`)}</div></div></section>`;
}
function roomView() {
  const data = state.room;
  return `<section class="panel"><div class="panel-head"><div><h2>Unidad ${esc(data.room.unitCode)}</h2><p>Número del hotel: ${esc(data.room.hotelRoomNumber || 'Sin dato')}</p></div>${button('back','← Volver')}</div><form id="night-form" class="form-row"><label>Noche de alojamiento<input type="date" name="night" required value="${esc(data.night)}"></label><button class="primary" type="submit">Consultar noche</button></form><div class="results-head"><p>${data.assigned} personas asignadas · ${data.free === null ? 'Plazas libres: Sin dato' : `${data.free} plazas libres`} · Capacidad: ${esc(data.room.capacity ?? 'Sin dato')}</p></div>${data.unknownDates ? `<div class="notice">${data.unknownDates} estancias tienen fechas desconocidas. No se puede afirmar la disponibilidad.</div>` : ''}${data.overCapacity ? '<div class="notice">Las asignaciones superan la capacidad informada.</div>' : ''}<p class="small">La noche de salida queda fuera de la estancia. Las asignaciones no equivalen a llegadas registradas.</p>${data.items.map((item) => `<div class="detail-section"><strong>${esc(item.person.fullName)}</strong>${facts(item,['checkInDate','checkOutDate','bedLabel','state'])}${button('person-ref','Ver ficha',`data-id="${esc(item.person._id)}"`)}</div>`).join('') || '<div class="empty"><p>No hay personas asignadas para esta noche.</p></div>'}</section>`;
}
async function loadContext(eventId) {
  revision++;
  if (state.eventId !== eventId) state.query = {};
  state.eventId = eventId;
  state.context = null; state.data = null; state.summary = null; state.detail = null; state.activity = null; state.room = null; state.previous = null;
  state.loading = true; render();
  try { state.context = await api({action:'context',eventId}); await load(); }
  catch (error) { if (error.message === 'NO_PUBLISHED_DATA') { state.loading = false; state.message = ''; render(); } else onError(error); }
}
async function load() {
  const currentRevision = ++revision;
  state.loading = true; state.data = null; state.message = ''; render();
  try {
    if (state.route === 'resumen') {
      const [summary,data] = await Promise.all([api({action:'summary',...scope()}),api({action:'list',...scope(),resource:'actividades',page:0,limit:5})]);
      if (revision !== currentRevision) return;
      state.summary = summary; state.data = data;
    } else {
      const [data,summary] = await Promise.all([api({action:'list',...scope(),resource:state.resource,...query()}),state.route === 'pagos' ? api({action:'summary',...scope()}) : Promise.resolve(state.summary)]);
      state.summary = summary;
      if (revision !== currentRevision) return;
      state.data = data;
      announcer.textContent = `${data.total} resultados`;
    }
    state.loading = false; render();
  } catch (error) { if (revision === currentRevision) onError(error); }
}
async function navigate(route, resource) {
  if (!sections[route]) return;
  revision++;
  dialog.close();
  state.route = route; state.resource = resource || tabs[route]?.[0] || 'personas'; state.detail = null; state.activity = null; state.room = null; state.previous = null;
  if (state.token && state.context) await load(); else render();
  document.querySelector('#main').focus(); window.scrollTo(0,0);
}
function savePrevious(id) { if (!state.previous) state.previous = {route:state.route,resource:state.resource,scroll:window.scrollY,id}; }
async function openRecord(resource, id) {
  revision++;
  savePrevious(id);
  const row = state.data?.items?.find((item) => item._id === id);
  if (!['personas','solicitudes','actividades','habitaciones'].includes(resource)) {
    if (!row) return;
    openDialog(row.title || row.concept || row.paymentCode || resources[resource][0],`${facts(row)}${row.personRef ? button('person-ref','Ver ficha de la persona',`data-id="${esc(ref(row.personRef))}"`) : ''}${resource === 'cajas' ? button('related','Ver movimientos de esta sesión',`data-resource="movimientos" data-field="cashSessionRef" data-id="${esc(id)}"`) : ''}${resource === 'gastos' ? button('related','Ver pagos de este gasto',`data-resource="movimientos" data-field="expenseRef" data-id="${esc(id)}"`) : ''}${resource === 'pagos' ? button('related','Ver imputaciones del movimiento',`data-resource="imputaciones" data-field="paymentRef" data-id="${esc(id)}"`) : ''}`);
    return;
  }
  state.loading = true; render();
  try {
    if (resource === 'personas') { state.detail = await api({action:'detail',...scope(),personId:id}); state.activity = null; state.room = null; }
    if (resource === 'solicitudes') { const data = await api({action:'requestDetail',...scope(),requestId:id}); state.loading = false; render(); openDialog('Solicitud de consulta',facts(data.request)); return; }
    if (resource === 'actividades') { state.activityQuery = {group:'entitled',page:0,limit:25,search:''}; state.activity = await api({action:'activityDetail',...scope(),activityId:id,...state.activityQuery}); state.detail = null; state.room = null; }
    if (resource === 'habitaciones') { state.room = await api({action:'roomDetail',...scope(),roomId:id,night:state.context.event.startDate}); state.detail = null; state.activity = null; }
    state.loading = false; render(); document.querySelector('#main').focus(); window.scrollTo(0,0);
  } catch (error) { onError(error); }
}
function openDialog(title, body) { dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2>${button('close-dialog','Cerrar','aria-label="Cerrar diálogo"')}</div>${body}`; dialog.showModal(); }
async function changeActivity() {
  revision++;
  const activityId = state.activity.activity._id;
  state.loading = true; render();
  try { state.activity = await api({action:'activityDetail',...scope(),activityId,...state.activityQuery}); state.loading = false; render(); }
  catch (error) { onError(error); }
}
async function handleAction(target) {
  const action = target.dataset.action;
  if (action === 'nav') return navigate(target.dataset.route);
  if (action === 'more') return openDialog('Todos los apartados',`<nav class="dialog-nav" aria-label="Más apartados">${['pagos','alojamiento','caja'].map((route) => nav(route)).join('')}${button(state.token ? 'logout' : 'session',state.token ? 'Cerrar sesión' : 'Cuenta y sesión')}</nav>`);
  if (action === 'close-dialog') return dialog.close();
  if (action === 'logout') return clearSession('La sesión se ha cerrado.');
  if (action === 'session') { dialog.close(); state.message = configured() ? 'Introduce la contraseña de organización para acceder.' : 'La conexión privada todavía está pendiente de configuración.'; render(); return; }
  if (action === 'refresh') return loadContext(state.eventId);
  if (action === 'tab') { state.resource = target.dataset.resource; return load(); }
  if (action === 'clear') { state.query[state.resource] = {search:'',filters:{},page:0,limit:25,order:'default'}; return load(); }
  if (action === 'page') { query().page += Number(target.dataset.step); return load(); }
  if (action === 'open') return openRecord(target.dataset.resource,target.dataset.id);
  if (action === 'person-ref') { dialog.close(); return openRecord('personas',target.dataset.id); }
  if (action === 'back') {
    const previous = state.previous;
    state.detail = null; state.activity = null; state.room = null; state.previous = null;
    if (previous) { state.route = previous.route; state.resource = previous.resource; }
    await load(); window.scrollTo(0,previous?.scroll || 0); (previous?.id ? document.querySelector(`[data-action="open"][data-id="${CSS.escape(previous.id)}"]`) : null)?.focus({preventScroll:true}); return;
  }
  if (action === 'activity-group') { state.activityQuery.group = target.dataset.group; state.activityQuery.page = 0; return changeActivity(); }
  if (action === 'activity-page') { state.activityQuery.page += Number(target.dataset.step); return changeActivity(); }
  if (action === 'related') {
    const route = target.dataset.resource === 'imputaciones' ? 'pagos' : 'caja';
    const resource = target.dataset.resource;
    state.query[resource] = {search:'',filters:{[target.dataset.field]:target.dataset.id},page:0,limit:25,order:'default'};
    return navigate(route,resource);
  }
  if (action === 'metric') {
    if (!state.token) return;
    if (target.dataset.metric === '2') state.query.personas = {search:'',filters:{state:'accepted',arrivalState:'registered'},page:0,limit:25,order:'default'};
    return navigate(target.dataset.route);
  }
  if (action === 'issues') { state.query.personas = {search:'',filters:{hasDataIssues:true},page:0,limit:25,order:'default'}; return navigate('clientes'); }
  if (action === 'requests') return navigate('clientes','solicitudes');
}
document.addEventListener('click',(event) => { const target = event.target.closest('[data-action]'); if (target && !target.disabled) handleAction(target).catch(onError); });
document.addEventListener('submit',async (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  try {
    if (form.id === 'login-form') {
      if (state.loading || Date.now() < retryAt) return;
      const password = data.get('password'); form.reset(); state.loading = true; state.message = ''; render();
      const result = await api({action:'login',password});
      if (typeof result.token !== 'string' || !Number.isFinite(result.expiresAt) || !Array.isArray(result.events)) throw new Error('SERVICE_UNAVAILABLE');
      state.token = result.token; state.expiresAt = result.expiresAt; state.events = result.events; lastActivity = Date.now();
      if (state.events.length) await loadContext(state.events[0]._id); else { state.loading = false; render(); }
    } else if (form.id === 'search-form') {
      const current = query(); current.search = String(data.get('search') || ''); current.order = String(data.get('order') || 'default'); current.page = 0; current.filters = {};
      for (const field of resources[state.resource][2]) { const value = data.get(field); if (value !== null && value !== '') current.filters[field] = booleanFields.has(field) ? value === 'true' : String(value); }
      await load();
    } else if (form.id === 'quick-form') { state.query.personas = {search:String(data.get('search') || ''),filters:{},page:0,limit:25,order:'default'}; await navigate('clientes'); }
    else if (form.id === 'activity-search') { state.activityQuery.search = String(data.get('search') || ''); state.activityQuery.page = 0; await changeActivity(); }
    else if (form.id === 'night-form') { const roomId = state.room.room._id; state.loading = true; render(); state.room = await api({action:'roomDetail',...scope(),roomId,night:String(data.get('night'))}); state.loading = false; render(); }
  } catch (error) { onError(error); }
});
document.addEventListener('change',(event) => { if (event.target.id === 'event-selector') loadContext(event.target.value); });
dialog.addEventListener('close',() => { dialog.innerHTML = ''; });
for (const eventName of ['pointerdown','keydown']) document.addEventListener(eventName,() => { lastActivity = Date.now(); },{passive:true});
window.addEventListener('offline',() => clearSession('Sin conexión. Los datos de consulta se han retirado de la pantalla.'));
window.addEventListener('pagehide',() => clearSession());
setInterval(() => { if (state.token && (Date.now() >= state.expiresAt || Date.now()-lastActivity >= 900000)) clearSession('La sesión ha caducado. Vuelve a acceder.'); },1000);
setInterval(updateRetryButton,1000);
render();
