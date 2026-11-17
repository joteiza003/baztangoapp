export function retrySeconds(response, data, now = Date.now()) {
  const header = response.headers.get('Retry-After');
  let seconds = Number(data?.retryAfter);
  if (header) seconds = /^\d+$/.test(header) ? Number(header) : Math.ceil((Date.parse(header) - now) / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(3600, Math.max(1, Math.ceil(seconds))) : 60;
}
