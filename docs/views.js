import { sections, resources, tabs, labels, values, enums, booleanFields, noSearch, quickChips, programTypes, packKey } from './catalogue.js?v=1.1.0';
import { esc, ref, money, moneyShort, number, percent, date, time, dayLabel, display, initials, tone, pill, isPillField, button, safeTel } from './format.js?v=1.1.0';
import { bar, stackedBar, donut, ring, legend } from './charts.js?v=1.1.0';

const attr = (value) => esc(JSON.stringify(value));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
export function icon(name) {
  const paths = { resumen: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', clientes: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', pagos: 'M2 5h20v14H2z M2 10h20 M6 15h3', programa: 'M3 5h18v16H3z M16 3v4 M8 3v4 M3 11h18', alojamiento: 'M3 21V3h13v18 M16 10h5v11 M7 7h5 M7 11h5 M7 15h5 M8 21v-3h4v3', caja: 'M3 7h18v14H3z M7 7V3h10v4 M8 12h8', lock: 'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 15v2', more: 'M5 12h1 M11 12h1 M17 12h1', search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3', download: 'M12 3v12 M7 10l5 5 5-5 M4 21h16', print: 'M6 9V3h12v6 M6 18H4v-7h16v7h-2 M6 14h12v7H6z', refresh: 'M21 12a9 9 0 1 1-3-6.7 M21 3v6h-6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2', mail: 'M3 5h18v14H3z M3 7l9 6 9-6', alert: 'M12 3l10 18H2z M12 10v5 M12 18h.01', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2' };
  return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.resumen}"/></svg>`;
}

export function navButton(state, route, mobile = false, badge = 0) {
  const label = sections[route][0];
  return button('nav', `${icon(route)}<span class="${mobile ? '' : 'nav-label'}">${label}</span>${badge ? `<span class="nav-badge" aria-label="${badge} por revisar">${badge}</span>` : ''}`, `data-route="${route}" aria-label="${label}" ${state.route === route ? 'aria-current="page"' : ''}`, mobile ? 'bottom-link' : 'nav-button');
}

export function loginView(state) {
  return `<section class="panel login"><div class="connection-symbol">${icon('lock')}</div><h2>Acceso del equipo</h2><p>Introduce la contraseña compartida de organización. La sesión dura un máximo de 15 minutos.</p><form id="login-form"><label for="password">Contraseña de acceso<input id="password" type="password" name="password" autocomplete="off" required maxlength="512"></label><button class="primary" type="submit" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Verificando…' : 'Acceder'}</button><p class="small">Al cerrar o recargar esta página tendrás que acceder de nuevo.</p></form></section>`;
}

export function pendingView() {
  return `<div class="stack"><section class="panel connection"><div class="connection-grid"><div><div class="connection-symbol">${icon('lock')}</div><div class="eyebrow">Acceso de organización</div><h2>Todo el evento.<br>Una consulta clara.</h2><p>Un espacio para encontrar personas, entender los saldos y consultar el programa. La conexión privada con los datos se activará cuando esté preparada en Wix.</p><p><span class="badge amber">Conexión pendiente</span></p></div><ul class="status-list"><li><span class="status-dot ready"></span>Interfaz de consulta preparada</li><li><span class="status-dot"></span>Acceso privado por configurar</li><li><span class="status-dot"></span>Primera copia de datos pendiente</li></ul></div></section><div class="two-col"><section class="panel"><div class="panel-head"><div><h2>Lo que podrás consultar</h2><p>Información relacionada, con el contexto de cada persona.</p></div></div>${[['clientes', 'Clientes y solicitudes', 'Personas, reservas y estado de las solicitudes.'], ['programa', 'Programa y recuentos', 'Derechos, asistencia y participantes por actividad.'], ['alojamiento', 'Alojamiento', 'Unidades, estancias y asignaciones por noche.']].map(([route, title, description]) => button('nav', `<strong>${title} →</strong><span>${description}</span>`, `data-route="${route}"`, 'feature-link')).join('')}</section><section class="panel"><div class="panel-head"><h2>Los datos, con su fecha</h2></div><p>Cuando exista una copia publicada, verás de cuándo son los datos y podrás volver a consultarlos.</p><div class="detail-section"><h3>Acceso del equipo</h3><p>La interfaz está preparada para consultar los datos tras verificar el acceso. Aquí todavía no se muestran cifras ni personas del evento.</p></div><div class="detail-section"><h3>Solo consulta</h3><p>Consulta de pagos y caja, sin acciones de cobro o modificación.</p></div></section></div></div>`;
}

export function skeleton() {
  return `<div class="stack" role="status" aria-label="Consultando la copia publicada"><div class="metrics">${'<div class="panel skeleton tall"></div>'.repeat(4)}</div><div class="two-col"><div class="panel skeleton tall"></div><div class="panel skeleton tall"></div></div><span class="sr-only">Consultando la copia publicada…</span></div>`;
}

const goButton = (route, resource, filters, inner, className = '', label = '') => button('filter-go', inner, `data-route="${route}" data-resource="${resource}" data-filters="${attr(filters)}" ${label ? `aria-label="${esc(label)}"` : ''}`, className);

function kpi({ title, value, sub, barHtml = '', toneName = '', go }) {
  return goButton(go.route, go.resource || 'personas', go.filters || {}, `<span class="kpi-title">${esc(title)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small>${barHtml}`, `kpi ${toneName}`);
}

export function dashboardView(state) {
  const o = state.overview;
  if (!o) return legacyDashboard(state);
  const { totals: t, finance: f, attention: a } = o;
  const paid = f.paidNetCents; const due = f.dueCents;
  const kpis = [
    kpi({ title: 'Aceptados activos', value: number(t.accepted), sub: `${number(t.cancelled)} bajas · ${number(t.team)} equipo · ${number(t.guests)} invitados`, go: { route: 'clientes', filters: { state: 'accepted' } } }),
    kpi({ title: 'Llegada general', value: `${number(t.arrived)} / ${number(t.accepted)}`, sub: `${percent(t.arrived, t.accepted) ?? 0}% de las personas aceptadas`, barHtml: bar(t.arrived, t.accepted, 'ok'), go: { route: 'clientes', filters: { state: 'accepted', arrivalState: 'registered' } } }),
    kpi({ title: 'Con alojamiento', value: `${number(t.housed)} / ${number(t.accepted)}`, sub: 'personas con estancia vigente', barHtml: bar(t.housed, t.accepted, 'info'), go: { route: 'alojamiento', resource: 'habitaciones' } }),
    kpi({ title: 'Cobrado neto', value: moneyShort(paid), sub: due === null ? 'Exigible sin dato' : `de ${moneyShort(due)} exigibles`, barHtml: bar(paid ?? 0, due ?? 0, 'ok'), go: { route: 'pagos', filters: { state: 'accepted' } } }),
    kpi({ title: 'Pendiente de cobro', value: moneyShort(f.pendingCents), sub: `${number(f.withDebt)} personas con deuda`, toneName: f.pendingCents > 0 ? 'alert' : '', go: { route: 'pagos', filters: { state: 'accepted' } } })
  ];
  const states = o.byPaymentState.map((row) => ({ value: row.count, tone: `c-${tone(row.value)}`, key: row.value, label: display('paymentState', row.value) }));
  const acceptedTotal = states.reduce((sum, row) => sum + row.value, 0);
  const attention = [
    [a.issues, 'Personas con incidencias en los datos', 'clientes', 'personas', { hasDataIssues: true }],
    [a.waiting, 'Solicitudes en espera de decisión', 'clientes', 'solicitudes', {}],
    [Math.max(a.requests - a.waiting, 0), 'Otras solicitudes sin promocionar', 'clientes', 'solicitudes', {}],
    [a.withRefund, 'Personas con devolución pendiente', 'pagos', 'personas', {}],
    [a.activitiesWithIssues, 'Actividades con incidencias de asistencia', 'programa', 'actividades', {}],
    [a.sessionsWithDifference, 'Sesiones de caja con diferencia de efectivo', 'caja', 'cajas', {}],
    [o.lodging.overCapacityRooms, 'Unidades por encima de su capacidad', 'alojamiento', 'habitaciones', {}],
    [o.lodging.unknownDates, 'Estancias con fechas desconocidas', 'alojamiento', 'estancias', {}]
  ].filter(([count]) => count > 0);
  const todayDay = today();
  const programDays = [...new Set(o.program.map((activity) => activity.eventDate))].filter(Boolean);
  const programFocus = programDays.includes(todayDay) ? todayDay : programDays.find((day) => day > todayDay) || programDays[0];
  const focusActivities = o.program.filter((activity) => activity.eventDate === programFocus);
  const maxAssigned = Math.max(...o.lodging.nights.map((night) => night.assigned), 1);
  const nightsChart = o.lodging.nights.length ? `<div class="cols" role="list" aria-label="Personas alojadas por noche">${o.lodging.nights.map((night) => {
    const base = night.capacity > 0 ? night.capacity : maxAssigned;
    const p = percent(night.assigned, base) ?? 0;
    const toneName = night.capacity > 0 && night.assigned > night.capacity ? 'bad' : p >= 90 ? 'warn' : 'info';
    return `<button type="button" role="listitem" class="col" data-action="night" data-night="${esc(night.date)}" aria-label="${esc(dayLabel(night.date))}: ${night.assigned} personas${night.capacity ? ` de ${night.capacity} plazas` : ''}"><span class="col-val">${night.assigned}</span><span class="col-track"><span class="col-fill ${toneName} h-${Math.min(p, 100)}"></span></span><span class="col-label">${esc(dayLabel(night.date).replace(/^(\S+)\s(\d+).*$/, '$1 $2'))}</span></button>`;
  }).join('')}</div>` : '<p class="small">Aún no hay estancias con fechas conocidas.</p>';
  const arrivalsChart = o.arrivalsByDate.length ? (() => { const max = Math.max(...o.arrivalsByDate.map((row) => row.count), 1); return `<div class="cols compact" role="list" aria-label="Llegadas registradas por día">${o.arrivalsByDate.map((row) => `<div role="listitem" class="col static" aria-label="${esc(dayLabel(row.value))}: ${row.count} llegadas"><span class="col-val">${row.count}</span><span class="col-track"><span class="col-fill ok h-${percent(row.count, max)}"></span></span><span class="col-label">${esc(dayLabel(row.value).replace(/^(\S+)\s(\d+).*$/, '$1 $2'))}</span></div>`).join('')}</div>`; })() : '<p class="small">Sin llegadas registradas todavía.</p>';
  const roleRows = (rows, total, toneName, field) => rows.map((row) => `<div class="meter-row"><span>${esc(field ? display(field, row.value) : row.value)}</span><strong>${number(row.count)}</strong>${bar(row.count, total, toneName)}</div>`).join('') || '<p class="small">Sin datos.</p>';
  return `<div class="stack"><div class="metrics five">${kpis.join('')}</div>
<div class="grid-3">
<section class="panel"><div class="panel-head"><div><h2>Cobros</h2><p>Todas las personas de la copia, incluidas bajas.</p></div></div>${stackedBar([{ value: paid || 0, tone: 'ok' }, { value: f.pendingCents || 0, tone: 'bad' }])}<dl class="money-list"><div><dt><span class="swatch c-ok"></span>Cobrado neto</dt><dd>${esc(money(paid))}</dd></div><div><dt><span class="swatch c-bad"></span>Pendiente de cobro</dt><dd>${esc(money(f.pendingCents))}</dd></div><div><dt>Exigible total</dt><dd>${esc(money(due))}</dd></div><div><dt>Devolución pendiente</dt><dd>${esc(money(f.refundPendingCents))}</dd></div><div><dt>Exceso de cobro</dt><dd>${esc(money(f.overpaidCents))}</dd></div></dl>${button('nav', 'Ver saldos por persona →', 'data-route="pagos"', 'link-button')}</section>
<section class="panel"><div class="panel-head"><div><h2>Situación económica</h2><p>Personas aceptadas por estado de pago.</p></div></div><div class="donut-row">${donut(states, { label: 'Personas aceptadas por situación económica', center: String(acceptedTotal), sub: 'personas' })}${legend(states.map((row) => ({ html: goButton('clientes', 'personas', { state: 'accepted', paymentState: row.key }, `<span class="swatch ${row.tone}"></span><span class="legend-name">${esc(row.label)}</span><strong>${row.value}</strong>`, 'legend-link', `${row.label}: ${row.value} personas. Ver en clientes`) })))}</div></section>
<section class="panel"><div class="panel-head"><div><h2>Llegadas</h2><p>Registro de llegada general.</p></div></div><div class="donut-row">${ring(t.arrived, t.accepted, { label: `${t.arrived} de ${t.accepted} personas han llegado` })}<div><strong class="big">${number(t.arrived)}</strong><p class="small">de ${number(t.accepted)} aceptadas<br>${number(Math.max(t.accepted - t.arrived, 0))} pendientes</p></div></div>${arrivalsChart}<p class="small">Las llegadas registradas no indican ocupación en vivo.</p></section>
</div>
<div class="grid-2">
<section class="panel"><div class="panel-head"><div><h2>${programFocus ? (programFocus === todayDay ? 'Programa de hoy' : `Programa · ${esc(dayLabel(programFocus, true))}`) : 'Programa'}</h2><p>Derechos y asistencia registrada por actividad.</p></div>${button('nav', 'Agenda completa', 'data-route="programa"', 'link-button')}</div>${focusActivities.length ? focusActivities.map(agendaRow).join('') : '<p>No hay actividades en esta copia.</p>'}</section>
<section class="panel"><div class="panel-head"><div><h2>Alojamiento por noche</h2><p>Personas con estancia por noche${o.lodging.nights[0]?.capacity ? ` · ${number(o.lodging.nights[0].capacity)} plazas en servicio` : ''}.</p></div>${button('nav', 'Ver unidades', 'data-route="alojamiento"', 'link-button')}</div>${nightsChart}</section>
</div>
<div class="grid-2">
<section class="panel"><div class="panel-head"><div><h2>Mayores pendientes</h2><p>Personas aceptadas con más importe por cobrar.</p></div>${button('filter-go', 'Ver todos', `data-route="pagos" data-resource="personas" data-filters="${attr({ state: 'accepted' })}"`, 'link-button')}</div>${o.debtors.length ? `<ol class="rank">${o.debtors.map((person, index) => `<li>${button('person-ref', `<span class="rank-n">${index + 1}</span><span class="rank-name"><strong>${esc(person.fullName)}</strong><small>${esc(person.personCode || '')}${person.packageName ? ` · ${esc(person.packageName)}` : ''}</small></span><span class="rank-amount">${esc(money(person.pendingCents))}</span>`, `data-id="${esc(person._id)}" aria-label="Ver ficha de ${esc(person.fullName)}"`, 'rank-link')}</li>`).join('')}</ol>` : '<p>No hay importes pendientes.</p>'}</section>
<section class="panel"><div class="panel-head"><div><h2>Necesita revisión</h2><p>Condiciones informadas por la copia.</p></div></div>${attention.length ? `<ul class="attention">${attention.map(([count, text, route, resource, filters]) => `<li>${goButton(route, resource, filters, `<span class="attn-count">${number(count)}</span><span>${esc(text)}</span><span aria-hidden="true">→</span>`, 'attn-link')}</li>`).join('')}</ul>` : '<p class="ok-note">Todo en orden: no hay incidencias informadas en esta copia.</p>'}</section>
</div>
<section class="panel"><div class="panel-head"><div><h2>Perfil del grupo</h2><p>Reparto de las personas aceptadas.</p></div></div><div class="grid-3 flat"><div><h3>Rol</h3>${roleRows(o.byRole, t.accepted, 'brand', 'danceRole')}</div><div><h3>Paquete</h3>${roleRows(o.byPackage, t.accepted, 'info')}</div><div><h3>País / región</h3>${roleRows(o.byCountry, t.accepted, 'warn')}</div></div></section></div>`;
}

function legacyDashboard(state) {
  const data = state.summary || {};
  const metrics = [['Aceptados activos', data.accepted, 'personas', 'clientes'], ['Pendiente de cobro', money(data.pendingCents), 'incluye bajas con obligaciones', 'pagos'], ['Llegada general', data.arrived, 'personas aceptadas con registro', 'clientes'], ['Con alojamiento', data.housed, 'personas con estancia vigente', 'alojamiento']];
  return `<div class="stack"><div class="notice info">Panel simplificado. Instala la versión actual del backend de Wix para ver gráficos, programa por jornada y ocupación por noche.</div><div class="metrics">${metrics.map(([title, value, unit, route], index) => goButton(route, 'personas', route === 'clientes' && index === 2 ? { state: 'accepted', arrivalState: 'registered' } : {}, `<span class="kpi-title">${title}</span><strong>${value === null || value === undefined ? 'Sin dato' : esc(value)}</strong><small>${unit}</small>`, 'kpi')).join('')}</div><div class="grid-2"><section class="panel"><div class="panel-head"><div><h2>Programa de la edición</h2><p>Abre una actividad para consultar sus recuentos completos.</p></div></div>${state.data?.items?.length ? state.data.items.map((activity) => button('open', `<strong>${esc(activity.name)}</strong><span>${esc(date(activity.eventDate))} · ${esc(display('category', activity.category))} · ${activity.timeConfirmed ? esc(date(activity.startsAt)) : 'Horario por confirmar'}</span>`, `data-id="${esc(activity._id)}" data-resource="actividades"`, 'feature-link')).join('') : '<p>No hay actividades en esta copia.</p>'}${button('nav', 'Consultar todo el programa', 'data-route="programa"')}</section><section class="panel"><div class="panel-head"><div><h2>Necesita revisión</h2><p>Condiciones informadas por la copia.</p></div></div>${goButton('clientes', 'personas', { hasDataIssues: true }, `<strong>Datos incompletos →</strong><span>${esc(data.issues ?? 'Sin dato')} personas con incidencias</span>`, 'feature-link')}${goButton('clientes', 'solicitudes', {}, `<strong>Solicitudes →</strong><span>${esc(data.requests ?? 'Sin dato')} solicitudes sin promocionar</span>`, 'feature-link')}</section></div></div>`;
}

function agendaRow(activity) {
  const hasStats = Number.isFinite(activity.entitled);
  return button('open', `<span class="agenda-main"><strong>${esc(activity.name)}</strong><small>${activity.timeConfirmed ? esc(`${time(activity.startsAt)}${activity.endsAt ? `–${time(activity.endsAt)}` : ''}`) : 'Horario por confirmar'}${activity.venue ? ` · ${esc(activity.venue)}` : ''}</small></span>${hasStats ? `<span class="agenda-stat"><strong>${number(activity.registered)}<small> / ${number(activity.entitled)}</small></strong>${bar(activity.registered, activity.entitled, activity.missing > 0 ? 'warn' : 'ok')}</span>` : ''}`, `data-id="${esc(activity._id)}" data-resource="actividades" aria-label="Consultar ${esc(activity.name)}"`, 'agenda-row');
}

export function financeSummary(state) {
  const f = state.overview?.finance || state.summary || {};
  const items = [['Exigible total', f.dueCents ?? state.summary?.dueCents], ['Cobrado neto', f.paidNetCents ?? state.summary?.paidNetCents], ['Pendiente de cobro', f.pendingCents ?? state.summary?.pendingCents], ['Devolución pendiente', f.refundPendingCents ?? state.summary?.refundPendingCents]];
  const due = items[0][1]; const paid = items[1][1];
  return `<div class="metrics">${items.map(([title, value], index) => `<div class="panel kpi static ${index === 2 && value > 0 ? 'alert' : ''}"><span class="kpi-title">${title}</span><strong>${esc(money(value))}</strong><small>Alcance: todas las personas de la copia, incluidas bajas</small>${index === 1 ? bar(paid ?? 0, due ?? 0, 'ok') : ''}</div>`).join('')}</div><p class="small muted">Los anticipos, pagos directos al hotel y devoluciones siguen las proyecciones del gestor. Los excesos no compensan deudas ajenas.</p>`;
}

function filterControl(state, current, field) {
  const value = current.filters[field];
  const options = booleanFields.has(field) ? ['true', 'false'] : field === 'state' ? state.resource === 'personas' ? ['accepted', 'cancelled', 'review'] : state.resource === 'solicitudes' ? ['review', 'waiting', 'rejected', 'promoted'] : state.resource === 'cajas' ? ['pending', 'open', 'closed', 'review'] : state.resource === 'gastos' ? ['unpaid', 'partial', 'paid', 'overpaid', 'unknown'] : state.resource === 'estancias' ? ['reserved', 'cancelled', 'review'] : ['valid', 'voided', 'review'] : enums[field];
  if (options) return `<label>${esc(labels[field] || field)}<select name="${field}"><option value="">Todos</option>${options.map((option) => `<option value="${option}" ${String(value) === option ? 'selected' : ''}>${booleanFields.has(field) ? option === 'true' ? 'Sí' : 'No' : esc(values[option] || option)}</option>`).join('')}</select></label>`;
  return `<label>${esc(labels[field] || field)}<input name="${field}" ${field.endsWith('Date') ? 'type="date"' : 'type="text" maxlength="100"'} value="${esc(value || '')}"></label>`;
}

function chipActive(chip, filters) {
  const keys = Object.keys(chip.filters);
  return keys.length === Object.keys(filters).length && keys.every((key) => filters[key] === chip.filters[key]);
}

export function tabBar(state) {
  return `<div class="tabs" role="group" aria-label="Tipo de consulta">${tabs[state.route].map((tab) => button('tab', esc(tab.label), `data-tab="${tab.key}" aria-pressed="${tab.key === state.tab}"`)).join('')}</div>`;
}

export function listView(state, current) {
  const resource = state.resource;
  const data = state.data || { items: [], total: 0 };
  const chips = resource === 'personas' ? `<div class="chips" role="group" aria-label="Filtros rápidos">${quickChips.personas.map((chip) => button('chip', esc(chip.label), `data-chip="${chip.id}" aria-pressed="${chipActive(chip, current.filters)}"`, 'chip')).join('')}</div>` : '';
  const filterCount = Object.keys(current.filters).length;
  return `${state.route === 'pagos' && resource === 'personas' ? financeSummary(state) : ''}<section class="panel ${state.refreshing ? 'refreshing' : ''}" aria-busy="${state.refreshing ? 'true' : 'false'}">${tabBar(state)}<form id="search-form"><div class="form-row">${noSearch.has(resource) ? '<p class="small">Usa los filtros por referencia para consultar este listado.</p>' : `<label>Buscar en ${esc(resources[resource][0].toLowerCase())}<input id="list-search" name="search" type="search" maxlength="100" value="${esc(current.search)}" placeholder="${resource === 'personas' ? 'Nombre, reserva, ID, correo o teléfono' : 'Código, nombre o concepto'}" autocomplete="off"></label>`}<label>Orden<select name="order"><option value="default" ${current.order === 'default' ? 'selected' : ''}>Orden de consulta</option><option value="name" ${current.order === 'name' ? 'selected' : ''}>Nombre / referencia</option><option value="pendingDesc" ${current.order === 'pendingDesc' ? 'selected' : ''}>Pendiente descendente</option><option value="date" ${current.order === 'date' ? 'selected' : ''}>Fecha</option></select></label><button type="submit" class="primary">Buscar</button></div>${chips}<details ${filterCount > (resource === 'personas' ? 1 : 0) ? 'open' : ''}><summary>Más filtros ${filterCount ? `· ${filterCount} activos` : ''}</summary><div class="filter-grid">${resources[resource][2].filter((field) => field !== 'sourceState').map((field) => filterControl(state, current, field)).join('')}</div><div class="form-row"><button class="primary" type="submit">Aplicar filtros</button>${button('clear', 'Limpiar filtros')}</div></details></form><div class="results-head"><div><h2>${esc(resources[resource][0])}</h2><p role="status">${number(data.total)} ${resource === 'personas' ? 'personas' : resource === 'solicitudes' ? 'solicitudes' : 'registros'}</p></div><div class="head-tools">${button('export', `${icon('download')}<span>${state.exporting ? 'Exportando…' : 'Exportar CSV'}</span>`, `${state.exporting || !data.total ? 'disabled' : ''}`, 'ghost')}</div></div>${data.items.length ? table(resource, data.items) : `<div class="empty"><h2>Sin resultados</h2><p>No hay registros que coincidan con esta consulta.</p>${button('clear', 'Limpiar filtros')}</div>`}<div class="list-foot"><span>${number(data.total)} registros en una sola lista</span><span>Los importes y estados proceden de la copia. Consulta el detalle para ver el contexto completo.</span></div></section>`;
}

function cell(resource, field, row, index) {
  const value = row[field];
  let html;
  if (isPillField(field, value)) html = pill(field, value);
  else if (field === 'pendingCents' || field === 'cashDifferenceCents') html = `<span class="number ${Number.isSafeInteger(value) && value !== 0 ? (field === 'pendingCents' ? 'owes' : value < 0 ? 'owes' : 'warn-text') : ''}">${esc(display(field, value))}</span>`;
  else html = `<span class="${index === 0 ? 'record-title' : field.endsWith('Cents') ? 'number' : ''}">${esc(display(field, value))}</span>`;
  const sub = index === 0 && resource === 'personas' ? `<span class="record-sub">${esc(display('danceRole', row.danceRole))}${row.isTeam ? ' · Equipo' : ''}${row.isGuest ? ' · Invitado' : ''}${row.state && row.state !== 'accepted' ? ` · ${esc(display('state', row.state))}` : ''}</span>` : '';
  const lead = index === 0 && resource === 'personas' ? `<span class="avatar sm role-${esc(row.danceRole || 'unknown')}" aria-hidden="true">${esc(initials(row.fullName))}</span>` : '';
  return `<td><span class="cell-label">${esc(labels[field] || field)}</span>${lead ? `<span class="person-cell">${lead}<span>${html}${sub}</span></span>` : `${html}${sub}`}</td>`;
}

export function table(resource, rows) {
  const fields = resources[resource][1];
  return `<div class="scroll" tabindex="0" role="region" aria-label="${esc(resources[resource][0])}"><table class="record-table"><caption class="sr-only">${esc(resources[resource][0])}</caption><thead><tr>${fields.map((field) => `<th scope="col">${esc(labels[field] || field)}</th>`).join('')}<th scope="col">Consulta</th></tr></thead><tbody>${rows.map((row) => `<tr class="${packKey(row.packageName) ? `pk-${packKey(row.packageName)}` : ""}">${fields.map((field, index) => cell(resource, field, row, index)).join('')}<td>${button('open', resource === 'personas' ? 'Ver ficha' : 'Consultar', `data-id="${esc(row._id)}" data-resource="${resource}" aria-label="${resource === 'personas' ? 'Ver ficha de' : 'Consultar'} ${esc(row.fullName || row.name || row.applicantNames || row.title || row.unitCode || row.concept || row.paymentCode || row._id)}"`, 'open-btn')}</td></tr>`).join('')}</tbody></table></div>`;
}

export function facts(row, allowed) {
  return `<dl class="facts">${(allowed || Object.keys(row)).filter((field) => !['_id', 'title', 'eventRef', 'versionRef', 'searchText'].includes(field) && row[field] !== undefined).map((field) => `<div><dt>${esc(labels[field] || field)}</dt><dd>${isPillField(field, row[field]) ? pill(field, row[field]) : esc(display(field, row[field]))}</dd></div>`).join('')}</dl>`;
}

export function programItems(state) { return state.overview?.program || state.data?.items || []; }
export function programList(state, key) {
  const type = programTypes.find((item) => item.key === key);
  return programItems(state).filter((activity) => type?.categories.includes(activity.category || 'other'));
}

export function programaView(state) {
  const key = state.tab;
  const list = programList(state, key);
  const pane = state.actPane;
  const todayDay = today();
  const days = new Map();
  for (const activity of list) { const day = activity.eventDate || 'sin-fecha'; if (!days.has(day)) days.set(day, []); days.get(day).push(activity); }
  const typeTabs = `<div class="tabs" role="group" aria-label="Tipo de actividad">${programTypes.map((type) => { const total = programList(state, type.key).length; return total || type.key === key ? button('tab', `${esc(type.label)} · ${total}`, `data-tab="${type.key}" aria-pressed="${type.key === key}"`) : ''; }).join('')}</div>`;
  const left = list.length ? `<div class="prog-list" role="group" aria-label="Actividades">${[...days].map(([day, rows]) => `<div class="prog-day">${day === 'sin-fecha' ? 'Sin fecha' : esc(dayLabel(day, true))}${day === todayDay ? ' · Hoy' : ''}</div>${rows.map((activity) => button('pick-activity', `<strong>${esc(activity.name)}</strong><small>${activity.timeConfirmed ? esc(time(activity.startsAt)) : 'Horario por confirmar'}${activity.venue ? ` · ${esc(activity.venue)}` : ''}</small>${Number.isFinite(activity.entitled) ? `<span class="prog-n">${number(activity.registered)}/${number(activity.entitled)}</span>` : ''}`, `data-id="${esc(activity._id)}" aria-pressed="${activity._id === state.selActivity}" aria-label="Consultar ${esc(activity.name)}"`, 'prog-item')).join('')}`).join('')}</div>` : '<div class="empty"><p>No hay actividades de este tipo en la copia.</p></div>';
  return `<section class="panel ${state.refreshing ? 'refreshing' : ''}">${typeTabs}<div class="prog">${left}<div class="prog-pane">${pane ? participantsPane(state, pane) : '<div class="empty"><p>Selecciona una actividad para ver su lista.</p></div>'}</div></div></section>`;
}

function participantsPane(state, data) {
  const meal = data.activity.category === 'meal';
  const group = state.activityQuery.group;
  const counts = data.counts;
  const rows = data.items;
  return `<div class="prog-head"><div><div class="eyebrow">${esc(display('category', data.activity.category))}</div><h2>${esc(data.activity.name)}</h2><p class="small">${esc(dayLabel(data.activity.eventDate, true))} · ${data.activity.timeConfirmed ? esc(time(data.activity.startsAt)) : 'Horario por confirmar'}${data.activity.venue ? ` · ${esc(data.activity.venue)}` : ''}</p></div><div class="head-tools">${button('print', `${icon('print')}<span>Imprimir lista</span>`, '', 'ghost')}${button('export-activity', `${icon('download')}<span>${state.exporting ? 'Exportando…' : 'Exportar CSV'}</span>`, state.exporting || !rows.length ? 'disabled' : '', 'ghost')}</div></div>
<div class="seg-tabs">${[['entitled', 'Con derecho'], ['registered', 'Asistencia registrada'], ['missing', 'Con derecho, sin registro']].map(([id, title]) => button('activity-group', `${title} · ${counts[id]}`, `data-group="${id}" aria-pressed="${group === id}"`)).join('')}${counts.issues ? `<span class="pill bad">${counts.issues} con incidencia</span>` : ''}<form id="activity-search" class="inline-form"><label>Buscar participante<input id="activity-search-input" type="search" name="search" maxlength="100" value="${esc(state.activityQuery.search)}" autocomplete="off"></label><button class="primary" type="submit">Buscar</button></form></div>
<div class="scroll" tabindex="0" role="region" aria-label="Lista de participantes"><table class="record-table"><caption class="sr-only">Participantes de ${esc(data.activity.name)}</caption><thead><tr><th scope="col" class="num-col">Nº</th><th scope="col">Persona</th><th scope="col">Rol</th><th scope="col">Paquete</th><th scope="col">Derecho</th><th scope="col">Asistencia</th>${meal ? '<th scope="col">Alimentación</th>' : ''}</tr></thead><tbody>${rows.map((item, index) => `<tr class="${packKey(item.person.packageName) ? `pk-${packKey(item.person.packageName)}` : ''}"><td class="num-col"><span class="cell-label">Nº</span>${index + 1}</td><td><span class="cell-label">Persona</span>${button('person-ref', esc(item.person.fullName), `data-id="${esc(item.person._id)}" aria-label="Ver ficha de ${esc(item.person.fullName)}"`, 'name-link')}<span class="record-sub inline">${esc(item.person.personCode || '')}${item.needsReview ? ' · Revisar' : ''}</span></td><td><span class="cell-label">Rol</span>${esc(display('danceRole', item.person.danceRole))}</td><td><span class="cell-label">Paquete</span>${item.person.packageName ? `<span class="pk-tag">${esc(item.person.packageName)}</span>` : 'Sin dato'}</td><td><span class="cell-label">Derecho</span>${pill('entitlement', item.entitlement || 'none')}</td><td><span class="cell-label">Asistencia</span>${pill('attendanceState', item.attendanceState || 'unknown')}</td>${meal ? `<td><span class="cell-label">Alimentación</span>${item.person.dietaryKnown ? esc(item.person.dietaryNotes || 'Sin necesidades') : 'Sin dato'}</td>` : ''}</tr>`).join('') || `<tr><td colspan="${meal ? 7 : 6}">Sin personas en este grupo.</td></tr>`}</tbody></table></div><div class="list-foot"><span>${data.total} personas en este grupo</span><span>Las asistencias fuera de derecho se conservan; los registros repetidos no aumentan el número de personas.</span></div>`;
}

export function occupancyView(state) {
  const lodging = state.overview?.lodging;
  if (!lodging) return listView(state, state.currentQuery);
  const nights = lodging.nights;
  const night = state.night && nights.some((item) => item.date === state.night) ? state.night : (nights.find((item) => item.date === today()) || nights[0])?.date;
  const index = nights.findIndex((item) => item.date === night);
  const summary = nights[index];
  const filter = state.roomFilter || 'all';
  const rooms = lodging.rooms.map((room) => {
    const count = room.occupancy[index] ?? 0;
    const known = Number.isSafeInteger(room.capacity) && room.capacity > 0 && room.isAvailable === true;
    const status = room.isAvailable === false ? 'off' : Number.isSafeInteger(room.capacity) && count > room.capacity ? 'over' : !known ? 'unknown' : count === 0 ? 'free' : count >= room.capacity ? 'full' : 'part';
    return { room, count, status };
  });
  const statusText = { off: 'Fuera de servicio', over: 'Sobre capacidad', unknown: 'Capacidad sin dato', free: 'Libre', full: 'Completa', part: 'Con plazas libres' };
  const statusTone = { off: 'neutral', over: 'bad', unknown: 'neutral', free: 'ok', full: 'info', part: 'warn' };
  const counts = { all: rooms.length, free: rooms.filter((r) => r.status === 'free').length, part: rooms.filter((r) => r.status === 'part').length, full: rooms.filter((r) => r.status === 'full').length, over: rooms.filter((r) => r.status === 'over').length };
  const shown = rooms.filter((r) => filter === 'all' || r.status === filter);
  const free = summary && summary.capacity > 0 ? Math.max(summary.capacity - summary.assigned, 0) : null;
  return `<section class="panel ${state.refreshing ? 'refreshing' : ''}">${tabBar(state)}${nights.length ? `<div class="chips" role="group" aria-label="Noche">${nights.map((item) => button('night', esc(dayLabel(item.date)), `data-night="${esc(item.date)}" aria-pressed="${item.date === night}"`, 'chip')).join('')}</div>
<div class="metrics compact-metrics"><div class="panel kpi static"><span class="kpi-title">Alojados esa noche</span><strong>${number(summary?.assigned)}</strong><small>${summary?.capacity ? `de ${number(summary.capacity)} plazas en servicio` : 'Capacidad sin dato'}</small>${summary?.capacity ? bar(summary.assigned, summary.capacity, summary.assigned > summary.capacity ? 'bad' : 'info') : ''}</div><div class="panel kpi static"><span class="kpi-title">Plazas libres</span><strong>${free === null ? 'Sin dato' : number(free)}</strong><small>${counts.free} unidades libres</small></div><div class="panel kpi static ${counts.over ? 'alert' : ''}"><span class="kpi-title">Sobre capacidad</span><strong>${counts.over}</strong><small>unidades esa noche</small></div></div>
${lodging.unknownDates ? `<div class="notice info">${lodging.unknownDates} estancias tienen fechas desconocidas y no se cuentan en la ocupación.</div>` : ''}
<div class="chips" role="group" aria-label="Estado de la unidad">${[['all', 'Todas'], ['free', 'Libres'], ['part', 'Con plazas'], ['full', 'Completas'], ['over', 'Sobre capacidad']].map(([key, text]) => button('room-filter', `${text} · ${counts[key]}`, `data-filter="${key}" aria-pressed="${filter === key}"`, 'chip')).join('')}</div>
<div class="room-grid">${shown.map(({ room, count, status }) => `<article class="room-card ${status}"><header><div><h3>${esc(room.unitCode)}</h3><p class="small">Hotel: ${esc(room.hotelRoomNumber || 'Sin dato')} · ${esc(display('roomType', room.roomType))}</p></div><span class="pill ${statusTone[status]}">${statusText[status]}</span></header><div class="room-occ"><strong>${count}</strong><span>/ ${room.capacity ?? '?'} plazas</span></div>${bar(count, room.capacity || 0, status === 'over' ? 'bad' : status === 'full' ? 'info' : 'ok')}${button('open', 'Ver ocupantes →', `data-id="${esc(room._id)}" data-resource="habitaciones" aria-label="Consultar ${esc(room.unitCode)}"`, 'open-btn')}</article>`).join('') || '<div class="empty"><p>No hay unidades con ese estado esa noche.</p></div>'}</div>
<p class="small muted">La noche de salida queda fuera de la estancia. Las asignaciones no equivalen a llegadas registradas.</p>` : '<div class="empty"><h2>Sin estancias</h2><p>No hay estancias con fechas conocidas en esta copia.</p></div>'}</section>`;
}

export function personView(state) {
  const d = state.detail;
  const p = d.person;
  const activities = new Map(d.activities.map((row) => [row._id, row]));
  const rooms = new Map(d.rooms.map((row) => [row._id, row]));
  const payments = new Map(d.payments.map((row) => [row._id, row]));
  const due = p.dueCents; const paid = p.paidNetCents;
  const tel = safeTel(p.phone);
  const others = d.people.filter((person) => person._id !== p._id);
  const nights = (stay) => (stay.checkInDate && stay.checkOutDate ? Math.round((Date.parse(`${stay.checkOutDate}T00:00:00Z`) - Date.parse(`${stay.checkInDate}T00:00:00Z`)) / 86400000) : null);
  return `<div class="stack"><div class="crumbs">${button('back', '← Volver a la consulta')}${button('print', `${icon('print')}<span>Imprimir ficha</span>`, '', 'ghost')}</div>
<section class="panel person-head"><div class="avatar lg role-${esc(p.danceRole || 'unknown')}" aria-hidden="true">${esc(initials(p.fullName))}</div><div class="person-id"><div class="eyebrow">Ficha de consulta</div><h2>${esc(p.fullName)}</h2><p>${esc(p.personCode)} · ${esc(d.reservation.reservationCode)}</p><div class="pill-row">${pill('state', p.state)}${p.paymentState ? pill('paymentState', p.paymentState) : ''}${p.arrivalState ? `<span class="pill ${tone(p.arrivalState)}">Llegada: ${esc(display('arrivalState', p.arrivalState).toLowerCase())}</span>` : ''}${p.packageName ? `<span class="pill neutral">${esc(p.packageName)}</span>` : ''}${p.danceRole ? `<span class="pill neutral">${esc(display('danceRole', p.danceRole))}</span>` : ''}${p.isTeam ? '<span class="pill info">Equipo</span>' : ''}${p.isGuest ? '<span class="pill info">Invitado</span>' : ''}${p.hasDataIssues ? '<span class="pill bad">Datos por revisar</span>' : ''}</div>${p.dataIssueDetail ? `<p class="small">${esc(p.dataIssueDetail)}</p>` : ''}</div><div class="contact-actions">${tel ? `<a class="action-link" href="tel:${esc(tel)}">${icon('phone')}<span>Llamar</span></a>` : ''}${p.email ? `<a class="action-link" href="mailto:${esc(p.email)}">${icon('mail')}<span>Escribir</span></a>` : ''}</div></section>
<section class="panel"><div class="panel-head"><h2>Pagos y saldo individual</h2></div><div class="balance"><div class="balance-main ${p.pendingCents > 0 ? 'owes' : 'ok'}"><span>Pendiente</span><strong>${esc(money(p.pendingCents))}</strong></div><div class="balance-bar">${stackedBar([{ value: paid || 0, tone: 'ok' }, { value: p.pendingCents || 0, tone: 'bad' }])}<div class="balance-legend"><span><i class="swatch c-ok"></i>Cobrado neto ${esc(money(paid))}</span><span><i class="swatch c-bad"></i>Pendiente ${esc(money(p.pendingCents))}</span><span>Exigible ${esc(money(due))}</span></div></div></div>${facts(p, ['eventDueCents', 'hotelDueCents', 'advanceNetCents', 'eventPaidNetCents', 'hotelDirectPaidCents', 'overpaidCents', 'refundPendingCents'])}
<div class="detail-section"><h3>Movimientos económicos</h3>${d.payments.length ? `<ul class="timeline">${d.payments.map((pay) => `<li><span class="tl-date">${esc(date(pay.paymentDate || pay.occurredAt))}</span><span class="tl-main"><strong>${esc(pay.paymentCode || 'Movimiento')}</strong><small>${esc(display('method', pay.method))} · ${esc(display('destination', pay.destination))}${pay.payerName ? ` · ${esc(pay.payerName)}` : ''}</small></span><span class="tl-amount">${esc(money(pay.amountCents))}</span>${pay.state && pay.state !== 'valid' ? pill('state', pay.state) : ''}</li>`).join('')}</ul>` : '<p class="small">Sin movimientos relacionados en esta copia.</p>'}</div>
<div class="detail-section"><h3>Parte imputada a esta persona</h3>${d.allocations.length ? `<ul class="timeline">${d.allocations.map((alloc) => `<li><span class="tl-date">${esc(display('destination', alloc.destination))}</span><span class="tl-main"><strong>${esc(payments.get(ref(alloc.paymentRef))?.paymentCode || 'Movimiento')}</strong></span><span class="tl-amount">${esc(money(alloc.amountCents))}</span></li>`).join('')}</ul>` : '<p class="small">Sin imputaciones en esta copia.</p>'}</div></section>
<div class="grid-2"><section class="panel"><h2>Programa y asistencia</h2>${d.participations.length ? `<ul class="timeline">${d.participations.map((part) => { const act = activities.get(ref(part.activityRef)); return `<li><span class="tl-date">${esc(act ? date(act.eventDate) : '')}</span><span class="tl-main"><strong>${esc(act?.name || part.title || 'Actividad')}</strong><small>Derecho: ${esc(display('entitlement', part.entitlement))}${part.needsReview ? ' · Revisar' : ''}</small></span>${pill('attendanceState', part.attendanceState || 'unknown')}</li>`; }).join('')}</ul>` : '<p class="small">Sin participaciones en esta copia.</p>'}</section>
<section class="panel"><h2>Alojamiento</h2>${d.stays.length ? `<ul class="timeline">${d.stays.map((stay) => { const room = rooms.get(ref(stay.roomRef)); const n = nights(stay); return `<li><span class="tl-date">${esc(date(stay.checkInDate))}</span><span class="tl-main"><strong>${esc(room?.unitCode || 'Unidad')}${room?.hotelRoomNumber ? ` · hotel ${esc(room.hotelRoomNumber)}` : ''}</strong><small>Salida ${esc(date(stay.checkOutDate))}${n ? ` · ${n} noches` : ''}${stay.bedLabel ? ` · ${esc(stay.bedLabel)}` : ''}</small></span>${pill('state', stay.state || 'unknown')}</li>`; }).join('')}</ul>` : '<p class="small">Sin estancias en esta copia.</p>'}</section></div>
<section class="panel"><h2>Reserva ${esc(d.reservation.reservationCode)}</h2>${facts(d.reservation, ['packageName', 'sourceChannel', 'registeredAt', 'sourceState', 'webId'])}<div class="detail-section"><h3>Otras personas de la reserva</h3>${others.length ? `<div class="chips">${others.map((person) => button('person-ref', `${esc(person.fullName)} · ${esc(person.personCode)}${person.pendingCents > 0 ? ` · debe ${esc(money(person.pendingCents))}` : ''}`, `data-id="${esc(person._id)}"`, 'chip')).join('')}</div>` : '<p class="small">No hay otras personas en esta reserva.</p>'}</div></section>
<section class="panel"><details><summary>Contacto y notas operativas</summary>${facts(p, ['email', 'phone', 'dietaryKnown', 'dietaryNotes', 'operationNote', 'country', 'nationality', 'city'])}</details></section></div>`;
}

export function roomView(state) {
  const data = state.room;
  return `<section class="panel"><div class="panel-head"><div><div class="eyebrow">Unidad</div><h2>Unidad ${esc(data.room.unitCode)}</h2><p>Número del hotel: ${esc(data.room.hotelRoomNumber || 'Sin dato')} · ${esc(display('roomType', data.room.roomType))}</p></div>${button('back', '← Volver')}</div><form id="night-form" class="form-row night-row">${button('room-night', '‹ Noche anterior', `data-step="-1"`, 'ghost')}<label>Noche de alojamiento<input type="date" name="night" required value="${esc(data.night)}"></label><button class="primary" type="submit">Consultar noche</button>${button('room-night', 'Noche siguiente ›', `data-step="1"`, 'ghost')}</form><div class="results-head"><p>${data.assigned} personas asignadas · ${data.free === null ? 'Plazas libres: Sin dato' : `${data.free} plazas libres`} · Capacidad: ${esc(data.room.capacity ?? 'Sin dato')}</p></div>${data.unknownDates ? `<div class="notice">${data.unknownDates} estancias tienen fechas desconocidas. No se puede afirmar la disponibilidad.</div>` : ''}${data.overCapacity ? '<div class="notice">Las asignaciones superan la capacidad informada.</div>' : ''}<p class="small">La noche de salida queda fuera de la estancia. Las asignaciones no equivalen a llegadas registradas.</p>${data.items.map((item) => `<div class="detail-section"><strong>${esc(item.person.fullName)}</strong>${facts(item, ['checkInDate', 'checkOutDate', 'bedLabel', 'state'])}${button('person-ref', 'Ver ficha', `data-id="${esc(item.person._id)}"`, 'open-btn')}</div>`).join('') || '<div class="empty"><p>No hay personas asignadas para esta noche.</p></div>'}</section>`;
}
