import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.electricmaster.learn',
  appName: 'Electric Master',
  webDir: 'dist/h5',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
}

export default config
