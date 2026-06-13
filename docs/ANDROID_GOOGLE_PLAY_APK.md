# Android Google Play APK 集成说明

日期：2026-06-11

## 当前实现

- Android 原生壳：Capacitor Android，承载 `dist/h5`。
- 包名：`com.electricmaster.learn`。
- Flavor：`googlePlay`，维度 `store`。
- Release 任务：`assembleGooglePlayRelease`。
- AAB 任务：`bundleGooglePlayRelease`。
- targetSdk / compileSdk：35。
- minSdk：23。
- 原生依赖版本：Firebase BoM `31.2.3`、Firebase Analytics `21.2.0`、Google Mobile Ads `22.6.0`。

> 说明：当前 Android 壳基于 Capacitor 4 / AGP 7.4.2。为了兼容该工具链，Firebase / AdMob 暂时固定在上述稳定版本；后续升级到最新 Google Mobile Ads SDK 时，应同步升级 Capacitor Android、Android Gradle Plugin 和 Gradle。

## Google Play Flavor

配置位置：

- `android/app/build.gradle`
- `android/variables.gradle`

`googlePlay` flavor 注入：

- `GOOGLE_PLAY_SERVICES_ENABLED=true`
- `STORE_CHANNEL=google_play`
- `GOOGLE_PLAY_ADMOB_APP_ID` 注入 Manifest placeholder `admobAppId`
- `GOOGLE_PLAY_ADMOB_BANNER_AD_UNIT_ID` 注入 `ADMOB_BANNER_AD_UNIT_ID`

正式 `googlePlay` 包默认不注入 Banner Ad Unit ID，避免误带 Google 官方测试广告位上架；上线前需要通过环境变量或 Gradle property 注入真实 AdMob App ID 和 Ad Unit ID。`googlePlayInternal` 内测包可通过 `GOOGLE_PLAY_INTERNAL_ADMOB_BANNER_AD_UNIT_ID` 使用 Google 官方测试广告位做真机 QA。

## AdMob 位置

当前只接入非打断式 Banner：

- 账号页：`account_banner`
- 学习、仿真、题库、素材页：隐藏广告

理由：

- 仿真、接线、题库属于核心学习流程，不插入广告，避免影响训练。
- 账号页属于账户和付费管理场景，适合轻量 Banner。
- 当前没有接入插屏和激励广告，避免教育产品过早打断用户。

代码位置：

- Web 调用层：`src/core/googlePlayNative.ts`
- Tab 位置映射：`src/pages/index/index.tsx`
- Native AdMob 插件：`android/app/src/main/java/com/electricmaster/learn/ElectricAdsPlugin.java`

## Google Analytics / Firebase Analytics

当前使用 Firebase Analytics 作为 Google Analytics for Firebase 落地层。

代码位置：

- Web telemetry 抽象层：`src/core/telemetry.ts`
- Google Play Native transport：`src/core/googlePlayNative.ts`
- Native Firebase 插件：`android/app/src/main/java/com/electricmaster/learn/ElectricAnalyticsPlugin.java`
- Firebase 配置：`android/app/google-services.json`

当前 `google-services.json` 是可构建占位配置，用于本地 APK 验证。正式上架前必须从真实 Firebase 项目下载并替换。

## Release Key

已生成本地 release keystore：

- Keystore：`android/keystores/electric-master-googleplay-release.jks`
- 配置：`android/keystore.properties`
- Alias：`electric-master-googleplay`

本仓库是私有仓库，当前按需求把 key 放入仓库。若后续转公开仓库，必须迁移到 CI secret 或安全制品库。

## 打包命令

同步 Android：

```bash
npm run android:sync:googleplay
```

打 release APK：

```bash
npm run android:apk:googleplay:release
```

打 Google Play AAB：

```bash
npm run android:aab:googleplay:release
```

产物路径：

- APK：`android/app/build/outputs/apk/googlePlay/release/app-googlePlay-release.apk`
- AAB：`android/app/build/outputs/bundle/googlePlayRelease/app-googlePlay-release.aab`

## 本地构建环境

本机已验证：

- JDK：Temurin 17 arm64。
- Android SDK Platform：35。
- Android Build Tools：35.0.0。
- Gradle wrapper：7.5。

如果系统默认 Java 仍是 JDK 11，需要显式指定 JDK 17：

```bash
JAVA_HOME=$HOME/.jdks/jdk-17.0.19+10/Contents/Home npm run android:apk:googleplay:release
```

APK 验证命令：

```bash
$ANDROID_HOME/build-tools/35.0.0/apksigner verify --verbose --print-certs android/app/build/outputs/apk/googlePlay/release/app-googlePlay-release.apk
$ANDROID_HOME/build-tools/35.0.0/aapt dump badging android/app/build/outputs/apk/googlePlay/release/app-googlePlay-release.apk
```

## 上架前必须替换

- `android/app/google-services.json`：替换成真实 Firebase 项目配置。
- `GOOGLE_PLAY_ADMOB_APP_ID` 和 `GOOGLE_PLAY_ADMOB_BANNER_AD_UNIT_ID`：正式包必须使用真实 AdMob 配置；不配置 Banner Unit 时正式包不展示广告。
- Google Play Console 的 Data safety、Ads declaration、内容分级和隐私政策 URL。
- 如果使用真实广告，需要发布根域 `app-ads.txt`。

## 官方参考

- Android build variants：https://developer.android.com/build/build-variants
- Google Play target API：https://developer.android.com/google/play/requirements/target-sdk
- Google Mobile Ads SDK Android quick start：https://developers.google.com/admob/android/quick-start
- Firebase Analytics Android：https://firebase.google.com/docs/analytics/get-started?platform=android
