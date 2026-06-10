import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import path from 'path'

const outputRoot = process.env.TARO_ENV === 'weapp' ? 'dist/weapp' : 'dist/h5'

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
    '@': path.resolve(__dirname, '..', 'src')
  },
  cache: {
    enable: false
  },
  defineConstants: {},
  copy: {
    patterns: [],
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
