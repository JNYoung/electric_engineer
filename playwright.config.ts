import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 10086)
const host = process.env.E2E_HOST ?? '127.0.0.1'
const baseURL = `http://${host}:${port}`
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const launchOptions = chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: `npm run build:h5 && python3 -m http.server ${port} --bind ${host} --directory dist/h5`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: 'npm run dev:backend:domestic',
      url: 'http://127.0.0.1:4317/api/auth/config?region=domestic',
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ],
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 950 },
        launchOptions
      }
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
        launchOptions
      }
    }
  ]
})
