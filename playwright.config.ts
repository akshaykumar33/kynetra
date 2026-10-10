import { defineConfig, devices } from '@playwright/test';

const API_PORT = 4100;
const WEB_PORT = 5173;

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  // the suite shares one seeded database; run files one at a time
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    // software WebGL so tests run on CI machines without a GPU
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // a fresh in-memory database, seeded with the Northgate demo office, on every run
      command: 'npm run start -w @knovra/server',
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        DATABASE_URL: 'memory://',
        APP_ORIGIN: `http://localhost:${WEB_PORT}`,
        AUTH_DEV_LOGIN: '1',
        SEED_ON_START: '1',
      },
    },
    {
      command: `npm run dev -w @knovra/web -- --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { KNOVRA_API: `http://localhost:${API_PORT}` },
    },
  ],
});
