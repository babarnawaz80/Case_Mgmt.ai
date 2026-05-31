import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load e2e-ipmg/.env.test manually since dotenv may not be installed
function loadEnvFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* file may not exist */ }
}
loadEnvFile(path.join(__dirname, 'e2e-ipmg', '.env.test'));

export default defineConfig({
  testDir: './e2e-ipmg/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  timeout: 45000,
  reporter: [
    ['html', { open: 'never', outputFolder: 'e2e-ipmg/report' }],
    ['json', { outputFile: 'e2e-ipmg/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://app.casemanagement.ai',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'setup',
      testDir: './e2e-ipmg',
      testMatch: /global-setup\.ts/,
      timeout: 300000, // 5 min for multi-role login
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
      testIgnore: /global-setup\.ts/,
    },
  ],
});
