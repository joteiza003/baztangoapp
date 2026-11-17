import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { config } from '../docs/config.js';

const base = 'https://joteiza003.github.io/baztangoapp/';
for (const file of ['index.html', 'app.js', 'catalogue.js', 'config.js', 'retry.js', 'styles.css', 'favicon.svg']) {
  const response = await fetch(new URL(file, base), { cache: 'no-store' });
  assert.equal(response.status, 200, file);
  const local = await readFile(new URL(`../docs/${file}`, import.meta.url), 'utf8');
  assert.equal((await response.text()).replaceAll('\r\n', '\n'), local.replaceAll('\r\n', '\n'), `Contenido publicado: ${file}`);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(base);
  assert.equal(response.status(), 200);
  if (config.apiUrl) {
    await page.getByLabel('Contraseña de acceso').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Acceder', exact: true }).count(), 1);
  } else {
    await page.getByText('Conexión pendiente', { exact: true }).waitFor();
  }
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'test-results/publicada-escritorio.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 568 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Más apartados' }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/publicada-movil.png', fullPage: true });
  console.log(`Publicación verificada: ${base}; siete recursos coinciden, ${config.apiUrl ? 'pantalla de acceso configurada' : 'conexión pendiente'}, sin errores JS, móvil sin desbordamiento. No se introducen credenciales.`);
} finally {
  await browser.close();
}
