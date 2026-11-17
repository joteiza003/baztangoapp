import { test, expect } from '@playwright/test';
import { installApi, fixturePassword } from './fixtures.js';

test('a temporary quota on the first login shows a countdown and prevents immediate retries', async ({ page }) => {
  await installApi(page);
  let attempts = 0;
  await page.route('https://qa.example.invalid/_functions/baztango', async (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4187', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
    attempts++;
    return route.fulfill({ status: 429, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4187', 'Access-Control-Expose-Headers': 'Retry-After', 'Retry-After': '5', 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'DATA_SERVICE_BUSY', retryAfter: 5 }) });
  });
  await page.clock.install();
  await page.goto('/');
  await page.getByLabel('Contraseña de acceso').fill(fixturePassword);
  await page.getByRole('button', { name: 'Acceder', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Wix');
  await expect(page.getByRole('button', { name: /Reintentar en/ })).toBeDisabled();
  await expect(page.getByLabel('Contraseña de acceso')).toHaveValue('');
  await page.clock.fastForward(6000);
  await expect(page.getByRole('button', { name: 'Acceder', exact: true })).toBeEnabled();
  expect(attempts).toBe(1);
});
