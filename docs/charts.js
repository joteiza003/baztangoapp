import { esc, percent } from './format.js?v=1.2.0';

// Gráficos sin estilos en línea: anchos y alturas mediante clases (w-N, h-N) para cumplir la política CSP.
export function bar(value, max, toneName = 'brand') {
  const p = percent(value, max) ?? 0;
  return `<span class="bar" aria-hidden="true"><span class="fill ${toneName} w-${p}"></span></span>`;
}

export function stackedBar(parts) {
  const total = parts.reduce((sum, part) => sum + Math.max(part.value || 0, 0), 0);
  if (!total) return '<span class="bar" aria-hidden="true"></span>';
  let used = 0;
  const cells = parts.map((part, index) => {
    const raw = Math.max(part.value || 0, 0);
    const width = index === parts.length - 1 ? 100 - used : Math.round((raw / total) * 100);
    used += width;
    return width > 0 ? `<span class="fill ${part.tone} w-${width}"></span>` : '';
  }).join('');
  return `<span class="bar stacked" aria-hidden="true">${cells}</span>`;
}

export function donut(segments, { label, center = '', sub = '' } = {}) {
  const live = segments.filter((segment) => segment.value > 0);
  const total = live.reduce((sum, segment) => sum + segment.value, 0);
  let cumulative = 0;
  const arcs = live.map((segment) => {
    const length = (segment.value / total) * 100;
    const arc = `<circle class="seg ${segment.tone}" cx="21" cy="21" r="15.9155" fill="none" stroke-width="5" stroke-dasharray="${length.toFixed(3)} ${(100 - length).toFixed(3)}" stroke-dashoffset="${(25 - cumulative).toFixed(3)}"/>`;
    cumulative += length;
    return arc;
  }).join('');
  return `<svg class="donut" viewBox="0 0 42 42" role="img" aria-label="${esc(label)}"><circle class="track" cx="21" cy="21" r="15.9155" fill="none" stroke-width="5"/>${arcs}<text x="21" y="21.5" text-anchor="middle" class="donut-num">${esc(center)}</text><text x="21" y="27" text-anchor="middle" class="donut-sub">${esc(sub)}</text></svg>`;
}

export function ring(value, max, { label, toneName = 'ok' } = {}) {
  const p = percent(value, max);
  const length = p ?? 0;
  return `<svg class="donut ring" viewBox="0 0 42 42" role="img" aria-label="${esc(label)}"><circle class="track" cx="21" cy="21" r="15.9155" fill="none" stroke-width="4"/>${length ? `<circle class="seg ${toneName}" cx="21" cy="21" r="15.9155" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="25"/>` : ''}<text x="21" y="24.5" text-anchor="middle" class="donut-num">${p === null ? '–' : `${p}%`}</text></svg>`;
}

export function legend(rows) {
  return `<ul class="legend">${rows.map((row) => `<li>${row.html || `<span class="swatch ${row.tone}"></span><span class="legend-name">${esc(row.label)}</span><strong>${esc(row.value)}</strong>`}</li>`).join('')}</ul>`;
}
