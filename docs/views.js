import { sections, resources, tabs, labels, values, enums, booleanFields, noSearch, quickChips, programTypes, packKey, saldosColumns } from './catalogue.js?v=1.2.0';
import { esc, ref, money, moneyShort, number, percent, date, time, dayLabel, display, initials, tone, pill, isPillField, button, safeTel, splitFinance, withSplit } from './format.js?v=1.2.0';
import { bar, stackedBar, donut, ring, legend } from './charts.js?v=1.2.0';

const attr = (value) => esc(JSON.stringify(value));
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
export function icon(name) {
  const paths = { resumen: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', clientes: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', pagos: 'M2 5h20v14H2z M2 10h20 M6 15h3', programa: 'M3 5h18v16H3z M16 3v4 M8 3v4 M3 11h18', alojamiento: 'M3 21V3h13v18 M16 10h5v11 M7 7h5 M7 11h5 M7 15h5 M8 21v-3h4v3', caja: 'M3 7h18v14H3z M7 7V3h10v4 M8 12h8', lock: 'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 15v2', more: 'M5 12h1 M11 12h1 M17 12h1', search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3', download: 'M12 3v12 M7 10l5 5 5-5 M4 21h16', print: 'M6 9V3h12v6 M6 18H4v-7h16v7h-2 M6 14h12v7H6z', refresh: 'M21 12a9 9 0 1 1-3-6.7 M21 3v6h-6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2', mail: 'M3 5h18v14H3z M3 7l9 6 9-6', alert: 'M12 3l10 18H2z M12 10v5 M12 18h.01', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2', menu: 'M4 6h16 M4 12h16 M4 18h16', logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9' };
  return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.resumen}"/></svg>`;
}

export function navButton(state, route, mobile = false, badge = 0) {
  const label = sections[route][0];
  return button('nav', `${icon(route)}<span class="${mobile ? '' : 'nav-label'}">${label}</span>${badge ? `<span class="nav-badge" aria-label="${badge} por revisar">${badge}</span>` : ''}`, `data-route="${route}" aria-label="${label}" title="${label}" ${state.route === route ? 'aria-current="page"' : ''}`, mobile ? 'bottom-link' : 'nav-button');
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
    kpi({ title: 'Cobrado neto', value: moneyShort(paid), sub: f.event ? `Baztango ${moneyShort(f.event.paidNetCents)} · Hotel ${moneyShort(f.hotel.paidNetCents)}` : due === null ? 'Exigible sin dato' : `de ${moneyShort(due)} exigibles`, barHtml: bar(paid ?? 0, due ?? 0, 'ok'), go: { route: 'pagos', filters: { state: 'accepted' } } }),
    kpi({ title: 'Pendiente de cobro', value: moneyShort(f.pendingCents), sub: f.event ? `Baztango ${moneyShort(f.event.pendingCents)} · Hotel ${moneyShort(f.hotel.pendingCents)}` : `${number(f.withDebt)} personas con deuda`, toneName: f.pendingCents > 0 ? 'alert' : '', go: { route: 'pagos', filters: { state: 'accepted' } } })
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
  const focusActivities = o.program.filter((activity) => activity.eventDate === programFocus).sort(chrono);
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
${cobrosPanel(f, paid, due)}
<div class="grid-2">
<section class="panel"><div class="panel-head"><div><h2>Situación económica</h2><p>Personas aceptadas por estado de pago.</p></div></div><div class="donut-row">${donut(states, { label: 'Personas aceptadas por situación económica', center: String(acceptedTotal), sub: 'personas' })}${legend(states.map((row) => ({ html: goButton('clientes', 'personas', { state: 'accepted', paymentState: row.key }, `<span class="swatch ${row.tone}"></span><span class="legend-name">${esc(row.label)}</span><strong>${row.value}</strong>`, 'legend-link', `${row.label}: ${row.value} personas. Ver en clientes`) })))}</div></section>
<section class="panel"><div class="panel-head"><div><h2>Llegadas</h2><p>Registro de llegada general.</p></div></div><div class="donut-row">${ring(t.arrived, t.accepted, { label: `${t.arrived} de ${t.accepted} personas han llegado` })}<div><strong class="big">${number(t.arrived)}</strong><p class="small">de ${number(t.accepted)} aceptadas<br>${number(Math.max(t.accepted - t.arrived, 0))} pendientes</p></div></div>${arrivalsChart}<p class="small">Las llegadas registradas no indican ocupación en vivo.</p></section>
</div>
<div class="grid-2">
<section class="panel"><div class="panel-head"><div><h2>${programFocus ? (programFocus === todayDay ? 'Programa de hoy' : `Programa · ${esc(dayLabel(programFocus, true))}`) : 'Programa'}</h2><p>Derechos y asistencia registrada por actividad.</p></div>${button('nav', 'Agenda completa', 'data-route="programa"', 'link-button')}</div>${focusActivities.length ? focusActivities.map(agendaRow).join('') : '<p>No hay actividades en esta copia.</p>'}</section>
<section class="panel"><div class="panel-head"><div><h2>Alojamiento por noche</h2><p>Personas con estancia por noche${o.lodging.nights[0]?.capacity ? ` · ${number(o.lodging.nights[0].capacity)} plazas en servicio` : ''}.</p></div>${button('nav', 'Ver unidades', 'data-route="alojamiento"', 'link-button')}</div>${nightsChart}</section>
</div>
<div class="grid-2">
<section class="panel"><div class="panel-head"><div><h2>Mayores pendientes</h2><p>Personas aceptadas con más importe por cobrar.</p></div>${button('filter-go', 'Ver todos', `data-route="pagos" data-resource="personas" data-filters="${attr({ state: 'accepted' })}"`, 'link-button')}</div>${o.debtors.length ? `<ol class="rank">${o.debtors.map((person, index) => `<li>${button('person-ref', `<span class="rank-n">${index + 1}</span><span class="rank-name"><strong>${esc(person.fullName)}</strong><small>${esc(person.personCode || '')}${person.packageName ? ` · ${esc(person.packageName)}` : ''}</small></span><span class="rank-amount">${esc(money(person.pendingCents))}${splitLine(person)}</span>`, `data-id="${esc(person._id)}" aria-label="Ver ficha de ${esc(person.fullName)}"`, 'rank-link')}</li>`).join('')}</ol>` : '<p>No hay importes pendientes.</p>'}</section>
<section class="panel"><div class="panel-head"><div><h2>Necesita revisión</h2><p>Condiciones informadas por la copia.</p></div></div>${attention.length ? `<ul class="attention">${attention.map(([count, text, route, resource, filters]) => `<li>${goButton(route, resource, filters, `<span class="attn-count">${number(count)}</span><span>${esc(text)}</span><span aria-hidden="true">→</span>`, 'attn-link')}</li>`).join('')}</ul>` : '<p class="ok-note">Todo en orden: no hay incidencias informadas en esta copia.</p>'}</section>
</div>
<section class="panel"><div class="panel-head"><div><h2>Perfil del grupo</h2><p>Reparto de las personas aceptadas.</p></div></div><div class="grid-3 flat"><div><h3>Rol</h3>${roleRows(o.byRole, t.accepted, 'brand', 'danceRole')}</div><div><h3>Paquete</h3>${roleRows(o.byPackage, t.accepted, 'info')}</div><div><h3>País / región</h3>${roleRows(o.byCountry, t.accepted, 'warn')}</div></div></section></div>`;
}

const pendingSplitText = (p) => { const s = splitFinance(p); return s ? `Baztango ${money(s.event.pending)} · Hotel ${money(s.hotel.pending)}` : ''; };
const splitLine = (p) => { const text = pendingSplitText(p); return text ? `<small>${esc(text)}</small>` : ''; };

function cobrosPanel(f, paid, due) {
  const col = (title, s) => `<div><h3>${title}</h3>${stackedBar([{ value: Math.max(s.paidNetCents, 0), tone: 'ok' }, { value: s.pendingCents, tone: 'bad' }])}<dl class="money-list"><div><dt>Exigible</dt><dd>${esc(money(s.dueCents))}</dd></div><div><dt><span class="swatch c-ok"></span>Cobrado neto</dt><dd>${esc(money(s.paidNetCents))}</dd></div><div><dt><span class="swatch c-bad"></span>Pendiente</dt><dd>${esc(money(s.pendingCents))}</dd></div></dl></div>`;
  const totals = `<div><h3>Total</h3>${stackedBar([{ value: paid || 0, tone: 'ok' }, { value: f.pendingCents || 0, tone: 'bad' }])}<dl class="money-list"><div><dt>Exigible total</dt><dd>${esc(money(due))}</dd></div><div><dt><span class="swatch c-ok"></span>Cobrado neto</dt><dd>${esc(money(paid))}</dd></div><div><dt><span class="swatch c-bad"></span>Pendiente</dt><dd>${esc(money(f.pendingCents))}</dd></div><div><dt>Devolución pendiente</dt><dd>${esc(money(f.refundPendingCents))}</dd></div><div><dt>Exceso de cobro</dt><dd>${esc(money(f.overpaidCents))}</dd></div></dl></div>`;
  return `<section class="panel"><div class="panel-head"><div><h2>Cobros: Baztango y Hotel</h2><p>Todas las personas de la copia, incluidas bajas.${f.splitUnknown ? ` ${f.splitUnknown} personas sin desglose Baztango/Hotel no se reparten.` : ''}</p></div>${button('nav', 'Ver saldos por persona →', 'data-route="pagos"', 'link-button')}</div>${f.event ? `<div class="grid-3 flat">${col('Baztango', f.event)}${col('Hotel', f.hotel)}${totals}</div>` : `<div class="grid-3 flat">${totals}</div>`}</section>`;
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
  const items = [['Exigible total', f.dueCents ?? state.summary?.dueCents, 'dueCents'], ['Cobrado neto', f.paidNetCents ?? state.summary?.paidNetCents, 'paidNetCents'], ['Pendiente de cobro', f.pendingCents ?? state.summary?.pendingCents, 'pendingCents'], ['Devolución pendiente', f.refundPendingCents ?? state.summary?.refundPendingCents]];
  return `<div class="metrics strip" title="Alcance: todas las personas de la copia, incluidas bajas">${items.map(([title, value, side], index) => `<div class="kpi static ${index === 2 && value > 0 ? 'alert' : ''}"><span class="kpi-title">${title}</span><strong>${esc(money(value))}</strong>${side && f.event ? `<small>Baztango ${esc(money(f.event[side]))} · Hotel ${esc(money(f.hotel[side]))}</small>` : ''}</div>`).join('')}</div>`;
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

export function sortRows(rows, sort) {
  if (!sort?.key) return rows;
  const dir = sort.dir === 'desc' ? -1 : 1;
  const empty = (value) => value === null || value === undefined || value === '';
  return [...rows].sort((a, b) => {
    const x = a[sort.key]; const y = b[sort.key];
    if (empty(x) || empty(y)) return empty(x) === empty(y) ? 0 : empty(x) ? 1 : -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(display(sort.key, x)).localeCompare(String(display(sort.key, y)), 'es', { numeric: true, sensitivity: 'base' }) * dir;
  });
}

export function listView(state, current) {
  const resource = state.resource;
  const data = state.data || { items: [], total: 0 };
  const saldos = state.route === 'pagos' && resource === 'personas';
  const rows = sortRows(saldos ? data.items.map(withSplit) : data.items, current.sort);
  const chips = resource === 'personas' ? `<div class="chips" role="group" aria-label="Filtros rápidos">${quickChips.personas.map((chip) => button('chip', esc(chip.label), `data-chip="${chip.id}" aria-pressed="${chipActive(chip, current.filters)}"`, 'chip')).join('')}</div>` : '';
  const filterCount = Object.keys(current.filters).length;
  const unit = resource === 'personas' ? 'personas' : resource === 'solicitudes' ? 'solicitudes' : 'registros';
  const search = noSearch.has(resource) ? '<span class="small grow">Usa los filtros por referencia para consultar este listado.</span>' : `<label class="grow"><span class="sr-only">Buscar en ${esc(resources[resource][0].toLowerCase())}</span><input id="list-search" name="search" type="search" maxlength="100" value="${esc(current.search)}" placeholder="${resource === 'personas' ? 'Buscar: nombre, reserva, ID, correo o teléfono' : 'Buscar: código, nombre o concepto'}" autocomplete="off"></label>`;
  const order = `<label class="order"><span class="sr-only">Orden</span><select name="order"><option value="default" ${current.order === 'default' ? 'selected' : ''}>Orden de consulta</option><option value="name" ${current.order === 'name' ? 'selected' : ''}>Nombre / referencia</option><option value="pendingDesc" ${current.order === 'pendingDesc' ? 'selected' : ''}>Pendiente descendente</option><option value="date" ${current.order === 'date' ? 'selected' : ''}>Fecha</option></select></label>`;
  return `${state.route === 'pagos' && resource === 'personas' ? financeSummary(state) : ''}<section class="panel list-panel ${state.refreshing ? 'refreshing' : ''}" aria-busy="${state.refreshing ? 'true' : 'false'}"><div class="bar-row">${tabBar(state)}<div class="bar-tools"><span class="count" role="status">${number(data.total)} ${unit}</span>${button('export', `${icon('download')}<span>${state.exporting ? 'Exportando…' : 'Exportar CSV'}</span>`, `${state.exporting || !data.total ? 'disabled' : ''}`, 'ghost')}</div></div><h2 class="sr-only">${esc(resources[resource][0])}</h2>
<form id="search-form" class="toolbar">${search}${order}<button type="submit" class="primary">Buscar</button>${chips}<details class="more-filters" ${filterCount > (resource === 'personas' ? 1 : 0) ? 'open' : ''}><summary>Más filtros ${filterCount ? `· ${filterCount} activos` : ''}</summary><div class="filter-grid">${resources[resource][2].filter((field) => field !== 'sourceState').map((field) => filterControl(state, current, field)).join('')}</div><div class="form-row"><button class="primary" type="submit">Aplicar filtros</button>${button('clear', 'Limpiar filtros')}</div></details></form>
${rows.length ? table(resource, rows, current.sort, saldos ? saldosColumns : undefined) : `<div class="empty"><h2>Sin resultados</h2><p>No hay registros que coincidan con esta consulta.</p>${button('clear', 'Limpiar filtros')}</div>`}<div class="list-foot"><span>Pulsa una fila para abrir su ficha · pulsa una cabecera para ordenar</span><span>Importes y estados de la copia publicada</span></div></section>`;
}

function cell(resource, field, row, index) {
  const value = row[field];
  let html;
  if (isPillField(field, value)) html = pill(field, value);
  else if (['pendingCents', 'pendingEventCents', 'pendingHotelCents', 'cashDifferenceCents'].includes(field)) html = `<span class="number ${Number.isSafeInteger(value) && value !== 0 ? (field !== 'cashDifferenceCents' ? 'owes' : value < 0 ? 'owes' : 'warn-text') : ''}">${esc(display(field, value))}</span>`;
  else html = `<span class="${index === 0 ? 'record-title' : field.endsWith('Cents') ? 'number' : ''}">${esc(display(field, value))}</span>`;
  const sub = index === 0 && resource === 'personas' ? `<span class="record-sub">${esc(display('danceRole', row.danceRole))}${row.isTeam ? ' · Equipo' : ''}${row.isGuest ? ' · Invitado' : ''}${row.state && row.state !== 'accepted' ? ` · ${esc(display('state', row.state))}` : ''}</span>` : '';
  const lead = index === 0 && resource === 'personas' ? `<span class="avatar sm role-${esc(row.danceRole || 'unknown')}" aria-hidden="true">${esc(initials(row.fullName))}</span>` : '';
  return `<td><span class="cell-label">${esc(labels[field] || field)}</span>${lead ? `<span class="person-cell">${lead}<span>${html}${sub}</span></span>` : `${html}${sub}`}</td>`;
}

export function table(resource, rows, sort, columns) {
  const fields = columns || resources[resource][1];
  const head = fields.map((field) => {
    const active = sort?.key === field;
    return `<th scope="col" ${active ? `aria-sort="${sort.dir === 'desc' ? 'descending' : 'ascending'}"` : ''}>${button('sort', `${esc(labels[field] || field)}<span class="sort-mark ${active ? 'on' : ''}" aria-hidden="true">${active ? (sort.dir === 'desc' ? '▼' : '▲') : '↕'}</span>`, `data-key="${field}"`, 'th-sort')}</th>`;
  }).join('');
  return `<div class="scroll" tabindex="0" role="region" aria-label="${esc(resources[resource][0])}"><table class="record-table clickable"><caption class="sr-only">${esc(resources[resource][0])}</caption><thead><tr>${head}<th scope="col" class="act-col">Consulta</th></tr></thead><tbody>${rows.map((row) => `<tr data-id="${esc(row._id)}" data-resource="${resource}" class="${packKey(row.packageName) ? `pk-${packKey(row.packageName)}` : ''}">${fields.map((field, index) => cell(resource, field, row, index)).join('')}<td class="act-col">${button('open', resource === 'personas' ? 'Ver ficha' : 'Consultar', `data-id="${esc(row._id)}" data-resource="${resource}" aria-label="${resource === 'personas' ? 'Ver ficha de' : 'Consultar'} ${esc(row.fullName || row.name || row.applicantNames || row.title || row.unitCode || row.concept || row.paymentCode || row._id)}"`, 'open-btn')}</td></tr>`).join('')}</tbody></table></div>`;
}

export function facts(row, allowed, { compact = false } = {}) {
  const hidden = (field, value) => compact && (value === null || value === undefined || value === '' || (field.endsWith('Cents') && value === 0));
  const shown = (allowed || Object.keys(row)).filter((field) => !['_id', 'title', 'eventRef', 'versionRef', 'searchText'].includes(field) && row[field] !== undefined && !hidden(field, row[field]));
  if (!shown.length) return '<p class="small">Sin datos que mostrar.</p>';
  return `<dl class="facts">${shown.map((field) => `<div><dt>${esc(labels[field] || field)}</dt><dd>${isPillField(field, row[field]) ? pill(field, row[field]) : esc(display(field, row[field]))}</dd></div>`).join('')}</dl>`;
}

// Orden cronológico: jornada, hora confirmada (las de horario por confirmar, al final del día), orden de programa y nombre.
export function chrono(a, b) {
  const x = a || {}; const y = b || {};
  const dx = String(x.eventDate || '9999'); const dy = String(y.eventDate || '9999');
  if (dx !== dy) return dx < dy ? -1 : 1;
  const tx = x.timeConfirmed && x.startsAt ? String(x.startsAt) : '~'; const ty = y.timeConfirmed && y.startsAt ? String(y.startsAt) : '~';
  if (tx !== ty) return tx < ty ? -1 : 1;
  return (x.sortOrder ?? 0) - (y.sortOrder ?? 0) || String(x.name || '').localeCompare(String(y.name || ''), 'es');
}
// Agrupa por jornada, en orden cronológico, dejando «sin fecha» al final. `activityOf` extrae la actividad de cada elemento.
export function groupByDay(items, activityOf = (item) => item) {
  const sorted = [...items].sort((a, b) => chrono(activityOf(a), activityOf(b)));
  const days = new Map();
  for (const item of sorted) { const day = activityOf(item)?.eventDate || 'sin-fecha'; if (!days.has(day)) days.set(day, []); days.get(day).push(item); }
  return days;
}
export function programItems(state) { return state.overview?.program || state.data?.items || []; }
export function programList(state, key) {
  const type = programTypes.find((item) => item.key === key);
  return programItems(state).filter((activity) => type?.categories.includes(activity.category || 'other')).sort(chrono);
}

export function programaView(state) {
  const key = state.tab;
  const list = programList(state, key);
  const pane = state.actPane;
  const todayDay = today();
  const hidden = Boolean(state.listHidden && pane);
  const days = groupByDay(list);
  const typeTabs = `<div class="bar-row"><div class="tabs" role="group" aria-label="Tipo de actividad">${programTypes.map((type) => { const total = programList(state, type.key).length; return total || type.key === key ? button('tab', `${esc(type.label)} · ${total}`, `data-tab="${type.key}" aria-pressed="${type.key === key}"`) : ''; }).join('')}</div></div>`;
  const left = list.length ? `<div class="prog-list" role="group" aria-label="Actividades">${[...days].map(([day, rows]) => `<div class="prog-day">${day === 'sin-fecha' ? 'Sin fecha' : esc(dayLabel(day, true))}${day === todayDay ? ' · Hoy' : ''}</div>${rows.map((activity) => button('pick-activity', `<strong>${esc(activity.name)}</strong><small>${activity.timeConfirmed ? esc(time(activity.startsAt)) : 'Horario por confirmar'}${activity.venue ? ` · ${esc(activity.venue)}` : ''}</small>${Number.isFinite(activity.entitled) ? `<span class="prog-n">${number(activity.registered)}/${number(activity.entitled)}</span>` : ''}`, `data-id="${esc(activity._id)}" aria-pressed="${activity._id === state.selActivity}" aria-label="Consultar ${esc(activity.name)}"`, 'prog-item')).join('')}`).join('')}</div>` : '<div class="empty"><p>No hay actividades de este tipo en la copia.</p></div>';
  return `<section class="panel prog-panel ${state.refreshing ? 'refreshing' : ''}">${typeTabs}<div class="prog ${hidden ? 'no-list' : ''}">${hidden ? '' : left}<div class="prog-pane">${pane ? participantsPane(state, pane, list) : `<div class="empty"><p>Selecciona una actividad para ver su lista.</p></div>`}</div></div></section>`;
}

function participantRow(item, index, attendance, meal) {
  const person = item.person;
  const name = `<td><span class="cell-label">Persona</span>${button('person-ref', esc(person.fullName), `data-id="${esc(person._id)}" aria-label="Ver ficha de ${esc(person.fullName)}"`, 'name-link')}<span class="record-sub inline">${esc(person.personCode || '')}${item.needsReview ? ' · Revisar' : ''}</span></td>`;
  const pack = `<td><span class="cell-label">Paquete</span>${person.packageName ? `<span class="pk-tag">${esc(person.packageName)}</span>` : 'Sin dato'}</td>`;
  const entitlement = `<td><span class="cell-label">Derecho</span>${pill('entitlement', item.entitlement || 'none')}</td>`;
  const lead = `<td class="num-col"><span class="cell-label">Nº</span>${index + 1}</td>`;
  const klass = packKey(person.packageName) ? `pk-${packKey(person.packageName)}` : '';
  if (attendance) return `<tr class="${klass}">${lead}${name}${pack}<td><span class="cell-label">Asistencia</span>${pill('attendanceState', item.attendanceState || 'unknown')}</td>${entitlement}<td><span class="cell-label">Registros</span>${item.validRecordCount > 0 ? number(item.validRecordCount) : '–'}</td></tr>`;
  return `<tr class="${klass}">${lead}${name}<td><span class="cell-label">Rol</span>${esc(display('danceRole', person.danceRole))}</td>${pack}${entitlement}${meal ? `<td><span class="cell-label">Alimentación</span>${person.dietaryKnown ? esc(person.dietaryNotes || 'Sin necesidades') : 'Sin dato'}</td>` : ''}</tr>`;
}

function participantsPane(state, data, list) {
  const meal = data.activity.category === 'meal';
  const { group, search, mode } = state.activityQuery;
  const attendance = mode === 'attendance';
  const counts = data.counts;
  const rows = data.items;
  const hidden = Boolean(state.listHidden);
  const switcher = hidden && list.length ? `<label class="act-switch"><span class="sr-only">Actividad</span><select id="act-switch">${list.map((activity) => `<option value="${esc(activity._id)}" ${activity._id === state.selActivity ? 'selected' : ''}>${esc(dayLabel(activity.eventDate))} · ${esc(activity.name)}</option>`).join('')}</select></label>` : '';
  const heads = attendance ? ['Nº', 'Persona', 'Paquete', 'Asistencia', 'Derecho', 'Registros'] : ['Nº', 'Persona', 'Rol', 'Paquete', 'Derecho', ...(meal ? ['Alimentación'] : [])];
  const groups = [['entitled', 'Todos con derecho'], ['registered', 'Asistencia registrada'], ['missing', 'Con derecho, sin registro']];
  return `<div class="prog-head"><div><div class="eyebrow">${esc(display('category', data.activity.category))}</div><h2>${esc(data.activity.name)}</h2><p class="small">${esc(dayLabel(data.activity.eventDate, true))} · ${data.activity.timeConfirmed ? esc(time(data.activity.startsAt)) : 'Horario por confirmar'}${data.activity.venue ? ` · ${esc(data.activity.venue)}` : ''}</p></div><div class="head-tools">${switcher}${button('toggle-list', `${icon('menu')}<span>${hidden ? 'Mostrar actividades' : 'Ocultar actividades'}</span>`, `aria-expanded="${!hidden}"`, 'ghost')}${button('print', `${icon('print')}<span>Imprimir</span>`, '', 'ghost')}${button('export-activity', `${icon('download')}<span>${state.exporting ? 'Exportando…' : 'Exportar CSV'}</span>`, state.exporting || !rows.length ? 'disabled' : '', 'ghost')}</div></div>
<div class="seg-tabs"><div class="mode-switch" role="group" aria-label="Qué consultar">${button('act-mode', `Participantes · ${counts.entitled}`, `data-mode="list" aria-pressed="${!attendance}"`)}${button('act-mode', `Asistencias · ${counts.registered}/${counts.entitled}`, `data-mode="attendance" aria-pressed="${attendance}"`)}</div>${attendance ? `<div class="chips tight" role="group" aria-label="Grupo de asistencia">${groups.map(([id, title]) => button('activity-group', `${title} · ${counts[id]}`, `data-group="${id}" aria-pressed="${group === id}"`, 'chip')).join('')}${counts.issues ? `<span class="pill bad">${counts.issues} con incidencia</span>` : ''}</div>` : ''}<form id="activity-search" class="inline-form"><label><span class="sr-only">Buscar participante</span><input id="activity-search-input" type="search" name="search" maxlength="100" value="${esc(search)}" placeholder="Buscar participante" autocomplete="off"></label><button class="primary" type="submit">Buscar</button></form></div>
<div class="scroll" tabindex="0" role="region" aria-label="Lista de participantes"><table class="record-table"><caption class="sr-only">${attendance ? 'Asistencias' : 'Participantes'} de ${esc(data.activity.name)}</caption><thead><tr>${heads.map((head, index) => `<th scope="col" ${index === 0 ? 'class="num-col"' : ''}>${head}</th>`).join('')}</tr></thead><tbody>${rows.map((item, index) => participantRow(item, index, attendance, meal)).join('') || `<tr><td colspan="${heads.length}">Sin personas en este grupo.</td></tr>`}</tbody></table></div><div class="list-foot"><span>${data.total} personas en este grupo</span><span>${attendance ? 'Las asistencias fuera de derecho se conservan; los registros repetidos no aumentan el número de personas.' : 'Personas con derecho a esta actividad. Las asistencias se consultan en «Asistencias».'}</span></div>`;
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
<div class="metrics strip compact-metrics"><div class="panel kpi static"><span class="kpi-title">Alojados esa noche</span><strong>${number(summary?.assigned)}</strong><small>${summary?.capacity ? `de ${number(summary.capacity)} plazas en servicio` : 'Capacidad sin dato'}</small>${summary?.capacity ? bar(summary.assigned, summary.capacity, summary.assigned > summary.capacity ? 'bad' : 'info') : ''}</div><div class="panel kpi static"><span class="kpi-title">Plazas libres</span><strong>${free === null ? 'Sin dato' : number(free)}</strong><small>${counts.free} unidades libres</small></div><div class="panel kpi static ${counts.over ? 'alert' : ''}"><span class="kpi-title">Sobre capacidad</span><strong>${counts.over}</strong><small>unidades esa noche</small></div></div>
${lodging.unknownDates ? `<div class="notice info">${lodging.unknownDates} estancias tienen fechas desconocidas y no se cuentan en la ocupación.</div>` : ''}
<div class="chips" role="group" aria-label="Estado de la unidad">${[['all', 'Todas'], ['free', 'Libres'], ['part', 'Con plazas'], ['full', 'Completas'], ['over', 'Sobre capacidad']].map(([key, text]) => button('room-filter', `${text} · ${counts[key]}`, `data-filter="${key}" aria-pressed="${filter === key}"`, 'chip')).join('')}</div>
<div class="room-scroll"><div class="room-grid">${shown.map(({ room, count, status }) => `<article class="room-card ${status}"><header><div><h3>${esc(room.unitCode)}</h3><p class="small">Hotel: ${esc(room.hotelRoomNumber || 'Sin dato')} · ${esc(display('roomType', room.roomType))}</p></div><span class="pill ${statusTone[status]}">${statusText[status]}</span></header><div class="room-occ"><strong>${count}</strong><span>/ ${room.capacity ?? '?'} plazas</span></div>${bar(count, room.capacity || 0, status === 'over' ? 'bad' : status === 'full' ? 'info' : 'ok')}${button('open', 'Ver ocupantes →', `data-id="${esc(room._id)}" data-resource="habitaciones" aria-label="Consultar ${esc(room.unitCode)}"`, 'open-btn')}</article>`).join('') || '<div class="empty"><p>No hay unidades con ese estado esa noche.</p></div>'}</div>
<p class="small muted">La noche de salida queda fuera de la estancia. Las asignaciones no equivalen a llegadas registradas.</p></div>` : '<div class="empty"><h2>Sin estancias</h2><p>No hay estancias con fechas conocidas en esta copia.</p></div>'}</section>`;
}

const isEntitled = (part) => part.eligible !== false && ['included', 'extra'].includes(part.entitlement);

// Solo aparecen las pestañas que tienen contenido para esta persona.
export function personTabList(d) {
  const p = d.person;
  const entitled = d.participations.filter(isEntitled);
  const registered = d.participations.filter((part) => part.attendanceState === 'registered');
  const list = [['resumen', 'Resumen']];
  if (d.payments.length || d.allocations.length || p.dueCents > 0 || p.pendingCents > 0) list.push(['pagos', 'Pagos']);
  if (entitled.length) list.push(['programa', `Programa · ${entitled.length}`]);
  if (d.participations.length) list.push(['asistencias', `Asistencias · ${registered.length}/${d.participations.length}`]);
  if (d.stays.length) list.push(['alojamiento', `Alojamiento · ${d.stays.length}`]);
  list.push(['reserva', 'Reserva y contacto']);
  return list;
}

function personTile(tab, title, value, sub, extra = '', toneName = '') {
  return button('ptab', `<span class="kpi-title">${esc(title)}</span><strong>${value}</strong><small>${sub}</small>${extra}`, `data-tab="${tab}" aria-label="${esc(title)}: abrir detalle"`, `tile ${toneName}`);
}

function personSummary(d, list) {
  const p = d.person;
  const has = (key) => list.some(([tab]) => tab === key);
  const due = p.dueCents; const paid = p.paidNetCents;
  const entitled = d.participations.filter(isEntitled);
  const registered = d.participations.filter((part) => part.attendanceState === 'registered');
  const activities = new Map(d.activities.map((row) => [row._id, row]));
  const rooms = new Map(d.rooms.map((row) => [row._id, row]));
  const tiles = [];
  if (has('pagos')) {
    if (p.pendingCents > 0) tiles.push(personTile('pagos', 'Pagos', esc(money(p.pendingCents)), `${esc(pendingSplitText(p) || `pendiente · cobrado ${money(paid)} de ${money(due)}`)}`, bar(paid ?? 0, due ?? 0, 'ok'), 'alert'));
    else if (p.refundPendingCents > 0) tiles.push(personTile('pagos', 'Pagos', esc(money(p.refundPendingCents)), 'devolución pendiente', '', 'alert'));
    else tiles.push(personTile('pagos', 'Pagos', due > 0 ? 'Al día' : 'Sin importe', due > 0 ? `cobrado ${esc(money(paid))}` : 'sin importes por pagar', due > 0 ? bar(paid ?? 0, due, 'ok') : ''));
  } else if (p.isTeam || p.isGuest) tiles.push(`<div class="tile static"><span class="kpi-title">Pagos</span><strong>Sin importe</strong><small>${p.isGuest ? 'Invitado' : 'Equipo'}: no tiene nada que pagar</small></div>`);
  if (has('programa')) {
    const byType = programTypes.map((type) => [type.label, entitled.filter((part) => type.categories.includes(activities.get(ref(part.activityRef))?.category || 'other')).length]).filter(([, count]) => count > 0);
    tiles.push(personTile('programa', 'Programa', `${entitled.length} ${entitled.length === 1 ? 'actividad' : 'actividades'}`, byType.map(([label, count]) => `${esc(label)} ${count}`).join(' · ')));
  }
  if (has('asistencias')) tiles.push(personTile('asistencias', 'Asistencias', `${registered.length} de ${d.participations.length}`, 'con asistencia registrada', bar(registered.length, d.participations.length, 'info')));
  if (has('alojamiento')) {
    const stay = d.stays[0]; const room = rooms.get(ref(stay.roomRef));
    tiles.push(personTile('alojamiento', 'Alojamiento', esc(room?.unitCode || 'Unidad'), d.stays.length > 1 ? `${d.stays.length} estancias` : `${esc(date(stay.checkInDate))} → ${esc(date(stay.checkOutDate))}`));
  }
  const notes = [
    p.dataIssueDetail ? ['Datos por revisar', p.dataIssueDetail, 'bad'] : null,
    p.dietaryKnown && p.dietaryNotes ? ['Alimentación', p.dietaryNotes, 'warn'] : null,
    p.operationNote ? ['Nota operativa', p.operationNote, 'info'] : null
  ].filter(Boolean);
  return `<div class="tiles">${tiles.join('')}</div>${notes.length ? `<div class="notes">${notes.map(([title, text, toneName]) => `<div class="note ${toneName}"><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`).join('')}</div>` : ''}`;
}

function personPayments(d) {
  const p = d.person;
  const payments = new Map(d.payments.map((row) => [row._id, row]));
  const paid = p.paidNetCents; const due = p.dueCents;
  const split = splitFinance(p);
  return `<div class="balance"><div class="balance-main ${p.pendingCents > 0 ? 'owes' : 'ok'}"><span>Pendiente</span><strong>${esc(money(p.pendingCents))}</strong></div><div class="balance-bar">${stackedBar([{ value: paid || 0, tone: 'ok' }, { value: p.pendingCents || 0, tone: 'bad' }])}<div class="balance-legend"><span><i class="swatch c-ok"></i>Cobrado neto ${esc(money(paid))}</span><span><i class="swatch c-bad"></i>Pendiente ${esc(money(p.pendingCents))}</span><span>Exigible ${esc(money(due))}</span></div></div></div>${split ? `<div class="split-cards">${[['Baztango', split.event], ['Hotel', split.hotel]].map(([title, s]) => `<div class="split-card ${s.pending > 0 ? 'owes' : ''}"><span class="kpi-title">${title}</span><strong>${esc(money(s.pending))}</strong><small>pendiente · cobrado ${esc(money(s.paid))} de ${esc(money(s.due))}</small>${bar(Math.max(s.paid, 0), s.due, s.pending > 0 ? 'warn' : 'ok')}</div>`).join('')}</div>` : ''}${facts(p, split ? ['advanceNetCents', 'hotelDirectPaidCents', 'overpaidCents', 'refundPendingCents'] : ['eventDueCents', 'hotelDueCents', 'advanceNetCents', 'eventPaidNetCents', 'hotelDirectPaidCents', 'overpaidCents', 'refundPendingCents'], { compact: true })}
${d.payments.length ? `<div class="detail-section"><h3>Movimientos económicos</h3><ul class="timeline">${d.payments.map((pay) => `<li><span class="tl-date">${esc(date(pay.paymentDate || pay.occurredAt))}</span><span class="tl-main"><strong>${esc(pay.paymentCode || 'Movimiento')}</strong><small>${esc(display('method', pay.method))} · ${esc(display('destination', pay.destination))}${pay.payerName ? ` · ${esc(pay.payerName)}` : ''}</small></span><span class="tl-amount">${esc(money(pay.amountCents))}</span>${pay.state && pay.state !== 'valid' ? pill('state', pay.state) : ''}</li>`).join('')}</ul></div>` : ''}
${d.allocations.length ? `<div class="detail-section"><h3>Parte imputada a esta persona</h3><ul class="timeline">${d.allocations.map((alloc) => `<li><span class="tl-date">${esc(display('destination', alloc.destination))}</span><span class="tl-main"><strong>${esc(payments.get(ref(alloc.paymentRef))?.paymentCode || 'Movimiento')}</strong></span><span class="tl-amount">${esc(money(alloc.amountCents))}</span></li>`).join('')}</ul></div>` : ''}`;
}

// Lo que le corresponde a esta persona, por jornada y sin mezclar asistencias.
function personProgram(d) {
  const activities = new Map(d.activities.map((row) => [row._id, row]));
  const rows = d.participations.filter(isEntitled).map((part) => ({ part, act: activities.get(ref(part.activityRef)) }));
  const days = groupByDay(rows, (row) => row.act);
  return `<div class="day-groups">${[...days].map(([day, items]) => `<section class="day-group"><h3>${day === 'sin-fecha' ? 'Sin fecha' : esc(dayLabel(day, true))}<small>${items.length} ${items.length === 1 ? 'actividad' : 'actividades'}</small></h3><ul class="timeline">${items.map(({ part, act }) => `<li><span class="tl-date">${act?.timeConfirmed ? esc(time(act.startsAt)) : 'Por confirmar'}</span><span class="tl-main"><strong>${esc(act?.name || part.title || 'Actividad')}</strong><small>${esc(display('category', act?.category))}${act?.venue ? ` · ${esc(act.venue)}` : ''}</small></span>${part.entitlement === 'extra' ? pill('entitlement', 'extra') : ''}</li>`).join('')}</ul></section>`).join('')}</div>`;
}

function personAttendance(d) {
  const activities = new Map(d.activities.map((row) => [row._id, row]));
  const rows = d.participations.map((part) => ({ part, act: activities.get(ref(part.activityRef)) }));
  const days = groupByDay(rows, (row) => row.act);
  const registered = rows.filter(({ part }) => part.attendanceState === 'registered').length;
  const outside = rows.filter(({ part }) => !isEntitled(part) && part.attendanceState === 'registered').length;
  return `<div class="pill-row"><span class="pill ok">${registered} registradas</span><span class="pill neutral">${rows.length - registered} sin registro</span>${outside ? `<span class="pill warn">${outside} fuera de derecho</span>` : ''}</div>
<div class="scroll auto" tabindex="0" role="region" aria-label="Asistencias de la persona"><table class="record-table"><caption class="sr-only">Asistencias</caption><thead><tr><th scope="col">Hora</th><th scope="col">Actividad</th><th scope="col">Derecho</th><th scope="col">Asistencia</th></tr></thead><tbody>${[...days].map(([day, items]) => `<tr class="day-row"><td colspan="4"><strong>${day === 'sin-fecha' ? 'Sin fecha' : esc(dayLabel(day, true))}</strong></td></tr>${items.map(({ part, act }) => `<tr><td><span class="cell-label">Hora</span>${act?.timeConfirmed ? esc(time(act.startsAt)) : 'Por confirmar'}</td><td><span class="cell-label">Actividad</span><strong>${esc(act?.name || part.title || 'Actividad')}</strong>${part.needsReview ? '<span class="record-sub inline">Revisar</span>' : ''}</td><td><span class="cell-label">Derecho</span>${pill('entitlement', part.entitlement || 'none')}</td><td><span class="cell-label">Asistencia</span>${pill('attendanceState', part.attendanceState || 'unknown')}</td></tr>`).join('')}`).join('')}</tbody></table></div>`;
}

function personStays(d) {
  const rooms = new Map(d.rooms.map((row) => [row._id, row]));
  const nights = (stay) => (stay.checkInDate && stay.checkOutDate ? Math.round((Date.parse(`${stay.checkOutDate}T00:00:00Z`) - Date.parse(`${stay.checkInDate}T00:00:00Z`)) / 86400000) : null);
  return `<ul class="timeline">${d.stays.map((stay) => { const room = rooms.get(ref(stay.roomRef)); const n = nights(stay); return `<li><span class="tl-date">${esc(date(stay.checkInDate))}</span><span class="tl-main"><strong>${esc(room?.unitCode || 'Unidad')}${room?.hotelRoomNumber ? ` · hotel ${esc(room.hotelRoomNumber)}` : ''}</strong><small>Salida ${esc(date(stay.checkOutDate))}${n ? ` · ${n} noches` : ''}${stay.bedLabel ? ` · ${esc(stay.bedLabel)}` : ''}${room?.roomType ? ` · ${esc(display('roomType', room.roomType))}` : ''}</small></span>${pill('state', stay.state || 'unknown')}</li>`; }).join('')}</ul>`;
}

function personReservation(d) {
  const p = d.person;
  const others = d.people.filter((person) => person._id !== p._id);
  return `<h3>Reserva ${esc(d.reservation.reservationCode)}</h3>${facts(d.reservation, ['packageName', 'sourceChannel', 'registeredAt', 'sourceState', 'webId'], { compact: true })}
${others.length ? `<div class="detail-section"><h3>Otras personas de la reserva</h3><div class="chips">${others.map((person) => button('person-ref', `${esc(person.fullName)} · ${esc(person.personCode)}${person.pendingCents > 0 ? ` · debe ${esc(money(person.pendingCents))}` : ''}`, `data-id="${esc(person._id)}"`, 'chip')).join('')}</div></div>` : ''}
<div class="detail-section"><h3>Contacto</h3>${facts(p, ['email', 'phone', 'country', 'nationality', 'city', 'dietaryKnown', 'dietaryNotes', 'operationNote'], { compact: true })}</div>`;
}

export function personView(state) {
  const d = state.detail;
  const p = d.person;
  const tel = safeTel(p.phone);
  const list = personTabList(d);
  const current = list.some(([tab]) => tab === state.ptab) ? state.ptab : 'resumen';
  const body = { resumen: () => personSummary(d, list), pagos: () => personPayments(d), programa: () => personProgram(d), asistencias: () => personAttendance(d), alojamiento: () => personStays(d), reserva: () => personReservation(d) }[current]();
  const titles = { resumen: 'Resumen', pagos: 'Pagos y saldo individual', programa: 'Programa: lo que le corresponde', asistencias: 'Registro de asistencia', alojamiento: 'Alojamiento', reserva: 'Reserva y contacto' };
  return `<div class="stack person-page"><div class="crumbs">${button('back', '← Volver a la consulta')}${button('print', `${icon('print')}<span>Imprimir ficha</span>`, '', 'ghost')}</div>
<section class="panel person-head"><div class="avatar lg role-${esc(p.danceRole || 'unknown')}" aria-hidden="true">${esc(initials(p.fullName))}</div><div class="person-id"><div class="eyebrow">Ficha de consulta</div><h2>${esc(p.fullName)}</h2><p>${esc(p.personCode)} · ${esc(d.reservation.reservationCode)}</p><div class="pill-row">${pill('state', p.state)}${p.paymentState ? pill('paymentState', p.paymentState) : ''}${p.arrivalState ? `<span class="pill ${tone(p.arrivalState)}">Llegada: ${esc(display('arrivalState', p.arrivalState).toLowerCase())}</span>` : ''}${p.packageName ? `<span class="pill neutral">${esc(p.packageName)}</span>` : ''}${p.danceRole ? `<span class="pill neutral">${esc(display('danceRole', p.danceRole))}</span>` : ''}${p.isTeam ? '<span class="pill info">Equipo</span>' : ''}${p.isGuest ? '<span class="pill info">Invitado</span>' : ''}${p.hasDataIssues ? '<span class="pill bad">Datos por revisar</span>' : ''}</div></div><div class="contact-actions">${tel ? `<a class="action-link" href="tel:${esc(tel)}">${icon('phone')}<span>Llamar</span></a>` : ''}${p.email ? `<a class="action-link" href="mailto:${esc(p.email)}">${icon('mail')}<span>Escribir</span></a>` : ''}</div></section>
<section class="panel person-body"><div class="tabs" role="group" aria-label="Secciones de la ficha">${list.map(([tab, label]) => button('ptab', esc(label), `data-tab="${tab}" aria-pressed="${tab === current}"`)).join('')}</div><h3 class="sr-only">${esc(titles[current])}</h3><div class="person-pane">${body}</div></section></div>`;
}

export function roomView(state) {
  const data = state.room;
  return `<section class="panel"><div class="panel-head"><div><div class="eyebrow">Unidad</div><h2>Unidad ${esc(data.room.unitCode)}</h2><p>Número del hotel: ${esc(data.room.hotelRoomNumber || 'Sin dato')} · ${esc(display('roomType', data.room.roomType))}</p></div>${button('back', '← Volver')}</div><form id="night-form" class="form-row night-row">${button('room-night', '‹ Noche anterior', `data-step="-1"`, 'ghost')}<label>Noche de alojamiento<input type="date" name="night" required value="${esc(data.night)}"></label><button class="primary" type="submit">Consultar noche</button>${button('room-night', 'Noche siguiente ›', `data-step="1"`, 'ghost')}</form><div class="results-head"><p>${data.assigned} personas asignadas · ${data.free === null ? 'Plazas libres: Sin dato' : `${data.free} plazas libres`} · Capacidad: ${esc(data.room.capacity ?? 'Sin dato')}</p></div>${data.unknownDates ? `<div class="notice">${data.unknownDates} estancias tienen fechas desconocidas. No se puede afirmar la disponibilidad.</div>` : ''}${data.overCapacity ? '<div class="notice">Las asignaciones superan la capacidad informada.</div>' : ''}<p class="small">La noche de salida queda fuera de la estancia. Las asignaciones no equivalen a llegadas registradas.</p>${data.items.map((item) => `<div class="detail-section"><strong>${esc(item.person.fullName)}</strong>${facts(item, ['checkInDate', 'checkOutDate', 'bedLabel', 'state'])}${button('person-ref', 'Ver ficha', `data-id="${esc(item.person._id)}"`, 'open-btn')}</div>`).join('') || '<div class="empty"><p>No hay personas asignadas para esta noche.</p></div>'}</section>`;
}
