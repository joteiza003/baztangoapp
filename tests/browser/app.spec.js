import { test, expect } from '@playwright/test';

test('unconfigured publication is safe and responsive across representative widths', async ({ page }) => {
  await page.route('**/config.js', (route) => route.fulfill({ contentType: 'text/javascript', body: "export const config = { apiUrl: '' };" }));
  const errors = [];
  const remoteRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4187')) remoteRequests.push(request.url()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Conexión pendiente', { exact: true }).first()).toBeVisible();
  for (const [width, height] of [[320, 568], [360, 640], [390, 844], [430, 932], [768, 1024], [820, 1180], [844, 390], [1024, 768], [1180, 820], [1280, 720], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440], [3440, 1440]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `overflow ${width}x${height}`).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/pendiente-movil.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'test-results/pendiente-escritorio.png', fullPage: true });
  await page.keyboard.press('Tab');
  await expect(page.getByText('Saltar al contenido')).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => Boolean(document.querySelector('main')))).toBe(true);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect(remoteRequests).toEqual([]);
  expect(errors).toEqual([]);
});
