import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4187', browserName: 'chromium', headless: true },
  reporter: 'list',
  webServer: { command: 'npm run serve', url: 'http://127.0.0.1:4187', reuseExistingServer: true }
});
