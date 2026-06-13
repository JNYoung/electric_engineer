# 后台与中国/美国包拆分实施记录

## 已落地

- `server/auth-dev-server.mjs` 从账号原型扩展为本地 app backend 骨架。
- 国内默认端口 `4317`，海外默认端口 `4318`。
- 后台接口覆盖账号、绑定、账号删除、进度同步、题库、权益、付费订阅和合规 manifest。
- 后台支持可选文件持久化，便于本地内测、审核账号和真机验证跨重启保留数据。
- 后台新增受 token 保护的运营/审核接口，可查看用户、进度、题库、删除队列、付费流水，并可创建审核账号或手动补发权益。
- 后台新增国内/海外 telemetry 接收接口，按 flavor schema 入库，并在运营接口中支持按区域和事件名查询。
- 前台登录入口改为弹窗，不再暴露 API 地址、端口、接口路径、测试码和原生插件说明。
- 账号页新增账号删除入口，已登录用户可提交删除队列，国内/海外按各自 SLA 返回处理时限。
- Google Play 包与国内包继续使用 flavor-scoped 依赖：Google/Facebook/Firebase/Ads 只进 Google Play 变体，国内包只保留国内登录依赖占位。
- Google/Firebase/AdMob manifest metadata 仅放在 Google Play flavor manifest，国内 APK manifest 不暴露海外 SDK 配置。
- Android 新增正式/内测包拆分：正式包不外显内部解锁入口，内测包在账号页底部显示内部测试解锁。

## 后台接口

- `GET /health`
- `GET /api/app/config?region=domestic|overseas`
- `GET /api/compliance/manifest?region=domestic|overseas`
- `GET /api/auth/config?region=domestic|overseas`
- `POST /api/auth/otp/send`
- `POST /api/auth/sign-in`
- `POST /api/auth/link`
- `POST /api/auth/sign-out`
- `GET /api/auth/profile`
- `POST /api/auth/account/delete`
- `GET /api/billing/products`
- `POST /api/billing/checkout`
- `POST /api/billing/restore`
- `GET|POST /api/billing/portal`
- `POST /api/billing/webhook`
- `GET /api/entitlements`
- `POST /api/entitlements/test-unlock`
- `GET /api/progress`
- `POST /api/progress/sync`
- `GET /api/question-banks`
- `POST /api/question-banks`
- `POST /api/question-banks/:id/answer`
- `POST /api/telemetry/cn/events`
- `POST /api/telemetry/global/events`

## 后台持久化与运营接口

默认不配置时后台仍以内存运行，方便测试隔离。需要跨重启保存账号、token、进度、题库、权益、付费事件和删除请求时，配置文件路径：

```bash
APP_BACKEND_STORE_PATH=.data/electric-master-backend/domestic.json npm run dev:backend:domestic
APP_BACKEND_STORE_PATH=.data/electric-master-backend/overseas.json npm run dev:backend:overseas
```

运营/审核接口默认关闭。配置 `APP_BACKEND_ADMIN_TOKEN` 后，用 `Authorization: Bearer <token>` 或 `x-admin-token` 访问：

- `GET /api/admin/users`
- `GET /api/admin/progress?userId=...`
- `GET /api/admin/question-banks?userId=...`
- `GET /api/admin/deletion-requests`
- `GET /api/admin/billing-transactions?userId=...`
- `GET /api/admin/telemetry-events?region=...&eventName=...&limit=...`
- `POST /api/admin/review-accounts`
- `POST /api/admin/entitlements/grant`

审核账号示例：

```bash
APP_BACKEND_STORE_PATH=.data/electric-master-backend/overseas.json \
APP_BACKEND_ADMIN_TOKEN=local-admin \
npm run dev:backend:overseas

curl -X POST http://127.0.0.1:4318/api/admin/review-accounts \
  -H 'Authorization: Bearer local-admin' \
  -H 'Content-Type: application/json' \
  -d '{"region":"overseas","provider":"google","tier":"team"}'
```

该接口会返回可用于 App 登录联调的 provider、credential、token，并把对应账号权益写入持久化文件。正式部署时应把同一契约迁移到数据库和真正的管理台权限系统。

Telemetry 接收按 flavor 分流：

- 国内包使用 `cn-edu-v1` 包络，投递到 `POST /api/telemetry/cn/events`。
- Google Play/海外包使用 `global-edu-v1` 包络，投递到 `POST /api/telemetry/global/events`。
- App 端使用 `AUTH_API_BASE_URL + telemetry endpoint` 做 fire-and-forget 上报；真机联调需要把 `AUTH_API_BASE_URL` 指到可访问的局域网或生产后台地址。
- 服务端只保存短 hash 后的 anonymous/session 标识，运营接口不返回原始客户端 ID。
- 本地 JSON 持久化会保留最近 1000 条事件，正式环境需替换为可查询的数据仓库或埋点平台。

## 中国包

- 登录：微信、手机号验证码、邮箱密码。
- 后台默认端口：`4317`。
- 数据区域：`CN`。
- 合规输出：隐私政策、SDK 清单、权限清单、账号注销入口。
- 埋点：`cn-edu-v1`，自建 `product_analytics` 接收。
- 付费：`domestic_channel` 商品目录，预留国内渠道支付/微信支付/支付宝回调。
- 内部测试解锁：只允许服务端 `ENABLE_TEST_UNLOCK=true` 时启用。

## 美国/Google Play 包

- 登录：Facebook、Google、手机号验证码、邮箱。
- 后台默认端口：`4318`。
- 数据区域：`US`。
- 合规输出：隐私政策、Data safety 对应数据类型、账号删除入口。
- 埋点：`global-edu-v1`，自建 `product_analytics` 接收，Google Play 包仍可并行接原生分析 adapter。
- 付费：`google_play` 商品目录、恢复购买和 webhook 幂等处理。
- 套餐展示：Google Play/海外包显示美元月费，国内包显示人民币月费。
- 广告：仅账号页 banner，正式包通过真实 AdMob 环境变量开启；付费权益账号隐藏，内测包可使用测试广告位。

## 内部测试解锁

正式包前台不外显测试入口。内测包通过 `INTERNAL_TEST_UNLOCK=true` 构建常量显示账号页底部入口，并调用受环境变量保护的后台接口：

```bash
ENABLE_TEST_UNLOCK=true npm run dev:backend:overseas
```

未启用时 `POST /api/entitlements/test-unlock` 返回 `403`。正式构建即使误调用前端解锁函数也会拒绝。

Android 内测包：

```bash
npm run android:apk:domestic:internal:debug
npm run android:apk:googleplay:internal:debug
npm run android:apk:domestic:internal:release
npm run android:apk:googleplay:internal:release
npm run android:aab:googleplay:internal:release
```

Android 正式/常规包仍使用原命令：

```bash
npm run android:apk:domestic:debug
npm run android:apk:googleplay:debug
npm run android:apk:domestic:release
npm run android:apk:googleplay:release
npm run android:aab:googleplay:release
```

内测 flavor 使用 `.internal` applicationId suffix，可与正式包并存安装。

## 后续替换点

- 短信服务：替换 `/api/auth/otp/send`。
- OAuth：微信、Google、Facebook token 校验替换 `/api/auth/sign-in`。
- 持久化：当前已支持 JSON 文件落盘；正式服务需替换为数据库表、迁移脚本、备份和审计日志。
- 埋点：当前已支持自建接收和运营查询；正式服务需接入同意管理、采样、数据保留策略和区域化数据仓库。
- 支付：当前已落地 checkout、restore、portal、webhook 和 entitlement 写入骨架；后续替换为 Google Play Billing purchase token 校验、RTDN、国内渠道支付/微信支付/支付宝回调验签。
- 账号删除：当前已进入持久化删除队列；正式服务需接入邮件通知、后台处理状态流转和数据擦除任务。

## 付费订阅流

1. App 根据 flavor 调 `GET /api/billing/products` 获取商品目录。
2. 用户选择套餐后调 `POST /api/billing/checkout` 创建 pending transaction。
3. Google Play 包使用返回的 `clientAction=start_google_play_billing` 拉起原生 Billing；国内包使用 `start_domestic_channel_billing` 对接渠道支付。
4. 客户端恢复购买时调 `POST /api/billing/restore`，服务端写入 entitlement。
5. 商店/支付服务异步通知调 `POST /api/billing/webhook`，按 `eventId` 幂等更新 entitlement。

## 官方参考

- Android build variants: `https://developer.android.com/build/build-variants`
- Google Play User Data policy: `https://support.google.com/googleplay/android-developer/answer/10144311`
- Apple account deletion guideline: `https://developer.apple.com/support/offering-account-deletion-in-your-app/`
- WeChat Open Platform mobile app login: `https://developers.weixin.qq.com/doc/oplatform/Mobile_App/WeChat_Login/Development_Guide.html`
