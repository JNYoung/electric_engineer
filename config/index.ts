import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import path from 'path'

const outputRoot = process.env.TARO_ENV === 'weapp' ? 'dist/weapp' : 'dist/h5'
const buildTarget = process.env.BUILD_TARGET ?? process.env.TARO_ENV ?? 'h5'
const telemetryRegion = process.env.TELEMETRY_REGION === 'overseas' ? 'overseas' : 'domestic'
const telemetryEndpoint =
  process.env.TELEMETRY_ENDPOINT ??
  (telemetryRegion === 'overseas' ? '/api/telemetry/global/events' : '/api/telemetry/cn/events')
const telemetryChannel = process.env.TELEMETRY_CHANNEL ?? buildTarget
const telemetryEnabled = process.env.TELEMETRY_ENABLED !== 'false'

const config: UserConfigExport = {
  projectName: 'diangong-dashi',
  date: '2026-06-10',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot,
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false
    }
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
    ...(buildTarget === 'android-google-play'
      ? {}
      : {
          '@capacitor/core': path.resolve(__dirname, '..', 'src/core/capacitorCoreShim.ts')
        })
  },
  cache: {
    enable: true
  },
  defineConstants: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
    __BUILD_TARGET__: JSON.stringify(buildTarget),
    __TELEMETRY_REGION__: JSON.stringify(telemetryRegion),
    __TELEMETRY_CHANNEL__: JSON.stringify(telemetryChannel),
    __TELEMETRY_ENDPOINT__: JSON.stringify(telemetryEndpoint),
    __TELEMETRY_ENABLED__: JSON.stringify(telemetryEnabled)
  },
  terser: {
    config: {
      compress: {
        passes: 2
      },
      keep_fnames: false
    }
  },
  noInjectGlobalStyle: true,
  copy: {
    patterns: [
      {
        from: path.resolve(__dirname, '..', 'src/static'),
        to: path.resolve(__dirname, '..', outputRoot, 'static')
      }
    ],
    options: {}
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {}
      },
      cssModules: {
        enable: false
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    webpackChain(chain) {
      // H5 only needs primitive DOM wrappers here; avoid shipping the Stencil component runtime in app entry.
      chain.resolve.alias.set(
        '@tarojs/components$',
        path.resolve(__dirname, '..', 'src/platform/h5-components.tsx')
      )
      chain.resolve.alias.set(
        '@tarojs/components/global.css$',
        path.resolve(__dirname, '..', 'src/platform/h5-components.css')
      )
      chain.resolve.alias.set(
        '@tarojs/components/dist/taro-components/taro-components.css$',
        path.resolve(__dirname, '..', 'src/platform/h5-components.css')
      )
      chain.plugin('mainPlugin').tap((args) => {
        const [options] = args

        if (options?.loaderMeta) {
          // Taro injects PullToRefresh on H5 by default even though this app does not use it.
          options.loaderMeta.extraImportForWeb = options.loaderMeta.extraImportForWeb.replace(
            "import { defineCustomElementTaroPullToRefreshCore } from '@tarojs/components/dist/components'\n",
            ''
          )
          options.loaderMeta.execBeforeCreateWebApp = options.loaderMeta.execBeforeCreateWebApp.replace(
            'defineCustomElementTaroPullToRefreshCore()\n',
            ''
          )
        }

        return args
      })
    },
    postcss: {
      autoprefixer: {
        enable: true
      },
      cssModules: {
        enable: false
      }
    }
  }
}

export default defineConfig(async (merge) => merge({}, config))
