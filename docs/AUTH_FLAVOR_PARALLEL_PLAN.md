# 账号登录与 Flavor 并行推进文档

## 目标

国内和海外账号系统并行推进，但前端只使用统一账号接口：

- 国内包：微信、手机号+验证码、邮箱+密码登录，支持绑定账户。
- 海外包：Facebook、Google、手机号+验证码、邮箱登录，支持绑定账户。
- App 根据 flavor 动态展示登录方式、动态接入原生依赖、动态连接服务端端口。
- 服务端先以内置本地 backend API 并行开发，后续替换真实短信、邮箱、OAuth、账号绑定和支付 adapter。

## Git 并行拆分

当前 PR 分支继续承载 App 壳层和账号 UI 骨架：

- `codex/question-bank-login-progress`：App 端 flavor、账号 UI、Android 打包验证。

建议后续拆出并行分支：

- `codex/auth-server-contract`：服务端 auth API、短信/邮件/OAuth adapter。
- `codex/auth-native-domestic`：微信登录 Android 插件、国内渠道包。
- `codex/auth-native-overseas`：Google/Facebook 登录 Android 插件、海外包。

合并顺序：

1. `auth-server-contract` 先固定 API schema 和端口。
2. App 壳层合入后，国内/海外原生插件分别接入。
3. 最后接真实 provider secret、回调域名和生产服务端。

## Flavor 矩阵

| 目标 | BUILD_TARGET | AUTH_REGION | 服务端默认端口 | 登录方式 |
| --- | --- | --- | --- | --- |
| 国内 Android | `android-domestic` | `domestic` | `4317` | 微信、手机号+验证码、邮箱+密码 |
| 海外 Google Play | `android-google-play` | `overseas` | `4318` | Facebook、Google、手机号+验证码、邮箱登录 |
| 国内 H5/小程序 | `h5-cn` / `weapp` | `domestic` | `4317` | 微信、手机号+验证码、邮箱+密码 |
| 海外 H5 | `h5-global` | `overseas` | `4318` | Facebook、Google、手机号+验证码、邮箱登录 |

真机开发时不要使用 `127.0.0.1` 作为 App API 地址。需要传入局域网地址：

```bash
AUTH_API_BASE_URL=http://192.168.x.x:4318 npm run android:sync:googleplay
```

## 服务端端口和 API

本地 backend 服务：

```bash
npm run dev:auth:domestic
npm run dev:auth:overseas
```

端口：

- 国内：`4317`
- 海外：`4318`

API：

- `GET /health`
- `GET /api/auth/config?region=domestic|overseas`
- `POST /api/auth/otp/send`
- `POST /api/auth/sign-in`
- `POST /api/auth/link`
- `POST /api/auth/sign-out`
- `GET /api/auth/profile`

统一登录请求：

```json
{
  "region": "overseas",
  "provider": "google",
  "credential": {
    "idToken": "provider-token-or-dev-code"
  }
}
```

统一登录响应：

```json
{
  "session": {
    "status": "authenticated",
    "userId": "overseas_google_user",
    "displayName": "Google user",
    "tier": "free",
    "authRegion": "overseas",
    "provider": "google",
    "linkedProviders": ["google"]
  },
  "token": "dev-token-overseas-google"
}
```

## Android 动态依赖

Gradle 使用 flavor-scoped dependencies，避免国内包引入海外 SDK、海外包引入微信 SDK：

- `domesticImplementation`: WeChat OpenSDK。
- `googlePlayImplementation` / `googlePlayInternalImplementation`: Google/Facebook 登录、Firebase Analytics、Google Mobile Ads。

当前原生广告/分析插件使用 `BuildConfig.GOOGLE_PLAY_SERVICES_ENABLED` 和反射做 flavor 可选加载；国内包不会编入 Google SDK。真实原生登录在 Capacitor Plugin 层继续补。

## 前端接入边界

App 端只关心：

- 当前 region：`__AUTH_REGION__`
- API 地址：`__AUTH_API_BASE_URL__`
- 登录 provider 列表：`getRuntimeAuthConfig()`

账号 UI 负责：

- 按 flavor 展示登录方式。
- 提供手机号/验证码、邮箱/密码输入区域。
- 登录后显示已登录 provider 和可绑定 provider。
- 点击绑定时走同一套 provider 配置。

## 参考文档

- Android build variants: `https://developer.android.com/build/build-variants`
- Sign in with Google for Android: `https://developer.android.com/identity/sign-in/credential-manager-siwg`
- Facebook Login for Android: `https://developers.facebook.com/docs/facebook-login/android/`
- WeChat Open Platform mobile app login: `https://developers.weixin.qq.com/doc/oplatform/Mobile_App/WeChat_Login/Development_Guide.html`
