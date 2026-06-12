# 电工大师品牌图标与开屏页

## 设计定位

电工大师面向有一定基础、希望考取电工证或提升就业能力的学习者。图标和开屏页采用“专业、可靠、实训感”的方向，而不是儿童启蒙风格。

- 深蓝底色：表达电力安全、专业工具和可信赖感。
- 盾牌：对应安全规范、电工资格认证和实训保护。
- 闪电：表达电路、电压和通电验证。
- 红绿电路节点：对应正负极、连接、测量与仿真。
- 网格背景：对应工程绘图、电路图纸和工作台。

## 资源位置

- 应用图标原稿：`src/assets/brand/app-icon-1024.png`
- 竖屏开屏原稿：`src/assets/brand/splash-portrait-1280x1920.png`
- 横屏开屏原稿：`src/assets/brand/splash-landscape-1920x1280.png`
- Android launcher icon：`android/app/src/main/res/mipmap-*/ic_launcher.png`
- Android round launcher icon：`android/app/src/main/res/mipmap-*/ic_launcher_round.png`
- Android adaptive foreground：`android/app/src/main/res/mipmap-*/ic_launcher_foreground.png`
- Android splash：`android/app/src/main/res/drawable*/splash.png`
- H5/PWA 图标：`src/static/brand/apple-touch-icon.png`、`src/static/brand/icon-192.png`、`src/static/brand/icon-512.png`
- H5/PWA manifest：`src/static/manifest.webmanifest`

## 重新生成

```bash
npm run brand:assets
```

生成脚本位于 `scripts/generate-brand-assets.swift`。脚本会同时生成商店级原稿、Android 各密度图标和横竖屏开屏资源。

## Android 接入

Android 图标由 `android/app/src/main/AndroidManifest.xml` 中的 `android:icon` 和 `android:roundIcon` 引用。

开屏页由 `android/app/src/main/res/values/styles.xml` 的 `AppTheme.NoActionBarLaunch` 引用 `@drawable/splash`。

adaptive icon 背景色位于 `android/app/src/main/res/values/ic_launcher_background.xml`，当前为 `#0B1F3A`。

## H5/PWA 接入

`src/index.html` 引用了 `manifest.webmanifest`、192 图标和 Apple touch icon。Taro H5 构建会把 `src/static` 输出到 `dist/h5/static`，用于浏览器标签页、添加到主屏幕和 Capacitor WebView。

## 尺寸校验

```bash
find src/assets/brand android/app/src/main/res -maxdepth 3 -name '*.png' -print | sort | xargs file
```

关键尺寸：

- `app-icon-1024.png`：1024x1024
- `splash-portrait-1280x1920.png`：1280x1920
- `splash-landscape-1920x1280.png`：1920x1280
- `src/static/brand/apple-touch-icon.png`：180x180
- `src/static/brand/icon-192.png`：192x192
- `src/static/brand/icon-512.png`：512x512
- `mipmap-mdpi/ic_launcher.png`：48x48
- `mipmap-xxxhdpi/ic_launcher.png`：192x192
- `drawable-port-xxxhdpi/splash.png`：1280x1920
- `drawable-land-xxxhdpi/splash.png`：1920x1280
