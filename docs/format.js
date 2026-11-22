import { values, tones, pills } from './catalogue.js?v=1.2.0';

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const ref = (value) => (typeof value === 'object' && value ? value._id : value);
const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const euroShort = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const money = (value) => (Number.isSafeInteger(value) ? euro.format(value / 100) : 'Sin dato');
export const moneyShort = (value) => (Number.isSafeInteger(value) ? euroShort.format(value / 100) : 'Sin dato');
export const number = (value) => (Number.isFinite(value) ? new Intl.NumberFormat('es-ES').format(value) : 'Sin dato');
export const percent = (part, total) => (Number.isFinite(part) && Number.isFinite(total) && total > 0 ? Math.max(0, Math.min(100, Math.round((part / total) * 100))) : null);
export const date = (value) => {
  if (!value) return 'Sin dato';
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', ...(String(value).includes('T') ? { timeStyle: 'short', timeZone: 'Europe/Madrid' } : { timeZone: 'UTC' }) }).format(parsed) : 'Sin dato';
};
export const time = (value) => {
  const parsed = new Date(value);
  return value && Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('es-ES', { timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(parsed) : '';
};
export function dayLabel(day, long = false) {
  const parsed = new Date(`${String(day).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) return 'Sin dato';
  const text = new Intl.DateTimeFormat('es-ES', { weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', timeZone: 'UTC' }).format(parsed).replace(',', '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
export function shiftDay(day, amount) { return new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86400000).toISOString().slice(0, 10); }
export function display(field, value) {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (field.endsWith('Cents')) return money(value);
  if (field.endsWith('At') || field.endsWith('Date')) return date(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (field.endsWith('Ref')) return ref(value) || 'Sin dato';
  return values[value] || String(value);
}
export const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
export const tone = (value) => tones[value] || 'neutral';
export const pill = (field, value) => `<span class="pill ${tone(value)}">${esc(display(field, value))}</span>`;
export const isPillField = (field, value) => pills.has(field) && value !== null && value !== undefined && value !== '';
export function button(action, text, attrs = '', className = '') { return `<button type="button" data-action="${action}" ${attrs} class="${className}">${text}</button>`; }
export function safeTel(value) { const digits = String(value || '').replace(/[^\d+]/g, ''); return /^\+?\d{6,15}$/.test(digits) ? digits : ''; }
export function csvCell(value) {
  const text = String(value ?? '');
  return `"${(/^[=+\-@\t\r]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
}
