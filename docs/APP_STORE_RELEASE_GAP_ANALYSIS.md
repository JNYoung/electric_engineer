# 电工大师上架差距分析

分析日期：2026-06-11  
目标：评估当前项目内容距离国内外教育类付费 App 上架还缺哪些工作，并形成可执行清单。  
范围：Web H5、微信小程序、iOS App Store、Google Play、国内安卓渠道、海外官网/支付承接页。

## 总体结论

当前项目已经具备“教育产品核心内容雏形”：电路仿真、视觉化元件、移动端工作台、训练挑战、题库、考试模拟、虚拟万用表、商业化门禁模型、国内/海外埋点抽象和海外发行方案文档。

但距离 App Store / Google Play / 国内安卓应用商店正式上架仍是 **No-Go**。主要阻断不是仿真内容本身，而是发布工程、真实账号支付、隐私合规、多语言内容、商店素材、原生测试和运营后台。

最短可行路径建议：

1. 先把 H5 用 Capacitor 包成 iOS/Android 原生壳。
2. 建立后端账号、权益、收据校验、学习进度同步。
3. 接入 Apple In-App Purchase、Google Play Billing、国内渠道支付或微信支付。
4. 完成 `en-US`、`zh-CN`、`zh-TW` 多语言和商店素材。
5. 准备隐私政策、服务条款、支持页、账号删除页和审核账号。
6. 进入 TestFlight、Google Play Internal testing、国内安卓内测。

## 当前证据

| 检查项 | 当前状态 | 结论 |
| --- | --- | --- |
| Web/H5 构建 | `package.json` 有 `build:h5`、`build:h5:domestic`、`build:h5:overseas` | H5 可作为 App 壳内容基础 |
| 微信小程序构建 | `package.json` 有 `build:weapp` | 国内小程序方向已有构建入口 |
| 原生工程 | 未发现 `ios/`、`android/` 目录 | iOS/Android 不能上架 |
| 发布自动化 | 未发现 `fastlane/`、`.github/`、`scripts/release/` | 缺少商店发布流水线 |
| 账号/支付 | `src/core/commercial.ts` 只有套餐、门禁和 API 契约占位 | 缺少真实支付和权益同步 |
| 埋点 | `src/core/telemetry.ts` 已有国内/海外抽象层 | 还缺真实 SDK/请求 transport、同意管理和数据字典 |
| 多语言 | 现有 UI 与内容仍以中文为主 | 海外上架缺 `en-US` 等本地化 |
| 公开政策页 | 仓库未见 privacy/terms/support/account deletion 站点 | 商店审核必缺 |
| Store 素材 | 未见截图、图标、商店描述、隐私表单答案 | 无法提交审核 |

## 平台 Go/No-Go

| 平台 | 当前状态 | 是否可上架 | 主要阻断 |
| --- | --- | --- | --- |
| Web H5 | 可构建 | No-Go | 缺正式域名、HTTPS 部署、隐私/条款/支持页、生产 API、支付闭环 |
| 微信小程序 | 可构建 | No-Go | 缺小程序 AppID、备案/类目、隐私协议、微信支付、审核材料、真机测试 |
| iOS App Store | 无原生工程 | No-Go | 缺 iOS 工程、Bundle ID、签名、Archive、IAP、隐私清单、App Store Connect 元数据 |
| Google Play | 无 Android 工程 | No-Go | 缺 Android 工程、AAB、签名、target API、Play Billing、Data safety、Play Console 元数据 |
| 国内安卓渠道 | 无 Android 工程 | No-Go | 缺 APK/AAB、加固/签名、软著/ICP/隐私检测、渠道支付、各渠道素材 |
| 海外官网 | 只有 H5 构建 | No-Go | 缺官网、下载页、Stripe、SEO、隐私/条款/客服、地区合规 |

## 关键阻断项

### P0：发布形态

当前没有 iOS/Android 原生项目，因此不能提交 App Store 或 Google Play。

需要完成：

- 新增 `capacitor.config.ts`。
- 新增 `ios/` 和 `android/` 工程。
- 配置 `appId` / Bundle ID / applicationId，例如 `com.electricmaster.learn`。
- H5 构建后执行 `npx cap sync`。
- 配置图标、启动图、状态栏、safe area、深链、网络白名单。
- Android 配置 `targetSdkVersion`，Google Play 当前要求新 App 和更新 target Android 15，也就是 API level 35 或更高。
- Android 产物输出 `.aab`，Google Play 对新 App 使用 Android App Bundle。
- iOS 使用 Xcode 26 和 iOS & iPadOS 26 SDK 或更新版本构建，满足 2026-04-28 后上传要求。

验收标准：

- `npm run app:sync` 可生成同步后的原生工程。
- `cd android && ./gradlew bundleRelease` 输出签名 AAB。
- Xcode 可 Archive 并上传 TestFlight。
- iOS/Android 真机能完成首屏打开、画布拖动、接线、点灯、电扇转动、题库和付费页打开。

### P0：账号、权益和支付

当前套餐和 API 契约是前端 mock，不能真正付费。

需要完成：

- 用户系统：邮箱验证码、Apple 登录、Google 登录，国内可补微信登录。
- 权益服务：`/api/entitlements/me`。
- iOS：StoreKit / IAP 商品、订阅、恢复购买、退款/撤销同步。
- Android：Google Play Billing、purchase token 服务端校验、Real-time developer notifications。
- Web：Stripe Checkout 或 Customer Portal，仅用于 Web。
- 国内：微信支付、支付宝或渠道内支付，按具体平台规则拆分。
- Webhook 幂等：Apple server notifications、Google RTDN、Stripe webhook、微信支付回调。
- 学习进度和购买权益绑定账号，支持跨设备恢复。

验收标准：

- 沙盒购买月订阅、年订阅、买断都能解锁权益。
- 退款、订阅过期、恢复购买能同步到 `entitlements`。
- App 内数字内容在 iOS 使用 Apple IAP，在 Google Play 使用 Play Billing。
- 审核账号可以看到已解锁 Pro 内容。

### P0：公开合规页面

商店审核需要可访问的公开页面。当前仓库没有对应站点或 URL。

需要完成：

- `https://.../privacy` 隐私政策。
- `https://.../terms` 服务条款。
- `https://.../support` 支持页面。
- `https://.../account/delete` 账号删除说明和入口。
- `https://.../billing` 订阅、退款和恢复购买说明。
- 如果未来接广告，根域还需要 `app-ads.txt`。

验收标准：

- 所有 URL HTTPS 200。
- 隐私政策覆盖账号、学习进度、购买记录、埋点、崩溃日志、第三方 SDK、数据删除和数据保留。
- App 内账号页能打开隐私、条款、支持和删除账号入口。
- App Store Connect 与 Play Console 填入同一批正式 URL。

### P1：多语言和海外内容

当前 UI、课程、题库、元件说明和商店定位仍以中文为主，不适合直接海外发行。

需要完成：

- 新增 `src/i18n`。
- 首发语言：`en-US`、`zh-CN`、`zh-TW`。
- 第二阶段语言：`es-ES`、`ja-JP`、`ko-KR`、`de-DE`。
- UI 文案 key 化，不在页面组件硬编码中文。
- 课程、题库、元件库、故障场景、考试解析和安全说明全部本地化。
- 建立电学术语 glossary，避免同一术语多种翻译。
- 增加 `?locale=en-US` 和 `?locale=zh-TW` 的 E2E smoke。

验收标准：

- 所有 locale key 覆盖率 100%。
- 320px 宽度下按钮和底部导航不截断。
- 英文课程和题库不是机器直译，电学术语人工复核。
- App Store / Google Play 至少有英文 metadata 和截图。

### P1：隐私、年龄和教育合规

教育 App 容易触及未成年人和课堂场景。当前还没有年龄策略、隐私表单和数据字典。

需要完成：

- 首发定位 13+，暂不进入 Apple Kids Category，避免儿童专项审核复杂度。
- 不接广告 SDK，降低追踪和儿童隐私风险。
- 明确是否采集：账号邮箱、设备信息、学习进度、题库答案、购买记录、崩溃日志、埋点事件。
- 为埋点添加用户同意和关闭入口。
- App Store Privacy Details。
- Google Play Data safety。
- 国内隐私合规检测：隐私弹窗、SDK 清单、权限最小化、撤回同意。
- 安全声明：仿真仅用于教育训练，不替代真实电工操作资质和现场安全规范。

验收标准：

- 隐私政策、App Privacy、Data safety、SDK 行为一致。
- 未登录也能体验基础功能。
- 用户能删除账号和学习数据。
- 权限请求最小化，没有通讯录、精确位置、照片、麦克风等非必要权限。

### P1：商店素材和审核资料

当前没有可以提交商店的素材包。

需要完成：

- App 名称：`Circuit Master` / `电工大师`。
- 图标：1024x1024 App Store 图标、Android adaptive icon、国内渠道图标。
- 启动图和品牌资源。
- iPhone、iPad、Android phone、Android tablet 截图。
- Google Play feature graphic。
- 商店描述、关键词、短描述、长描述。
- 订阅展示名、订阅描述、价格、试用规则。
- 审核说明：测试账号、IAP 路径、付费内容路径、无真实危险电工操作声明。
- 内容分级问卷。

验收标准：

- iOS 至少覆盖需要的设备截图规格。
- Google Play listing 完整，Data safety、目标受众、内容分级和隐私 URL 都完成。
- 订阅页清楚说明自动续费、价格、周期、取消方式和权益。

### P1：后端和运营后台

当前没有后端服务。付费教育 App 上架后必须能处理账号、购买、客服和内容更新。

需要完成：

- API 服务：auth、entitlements、billing、progress、catalog、i18n、telemetry。
- 数据表：users、entitlements、store_transactions、billing_events、lesson_progress、assessment_attempts、circuit_snapshots。
- 管理后台：课程上下架、题库管理、元件包管理、活动配置、用户权益补发、审核账号。
- 客服工具：查询订单、恢复权益、处理退款和订阅问题。
- 内容版本：课程、题库、元件库、素材包版本号。

验收标准：

- 后端 staging / production 分环境。
- App 可以在无发版情况下更新课程上下架和套餐门禁。
- 支付回调可追踪、可重放、幂等。
- 审核账号和测试权益可后台配置。

### P2：埋点落地

当前已完成抽象层，但真实落地还没接。

需要完成：

- 国内：接神策、友盟、微信小程序分析或自建 `/api/telemetry/cn/events`。
- 海外：接 Firebase Analytics、GA4 或自建 `/api/telemetry/global/events`。
- 事件字典：事件名、属性、触发时机、是否含个人数据、保留周期。
- Consent：首次打开隐私同意、设置页关闭分析。
- 传输策略：失败重试、批量上报、离线缓存、采样。
- 数据看板：留存、职业路径选择完成率、首个排障工位完成率、训练完成率、付费转化、退款率。

验收标准：

- 国内包和海外包发送到不同 endpoint 或 SDK。
- 关闭分析后不发送非必要埋点。
- Data safety / App Privacy 能准确反映埋点数据类型。

### P2：QA 和真机测试

当前 Web E2E 覆盖较好，但 App 上架还缺真机和商店沙盒测试。

需要完成：

- iOS：iPhone SE、主流 iPhone、iPad、横竖屏、弱网。
- Android：低端机、中端机、平板、不同 WebView 版本。
- 画布性能：拖动元件、平滑线/折线切换、元件数量增加后的帧率。
- 支付沙盒：购买、取消、恢复、退款、订阅过期。
- 崩溃监控：Sentry、Firebase Crashlytics 或同类方案。
- 离线和弱网：基础仿真可用，账号/购买提示清晰。
- 无障碍：字体放大、VoiceOver/TalkBack 基础可用。

验收标准：

- App 冷启动、首屏、核心交互耗时有基线。
- 低端 Android 画布拖动不卡死。
- 支付失败和网络失败有明确恢复路径。
- 上架前无 P0/P1 崩溃。

### P2：发布自动化

当前没有 CI 和商店发布流水线。

需要完成：

- GitHub Actions 或其他 CI。
- `npm run test:app:preflight`。
- Android release AAB 自动构建。
- iOS Archive 自动构建。
- fastlane 上传 TestFlight 和 Play Internal testing。
- 版本号策略：`versionName`、`versionCode`、iOS build number。
- 环境变量和密钥管理。

验收标准：

- main 或 release 分支可一键生成测试包。
- 每次包都能追踪 commit、版本、构建环境和埋点渠道。
- Store metadata 和截图可以版本化管理。

## 建议里程碑

### M1：原生壳可测，1-2 周

交付：

- Capacitor 接入。
- iOS/Android 工程。
- 图标、启动图、safe area。
- 真机可运行 H5 工作台。
- Android AAB 和 iOS Archive 初版。

退出标准：

- iOS TestFlight 内部测试可安装。
- Android Internal testing 可安装。
- 基础仿真、拖动、接线、题库、套餐页都可用。

### M2：账号付费闭环，2-4 周

交付：

- 账号系统。
- StoreKit / Play Billing。
- 后端收据校验。
- 权益同步。
- 恢复购买。

退出标准：

- 沙盒付费、恢复、退款、过期全部通过。
- App 内数字内容符合 IAP / Play Billing 规则。

### M3：海外首发内容，2-3 周

交付：

- `en-US`、`zh-CN`、`zh-TW`。
- 英文商店 metadata。
- 截图和订阅页。
- 隐私、条款、支持、删除账号页面。

退出标准：

- App Store Connect 和 Play Console 表单可完整填写。
- 审核账号可访问完整 Pro 路径。

### M4：运营和灰度，1-2 周

交付：

- 埋点真实落地。
- 崩溃监控。
- 后台最小可用版。
- TestFlight 外部测试和 Play Closed testing。

退出标准：

- D1 留存、首个电路完成率、训练完成率、付费漏斗可看。
- 内测无阻断崩溃。

## 优先级清单

| 优先级 | 工作 | 负责人角色 | 验收 |
| --- | --- | --- | --- |
| P0 | 接入 Capacitor，生成 `ios/`、`android/` | 客户端 | 真机可安装 |
| P0 | 建立 privacy/terms/support/account deletion 页面 | 后端/产品/法务 | HTTPS 200，App 内可访问 |
| P0 | 账号、权益、购买后端 | 后端 | 权益可跨设备恢复 |
| P0 | iOS IAP 和 Play Billing | 客户端/后端 | 沙盒购买全流程通过 |
| P0 | 商店账号、包名、证书、签名 | 发布工程 | TestFlight / Internal testing 可上传 |
| P1 | 多语言框架和英语内容 | 前端/内容 | `en-US` 全覆盖 |
| P1 | 商店素材和审核说明 | 设计/产品 | listing 完整 |
| P1 | Data safety / App Privacy / 国内隐私检测 | 产品/法务/客户端 | 表单与实际 SDK 一致 |
| P1 | 真机矩阵测试 | QA | 无 P0/P1 问题 |
| P2 | 运营后台和内容配置 | 后端/运营 | 课程和权益可后台管理 |
| P2 | 埋点真实 SDK/接口落地 | 数据/客户端 | 国内外数据分流可看 |
| P2 | CI + fastlane | 发布工程 | 一键构建和上传测试包 |

## 当前可以保留的优势

- 仿真核心在 `src/core`，业务逻辑与 UI 解耦，适合复用到 App 壳。
- 移动端已有底部导航和横向画布，不需要从零重做移动工作台。
- 元件注册、素材库、训练和题库已经结构化，后续可作为付费内容资产。
- 商业化门禁和套餐模型已抽象，可接真实权益服务。
- 国内/海外埋点抽象已存在，后续接 SDK 时不需要大改页面。
- 测试体系已有 `typecheck`、单测、E2E、H5/小程序兼容构建。

## 主要风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| WebView 画布性能不足 | 低端安卓体验差，审核体验受影响 | 先真机压测，必要时将导线层改为 Canvas/SVG |
| 支付规则处理错误 | App Store / Google Play 拒审 | App 内数字内容默认走 IAP / Play Billing |
| 多语言质量差 | 海外转化低，教育可信度下降 | 建 glossary，人工复核电学术语 |
| 隐私表单与 SDK 不一致 | 审核失败或下架风险 | SDK 清单和数据字典随版本维护 |
| 无后端权益恢复 | 退款和投诉增加 | 收据服务端校验，支持恢复购买 |
| 儿童受众误判 | 审核和合规成本上升 | 首发定位 13+，不进 Kids Category，不接广告 |
| 国内安卓渠道碎片化 | 多渠道维护成本高 | 先 Google Play + App Store，国内安卓第二阶段 |

## 官方规则依据

- Apple App Store 提交要求：https://developer.apple.com/app-store/submitting/
  - 2026-04-28 起，上传 App Store Connect 的 iOS/iPadOS App 需要使用 iOS & iPadOS 26 SDK 或更新版本。
  - App Store Connect 需要产品页、年龄分级、App Privacy Details 等信息。
- Apple App Review Guidelines：https://developer.apple.com/app-store/review/guidelines/
  - 账号型 App 需要提供审核账号或完整 demo mode。
  - 解锁 App 内功能、订阅、付费内容需要使用 In-App Purchase。
  - 多平台服务可以访问外部已购内容，但 App 内也需要提供对应 IAP。
  - 所有 App 都需要可访问的隐私政策。
- Google Play target API 要求：https://developer.android.com/google/play/requirements/target-sdk
  - 2025-08-31 起，新 App 和更新需要 target Android 15 / API level 35 或更高。
- Android App Bundle：https://developer.android.com/guide/app-bundle
  - Google Play 新 App 使用 Android App Bundle 发布。
- Google Play Billing：https://developer.android.com/google/play/billing
  - Android App 内销售数字内容和订阅需要 Play Billing，并建议服务端校验和后端集成。
- Google Play Data safety：https://support.google.com/googleplay/android-developer/answer/10787469
  - Google Play 上架需要完成 Data safety 表单；即使不采集用户数据，也需要提交表单并提供隐私政策。

## 下一步建议

立即进入 M1，不建议继续只扩内容。当前最大的上架缺口是“没有原生包”和“没有真实付费权益服务”。建议下一轮开发直接做：

1. 接入 Capacitor 并生成 `ios/`、`android/`。
2. 增加 `app:sync`、`build:android:aab`、`app:open:ios`、`app:open:android` 脚本。
3. 增加隐私/条款/支持/删除账号静态页面或官网目录。
4. 定义后端 API schema：auth、entitlements、billing、progress。
5. 建立 `en-US` i18n 框架和首批英文 UI 文案。
