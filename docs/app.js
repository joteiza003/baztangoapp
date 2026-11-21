import { config } from './config.js';
import { retrySeconds } from './retry.js';
import { sections, resources, tabs, labels, booleanFields, quickChips } from './catalogue.js?v=1.1.0';
import { esc, ref, money, date, shiftDay, display, initials, pill, button, csvCell } from './format.js?v=1.1.0';
import { icon, navButton, loginView, pendingView, skeleton, dashboardView, listView, agendaView, occupancyView, personView, activityView, roomView, facts } from './views.js?v=1.1.0';

const VERSION = '1.1.0';
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const announcer = document.querySelector('#announcer');

// Todo el estado privado vive solo en memoria: nada se guarda en el navegador.
const blank = () => ({ token: '', expiresAt: 0, events: [], eventId: '', query: {}, context: null, data: null, summary: null, overview: null, detail: null, activity: null, room: null, night: '', roomFilter: 'all', message: '', loading: false, refreshing: false, exporting: false, navs: 0, gsearch: { q: '', items: [], open: false, loading: false, index: -1 }, activityQuery: { group: 'entitled', page: 0, limit: 25, search: '' } });
const state = { route: 'resumen', tab: 'personas', resource: 'personas', view: 'list', currentQuery: null, ...blank() };
let lastActivity = Date.now();
let revision = 0;
let controller = new AbortController();
let retryAt = 0;
const timers = {};
const debounce = (key, wait, fn) => { clearTimeout(timers[key]); timers[key] = setTimeout(fn, wait); };

function configured() {
  try { const url = new URL(config.apiUrl); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; } catch { return false; }
}
function clearSession(message = '') {
  revision++;
  controller.abort(); controller = new AbortController();
  Object.assign(state, blank(), { message });
  dialog.close(); dialog.innerHTML = '';
  render();
}
async function api(body) {
  const requestRevision = revision;
  const requestToken = state.token;
  if (body.action !== 'login' && (!state.token || Date.now() >= state.expiresAt)) throw new Error('SESSION_EXPIRED');
  const response = await fetch(config.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}) }, body: JSON.stringify(body), credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal });
  let data;
  try { data = await response.json(); } catch { if (response.status === 429) data = {}; else throw new Error('SERVICE_UNAVAILABLE'); }
  if (response.status === 429) throw Object.assign(new Error(['RATE_LIMIT', 'DATA_SERVICE_BUSY', 'ACCESS_SERVICE_BUSY'].includes(data.error) ? data.error : 'UPSTREAM_RATE_LIMIT'), { retryAfter: retrySeconds(response, data) });
  if (!response.ok) throw Object.assign(new Error(data.error || 'SERVICE_UNAVAILABLE'), { diagnostic: typeof data.diagnostic === 'string' && /^[A-Z][A-Z0-9_]{0,50}$/.test(data.diagnostic) ? data.diagnostic : '', stage: ['data', 'access'].includes(data.stage) ? data.stage : '' });
  if (requestRevision !== revision || requestToken !== state.token) throw new DOMException('Consulta descartada', 'AbortError');
  return data;
}
const errorMessages = { ACCESS_DENIED: 'Acceso denegado. Comprueba la contraseña o vuelve a acceder.', SESSION_EXPIRED: 'La sesión ha caducado. Vuelve a acceder.', VERSION_EXPIRED: 'La copia ha cambiado. Accede de nuevo para consultar la versión actual.', NO_PUBLISHED_DATA: 'Esta edición aún no tiene una copia completa publicada.', CONFIGURATION_PENDING: 'El servicio de consulta todavía necesita configuración en Wix.', DETAIL_LIMIT: 'El detalle supera el límite de consulta. Reduce el alcance desde el listado.', SUMMARY_LIMIT: 'La copia supera el límite del resumen. Consulta los listados.', SEARCH_LIMIT: 'La búsqueda abarca demasiados registros. Aplica filtros más específicos.', INVALID_QUERY: 'La consulta no es válida. Revisa los filtros.', INVALID_REFERENCE: 'La copia contiene una referencia incoherente. Necesita revisión antes de consultarla.' };
function onError(error) {
  state.exporting = false; state.refreshing = false; state.gsearch.loading = false;
  if (error.name === 'AbortError') return;
  if (error.retryAfter || ['RATE_LIMIT', 'DATA_SERVICE_BUSY', 'ACCESS_SERVICE_BUSY', 'UPSTREAM_RATE_LIMIT'].includes(error.message)) {
    retryAt = Date.now() + (error.retryAfter || 60) * 1000;
    const message = error.message === 'DATA_SERVICE_BUSY' ? 'Wix ha limitado temporalmente las consultas de datos. No indica una contraseña incorrecta.' : error.message === 'ACCESS_SERVICE_BUSY' ? 'El servicio de acceso de Wix está temporalmente ocupado.' : 'El servicio ha pedido una pausa temporal. Puede afectar incluso al primer intento de acceso.';
    clearSession(`${message} Podrás volver a intentarlo cuando termine la cuenta atrás.`);
    updateRetryButton();
    return;
  }
  const diagnostic = error.diagnostic ? ` Detalle: ${error.diagnostic}${error.stage ? ` (${error.stage})` : ''}.` : '';
  clearSession((errorMessages[error.message] || 'No se ha podido consultar el servicio. Comprueba la conexión y vuelve a acceder.') + diagnostic);
}
function updateRetryButton() {
  const submit = document.querySelector('#login-form button[type="submit"]');
  if (!submit) return;
  const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
  submit.disabled = state.loading || seconds > 0;
  submit.textContent = seconds > 0 ? `Reintentar en ${seconds} s` : state.loading ? 'Verificando…' : 'Acceder';
}
const scope = () => ({ eventId: state.context.event._id, versionId: state.context.version._id });
const defaultQuery = (route, resource) => ({ search: '', filters: resource === 'personas' ? { state: 'accepted' } : {}, page: 0, limit: 25, order: route === 'pagos' && resource === 'personas' ? 'pendingDesc' : 'default' });
const qkey = (route = state.route, resource = state.resource) => `${route}:${resource}`;
const query = () => state.query[qkey()] || (state.query[qkey()] = defaultQuery(state.route, state.resource));
const tabFor = (route, resource) => tabs[route]?.find((tab) => tab.resource === resource) || tabs[route]?.[0];
const hashFor = (route, tabKey) => `#/${route}${tabs[route] && tabKey && tabs[route][0].key !== tabKey ? `/${tabKey}` : ''}`;

function copyMeta() {
  if (!state.context?.version) return 'Sin copia consultada';
  const captured = state.context.version.capturedAt;
  const age = Math.max(0, Math.floor((Date.now() - new Date(captured).getTime()) / 60000));
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
  const event = state.context.event;
  const during = today >= event.startDate && today <= event.endDate;
  const level = during && Number.isFinite(age) ? (age >= (event.staleMinutes || 15) ? 'stale' : age >= (event.warningMinutes || 5) ? 'warn' : 'fresh') : '';
  return `<span class="fresh ${level}">${icon('clock')}<span>Datos del ${esc(date(captured))}${during && Number.isFinite(age) ? ` · ${age} min${level === 'stale' ? ' · Copia antigua' : level === 'warn' ? ' · Revisar antigüedad' : ''}` : ''}</span></span>`;
}
function sessionText() {
  const seconds = Math.max(0, Math.floor((state.expiresAt - Date.now()) / 1000));
  return `Sesión ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function captureFocus() {
  const active = document.activeElement;
  if (!active || !active.id || !['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) return null;
  return { id: active.id, start: active.selectionStart, end: active.selectionEnd };
}
function restoreFocus(saved) {
  if (!saved) return;
  const element = document.getElementById(saved.id);
  if (!element) return;
  element.focus({ preventScroll: true });
  try { if (saved.start !== null && saved.start !== undefined) element.setSelectionRange(saved.start, saved.end); } catch { /* algunos tipos de campo no admiten selección */ }
}

function shell() {
  const heading = sections[state.route];
  const attention = state.overview?.attention;
  const logged = Boolean(state.token);
  const mobileRoutes = ['resumen', 'clientes', 'pagos', 'programa'];
  return `<aside class="sidebar"><div class="brand"><div class="wordmark">baztango</div><p>Consulta del evento</p></div><nav aria-label="Principal">${Object.keys(sections).map((route) => navButton(state, route, false, route === 'clientes' && attention ? attention.issues : 0)).join('')}</nav><div class="side-foot"><p>Acceso de organización</p><strong>Solo consulta</strong>${button(logged ? 'logout' : 'session', logged ? 'Cerrar sesión' : 'Cuenta y sesión')}</div></aside>
<div class="workspace"><header class="topbar"><div class="event-meta">${state.events.length ? `<label class="sr-only" for="event-selector">Edición</label><select id="event-selector">${state.events.map((event) => `<option value="${esc(event._id)}" ${state.eventId === event._id ? 'selected' : ''}>${esc(event.title || event.eventKey)}</option>`).join('')}</select>` : '<strong>Baztango · Organización</strong>'}<span class="badge ${logged ? 'green' : 'blue'}">${logged ? 'Acceso de consulta' : 'Solo consulta'}</span></div>
<div class="gsearch" role="search"><label class="sr-only" for="global-search">Buscar persona</label>${icon('search')}<input id="global-search" type="search" maxlength="100" autocomplete="off" placeholder="Buscar persona…  ( / )" role="combobox" aria-expanded="false" aria-controls="gsearch-results" aria-autocomplete="list" value="${esc(state.gsearch.q)}" ${logged && state.context?.version ? '' : 'disabled'}><div id="gsearch-results" class="gsearch-results" role="listbox" aria-label="Resultados de personas" hidden></div></div>
<div class="copy-meta">${copyMeta()}${logged ? `<span class="session-chip" id="session-chip">${sessionText()}</span>` : ''}</div><div class="top-actions">${button('refresh', `${icon('refresh')}<span class="btn-label">Volver a consultar</span>`, `aria-label="Volver a consultar" ${state.token && state.eventId ? '' : 'disabled'}`, 'ghost')}</div></header>
<main id="main" tabindex="-1"><div class="page-heading"><div><div class="eyebrow">${esc(heading[0])}</div><h1>${esc(heading[1])}</h1><p>${esc(heading[2])}</p></div><span class="badge">Solo consulta</span></div>${state.message ? `<div role="alert" class="notice">${esc(state.message)}</div>` : ''}<div class="content">${content()}</div><footer><span>Baztango · Consulta del evento · <span>Versión ${VERSION}</span></span><span>Consultar Wix no inicia la carga desde el gestor.</span></footer></main></div>
<nav class="bottom-nav" aria-label="Navegación móvil">${mobileRoutes.map((route) => navButton(state, route, true)).join('')}${button('more', `${icon('more')}<span>Más</span>`, 'aria-label="Más apartados"', 'bottom-link')}</nav>`;
}
function content() {
  if (!state.token) return configured() ? loginView(state) : pendingView();
  if (state.loading) return `<div class="busy">${skeleton()}</div>`;
  if (!state.context?.version) return '<section class="panel empty"><h2>Sin datos publicados</h2><p>Esta edición todavía no tiene una copia completa para consultar.</p></section>';
  if (state.detail) return personView(state);
  if (state.activity) return activityView(state);
  if (state.room) return roomView(state);
  if (state.route === 'resumen') return dashboardView(state);
  if (state.view === 'agenda') return agendaView(state);
  if (state.view === 'ocupacion') return occupancyView(state);
  return listView(state, query());
}
function render() {
  const focus = captureFocus();
  state.currentQuery = state.token && state.context ? query() : null;
  app.innerHTML = shell();
  restoreFocus(focus);
  updateRetryButton();
  paintSearch();
}

// ── Búsqueda global de personas ───────────────────────────────────────────────
function paintSearch() {
  const box = document.querySelector('#gsearch-results');
  const input = document.querySelector('#global-search');
  if (!box || !input) return;
  const g = state.gsearch;
  const open = Boolean(state.token) && g.open && g.q.trim().length >= 2;
  box.hidden = !open;
  input.setAttribute('aria-expanded', String(open));
  if (!open) { input.removeAttribute('aria-activedescendant'); return; }
  box.innerHTML = g.loading ? '<p class="gs-empty">Buscando…</p>' : g.items.length ? g.items.map((person, index) => `<button type="button" role="option" id="gs-${index}" class="gs-item" data-action="gs-open" data-id="${esc(person._id)}" aria-selected="${index === g.index}"><span class="avatar sm role-${esc(person.danceRole || 'unknown')}" aria-hidden="true">${esc(initials(person.fullName))}</span><span class="gs-name"><strong>${esc(person.fullName)}</strong><small>${esc(person.personCode || '')}${person.packageName ? ` · ${esc(person.packageName)}` : ''}</small></span>${person.state && person.state !== 'accepted' ? pill('state', person.state) : Number.isSafeInteger(person.pendingCents) && person.pendingCents > 0 ? `<span class="gs-owes">${esc(money(person.pendingCents))}</span>` : ''}</button>`).join('') : '<p class="gs-empty">No hay personas con ese nombre, reserva o ID.</p>';
  if (g.index >= 0) input.setAttribute('aria-activedescendant', `gs-${g.index}`); else input.removeAttribute('aria-activedescendant');
}
async function runGlobalSearch() {
  const q = state.gsearch.q.trim();
  if (!state.context || q.length < 2) return;
  try {
    const data = await api({ action: 'list', ...scope(), resource: 'personas', search: q, filters: {}, page: 0, limit: 8, order: 'name' });
    if (state.gsearch.q.trim() !== q) return;
    Object.assign(state.gsearch, { items: data.items, loading: false, index: -1 });
    paintSearch();
  } catch (error) { onError(error); }
}
function closeSearch(clear = false) { Object.assign(state.gsearch, { open: false, index: -1 }); if (clear) { state.gsearch.q = ''; state.gsearch.items = []; const input = document.querySelector('#global-search'); if (input) input.value = ''; } paintSearch(); }

// ── Carga de datos ────────────────────────────────────────────────────────────
async function ensureOverview() {
  if (state.overview !== null) return state.overview;
  try { state.overview = await api({ action: 'overview', ...scope() }); }
  catch (error) { if (['INVALID_QUERY', 'SUMMARY_LIMIT'].includes(error.message)) state.overview = false; else throw error; }
  return state.overview;
}
async function ensureSummary() { if (!state.summary) state.summary = await api({ action: 'summary', ...scope() }); }
async function loadContext(eventId) {
  revision++;
  if (state.eventId !== eventId) state.query = {};
  state.eventId = eventId;
  Object.assign(state, { context: null, data: null, summary: null, overview: null, detail: null, activity: null, room: null, night: '', loading: true });
  render();
  try {
    state.context = await api({ action: 'context', eventId });
    if (!location.hash) history.replaceState(null, '', '#/resumen');
    await route();
  } catch (error) { if (error.message === 'NO_PUBLISHED_DATA') { state.loading = false; state.message = ''; render(); } else onError(error); }
}
async function load({ soft = false } = {}) {
  const current = ++revision;
  if (soft) state.refreshing = true; else { state.loading = true; state.data = null; }
  state.message = '';
  render();
  try {
    if (state.route === 'resumen') {
      await ensureOverview();
      if (!state.overview) { const [summary, data] = await Promise.all([api({ action: 'summary', ...scope() }), api({ action: 'list', ...scope(), resource: 'actividades', page: 0, limit: 5 })]); state.summary = summary; state.data = data; }
    } else if (state.view === 'agenda' || state.view === 'ocupacion') {
      await ensureOverview();
      if (!state.overview) state.data = await api({ action: 'list', ...scope(), resource: state.resource, search: '', filters: {}, page: 0, limit: 100, order: 'default' });
    } else {
      const cur = query();
      const [data] = await Promise.all([api({ action: 'list', ...scope(), resource: state.resource, ...cur }), state.route === 'pagos' && state.resource === 'personas' ? ensureOverview().then((overview) => (overview ? null : ensureSummary())) : null]);
      if (revision !== current) return;
      state.data = data;
      announcer.textContent = `${data.total} resultados`;
    }
    if (revision !== current) return;
    state.loading = false; state.refreshing = false; render();
  } catch (error) { if (revision === current) onError(error); }
}
async function loadPerson(id) {
  state.loading = true; render();
  state.detail = await api({ action: 'detail', ...scope(), personId: id });
  state.loading = false; render();
}
async function loadActivity() {
  const activityId = state.activity?.activity?._id || state.pendingActivity;
  state.activity = await api({ action: 'activityDetail', ...scope(), activityId, ...state.activityQuery });
}
async function loadRoom(roomId, night) {
  state.room = await api({ action: 'roomDetail', ...scope(), roomId, night });
  state.night = night;
}

// ── Navegación por hash ───────────────────────────────────────────────────────
function go(hash) { state.navs++; if (location.hash === hash) route().catch(onError); else location.hash = hash; }
async function route() {
  if (!state.token || !state.context) return;
  const [first, second, third] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((part) => { try { return decodeURIComponent(part); } catch { return ''; } });
  revision++;
  dialog.close();
  Object.assign(state, { detail: null, activity: null, room: null });
  try {
    if (first === 'persona' && second) await loadPerson(second);
    else if (first === 'actividad' && second) { state.activityQuery = { group: 'entitled', page: 0, limit: 25, search: '' }; state.loading = true; render(); state.pendingActivity = second; await loadActivity(); state.loading = false; render(); }
    else if (first === 'habitacion' && second) { state.loading = true; render(); await loadRoom(second, /^\d{4}-\d{2}-\d{2}$/.test(third || '') ? third : state.night || state.context.event.startDate); state.loading = false; render(); }
    else {
      const name = sections[first] ? first : 'resumen';
      const tab = tabs[name]?.find((item) => item.key === second) || tabs[name]?.[0];
      Object.assign(state, { route: name, tab: tab?.key || '', resource: tab?.resource || 'personas', view: tab?.view || 'list' });
      await load();
    }
  } catch (error) { onError(error); return; }
  document.querySelector('#main')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function openRecord(resource, id) {
  if (resource === 'personas') return go(`#/persona/${encodeURIComponent(id)}`);
  if (resource === 'actividades') return go(`#/actividad/${encodeURIComponent(id)}`);
  if (resource === 'habitaciones') return go(`#/habitacion/${encodeURIComponent(id)}${state.night ? `/${state.night}` : ''}`);
  if (resource === 'solicitudes') { revision++; const data = await api({ action: 'requestDetail', ...scope(), requestId: id }); openDialog('Solicitud de consulta', facts(data.request)); return; }
  const row = state.data?.items?.find((item) => item._id === id);
  if (!row) return;
  openDialog(row.title || row.concept || row.paymentCode || resources[resource][0], `${facts(row)}${row.personRef ? button('person-ref', 'Ver ficha de la persona', `data-id="${esc(ref(row.personRef))}"`) : ''}${resource === 'cajas' ? button('related', 'Ver movimientos de esta sesión', `data-resource="movimientos" data-field="cashSessionRef" data-id="${esc(id)}"`) : ''}${resource === 'gastos' ? button('related', 'Ver pagos de este gasto', `data-resource="movimientos" data-field="expenseRef" data-id="${esc(id)}"`) : ''}${resource === 'pagos' ? button('related', 'Ver imputaciones del movimiento', `data-resource="imputaciones" data-field="paymentRef" data-id="${esc(id)}"`) : ''}`);
}
function openDialog(title, body) { dialog.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2>${button('close-dialog', 'Cerrar', 'aria-label="Cerrar diálogo"')}</div>${body}`; dialog.showModal(); }

async function changeActivity() {
  revision++;
  state.refreshing = true; render();
  try { await loadActivity(); state.refreshing = false; render(); } catch (error) { onError(error); }
}
function applyListForm(form) {
  const data = new FormData(form);
  const current = query();
  current.search = String(data.get('search') ?? current.search ?? ''); current.order = String(data.get('order') || 'default'); current.page = 0; current.filters = {};
  for (const field of resources[state.resource][2]) { const value = data.get(field); if (value !== null && value !== '') current.filters[field] = booleanFields.has(field) ? value === 'true' : String(value); }
  return load({ soft: true });
}

// ── Exportación (CSV generado en el navegador, sin guardar nada) ───────────────
const exportColumns = { personas: ['fullName', 'personCode', 'state', 'packageName', 'danceRole', 'country', 'paymentState', 'dueCents', 'paidNetCents', 'pendingCents', 'arrivalState'] };
function csvValue(field, value) {
  if (value === null || value === undefined || value === '') return '';
  if (field.endsWith('Cents')) return Number.isSafeInteger(value) ? (value / 100).toFixed(2).replace('.', ',') : '';
  if (field.endsWith('Date')) return String(value).slice(0, 10);
  return display(field, value);
}
function download(name, header, rows) {
  const text = `﻿${[header.map(csvCell).join(';'), ...rows.map((row) => row.map(csvCell).join(';'))].join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${name}-${new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())}.csv`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function exportList() {
  const resource = state.resource; const cur = query();
  const fields = exportColumns[resource] || resources[resource][1];
  const rows = [];
  state.exporting = true; render();
  try {
    for (let page = 0; page < 60; page++) {
      const data = await api({ action: 'list', ...scope(), resource, search: cur.search, filters: cur.filters, page, limit: 100, order: cur.order });
      rows.push(...data.items);
      if (!data.items.length || rows.length >= data.total) break;
    }
    state.exporting = false; render();
    download(`baztango-${resource}`, fields.map((field) => labels[field] || field), rows.map((row) => fields.map((field) => csvValue(field, row[field]))));
  } catch (error) { onError(error); }
}
async function exportActivity() {
  const fields = ['entitlement', 'attendanceState', 'validRecordCount', 'needsReview'];
  const meal = state.activity.activity.category === 'meal';
  const rows = [];
  state.exporting = true; render();
  try {
    for (let page = 0; page < 60; page++) {
      const data = await api({ action: 'activityDetail', ...scope(), activityId: state.activity.activity._id, group: state.activityQuery.group, search: state.activityQuery.search, page, limit: 100 });
      rows.push(...data.items);
      if (!data.items.length || rows.length >= data.total) break;
    }
    state.exporting = false; render();
    download('baztango-actividad', ['Persona', 'ID individual', ...fields.map((field) => labels[field] || field), ...(meal ? ['Información alimentaria conocida', 'Necesidad alimentaria'] : [])], rows.map((row) => [row.person.fullName, row.person.personCode, ...fields.map((field) => csvValue(field, row[field])), ...(meal ? [csvValue('dietaryKnown', row.person.dietaryKnown), row.person.dietaryNotes || ''] : [])]));
  } catch (error) { onError(error); }
}

// ── Acciones ──────────────────────────────────────────────────────────────────
async function handleAction(target) {
  const action = target.dataset.action;
  if (action === 'nav') { dialog.close(); return go(hashFor(target.dataset.route)); }
  if (action === 'more') return openDialog('Todos los apartados', `<nav class="dialog-nav" aria-label="Más apartados">${['alojamiento', 'caja'].map((name) => navButton(state, name)).join('')}${button(state.token ? 'logout' : 'session', state.token ? 'Cerrar sesión' : 'Cuenta y sesión')}</nav>`);
  if (action === 'close-dialog') return dialog.close();
  if (action === 'logout') return clearSession('La sesión se ha cerrado.');
  if (action === 'session') { dialog.close(); state.message = configured() ? 'Introduce la contraseña de organización para acceder.' : 'La conexión privada todavía está pendiente de configuración.'; render(); return; }
  if (action === 'refresh') { state.overview = null; state.summary = null; return loadContext(state.eventId); }
  if (action === 'tab') return go(hashFor(state.route, target.dataset.tab));
  if (action === 'clear') { state.query[qkey()] = defaultQuery(state.route, state.resource); return load({ soft: true }); }
  if (action === 'page') { query().page += Number(target.dataset.step); return load({ soft: true }); }
  if (action === 'size') { const cur = query(); cur.limit = cur.limit === 25 ? 50 : cur.limit === 50 ? 100 : 25; cur.page = 0; return load({ soft: true }); }
  if (action === 'chip') {
    const chip = quickChips.personas.find((item) => item.id === target.dataset.chip);
    const cur = query(); const active = target.getAttribute('aria-pressed') === 'true';
    cur.filters = { ...(active ? quickChips.personas[0].filters : chip.filters) }; cur.page = 0;
    return load({ soft: true });
  }
  if (action === 'open') return openRecord(target.dataset.resource, target.dataset.id);
  if (action === 'person-ref') { dialog.close(); closeSearch(); return go(`#/persona/${encodeURIComponent(target.dataset.id)}`); }
  if (action === 'gs-open') { closeSearch(true); return go(`#/persona/${encodeURIComponent(target.dataset.id)}`); }
  if (action === 'back') { if (state.navs > 0 && history.length > 1) history.back(); else go(hashFor(state.route, state.tab)); return; }
  if (action === 'print') return window.print();
  if (action === 'export') return exportList();
  if (action === 'export-activity') return exportActivity();
  if (action === 'activity-group') { state.activityQuery.group = target.dataset.group; state.activityQuery.page = 0; return changeActivity(); }
  if (action === 'activity-page') { state.activityQuery.page += Number(target.dataset.step); return changeActivity(); }
  if (action === 'room-filter') { state.roomFilter = target.dataset.filter; return render(); }
  if (action === 'night') { state.night = target.dataset.night; if (state.route === 'alojamiento' && state.view === 'ocupacion' && !state.room) return render(); return go('#/alojamiento'); }
  if (action === 'room-night') {
    const night = shiftDay(state.room.night, Number(target.dataset.step)); const roomId = state.room.room._id;
    revision++; state.refreshing = true; render();
    try { await loadRoom(roomId, night); history.replaceState(null, '', `#/habitacion/${encodeURIComponent(roomId)}/${night}`); state.refreshing = false; render(); } catch (error) { onError(error); }
    return;
  }
  if (action === 'filter-go') {
    const { route: name, resource } = target.dataset;
    const tab = tabFor(name, resource);
    const filters = JSON.parse(target.dataset.filters || '{}');
    state.query[qkey(name, tab.resource)] = { ...defaultQuery(name, tab.resource), ...(Object.keys(filters).length ? { filters } : {}) };
    dialog.close();
    return go(hashFor(name, tab.key));
  }
  if (action === 'related') {
    const name = target.dataset.resource === 'imputaciones' ? 'pagos' : 'caja';
    const tab = tabFor(name, target.dataset.resource);
    state.query[qkey(name, target.dataset.resource)] = { search: '', filters: { [target.dataset.field]: target.dataset.id }, page: 0, limit: 25, order: 'default' };
    dialog.close();
    return go(hashFor(name, tab.key));
  }
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (target && !target.disabled) handleAction(target).catch(onError);
  else if (!event.target.closest('.gsearch') && state.gsearch.open) closeSearch();
});
document.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  try {
    if (form.id === 'login-form') {
      if (state.loading || Date.now() < retryAt) return;
      const password = data.get('password'); form.reset(); state.loading = true; state.message = ''; render();
      const result = await api({ action: 'login', password });
      if (typeof result.token !== 'string' || !Number.isFinite(result.expiresAt) || !Array.isArray(result.events)) throw new Error('SERVICE_UNAVAILABLE');
      state.token = result.token; state.expiresAt = result.expiresAt; state.events = result.events; lastActivity = Date.now();
      if (state.events.length) await loadContext(state.events[0]._id); else { state.loading = false; render(); }
    } else if (form.id === 'search-form') { clearTimeout(timers.list); await applyListForm(form); }
    else if (form.id === 'activity-search') { clearTimeout(timers.activity); state.activityQuery.search = String(data.get('search') || ''); state.activityQuery.page = 0; await changeActivity(); }
    else if (form.id === 'night-form') { const roomId = state.room.room._id; const night = String(data.get('night')); revision++; state.refreshing = true; render(); await loadRoom(roomId, night); history.replaceState(null, '', `#/habitacion/${encodeURIComponent(roomId)}/${night}`); state.refreshing = false; render(); }
  } catch (error) { onError(error); }
});
document.addEventListener('input', (event) => {
  const id = event.target.id;
  if (id === 'global-search') {
    const value = event.target.value;
    state.gsearch.q = value;
    if (value.trim().length < 2) { Object.assign(state.gsearch, { items: [], open: false, loading: false, index: -1 }); paintSearch(); return; }
    Object.assign(state.gsearch, { open: true, loading: true, index: -1 }); paintSearch();
    debounce('global', 300, runGlobalSearch);
  } else if (id === 'list-search') {
    debounce('list', 450, () => { const cur = query(); cur.search = event.target.value; cur.page = 0; load({ soft: true }); });
  } else if (id === 'activity-search-input') {
    debounce('activity', 450, () => { state.activityQuery.search = event.target.value; state.activityQuery.page = 0; changeActivity(); });
  }
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'event-selector') loadContext(event.target.value);
  else if (event.target.form?.id === 'search-form' && event.target.tagName === 'SELECT') { clearTimeout(timers.list); applyListForm(event.target.form).catch(onError); }
});
document.addEventListener('keydown', (event) => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if (!dialog.open && state.token && state.context && ((event.key === '/' && !typing && !event.ctrlKey && !event.metaKey) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'))) {
    event.preventDefault(); document.querySelector('#global-search')?.focus(); return;
  }
  if (event.target.id !== 'global-search') return;
  const g = state.gsearch;
  if (event.key === 'Escape') { closeSearch(true); return; }
  if (!g.open || !g.items.length) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); g.index = (g.index + (event.key === 'ArrowDown' ? 1 : -1) + g.items.length) % g.items.length; paintSearch(); }
  else if (event.key === 'Enter') { event.preventDefault(); const person = g.items[Math.max(g.index, 0)]; closeSearch(true); go(`#/persona/${encodeURIComponent(person._id)}`); }
});
window.addEventListener('hashchange', () => { if (state.token && state.context) route().catch(onError); });
dialog.addEventListener('close', () => { dialog.innerHTML = ''; });
for (const eventName of ['pointerdown', 'keydown']) document.addEventListener(eventName, () => { lastActivity = Date.now(); }, { passive: true });
window.addEventListener('offline', () => clearSession('Sin conexión. Los datos de consulta se han retirado de la pantalla.'));
window.addEventListener('pagehide', () => clearSession());
setInterval(() => {
  if (state.token && (Date.now() >= state.expiresAt || Date.now() - lastActivity >= 900000)) { clearSession('La sesión ha caducado. Vuelve a acceder.'); return; }
  const chip = document.querySelector('#session-chip');
  if (chip && state.token) { chip.textContent = sessionText(); chip.classList.toggle('soon', state.expiresAt - Date.now() < 120000); }
}, 1000);
setInterval(updateRetryButton, 1000);
render();
