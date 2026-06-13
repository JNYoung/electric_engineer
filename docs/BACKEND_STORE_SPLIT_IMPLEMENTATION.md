# 后台与中国/美国包拆分实施记录

## 已落地

- `server/auth-dev-server.mjs` 从单一 auth mock 扩展为 app backend 骨架。
- 国内默认端口 `4317`，海外默认端口 `4318`。
- 后台接口覆盖账号、绑定、账号删除、进度同步、题库、权益、付费订阅和合规 manifest。
- 前台登录入口改为弹窗，不再暴露 API 地址、端口、接口路径、测试码和原生插件说明。
- Google Play 包与国内包继续使用 flavor-scoped 依赖。

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

## 中国包

- 登录：微信、手机号验证码、邮箱密码。
- 后台默认端口：`4317`。
- 数据区域：`CN`。
- 合规输出：隐私政策、SDK 清单、权限清单、账号注销入口。
- 付费：`domestic_channel` 商品目录，预留国内渠道支付/微信支付/支付宝回调。
- 内部测试解锁：只允许服务端 `ENABLE_TEST_UNLOCK=true` 时启用。

## 美国/Google Play 包

- 登录：Facebook、Google、手机号验证码、邮箱。
- 后台默认端口：`4318`。
- 数据区域：`US`。
- 合规输出：隐私政策、Data safety 对应数据类型、账号删除入口。
- 付费：`google_play` 商品目录、恢复购买和 webhook 幂等处理。
- 广告：仅免费账号的账号页 banner，付费权益账号隐藏。

## 内部测试解锁

正式包前台不外显测试入口。后台只保留受环境变量保护的接口：

```bash
ENABLE_TEST_UNLOCK=true npm run dev:backend:overseas
```

未启用时 `POST /api/entitlements/test-unlock` 返回 `403`。

## 后续替换点

- 短信服务：替换 `/api/auth/otp/send`。
- OAuth：微信、Google、Facebook token 校验替换 `/api/auth/sign-in`。
- 持久化：将当前内存 Map 替换为数据库表。
- 支付：当前已落地 checkout、restore、portal、webhook 和 entitlement 写入骨架；后续替换为 Google Play Billing purchase token 校验、RTDN、国内渠道支付/微信支付/支付宝回调验签。
- 账号删除：接入真实删除队列、邮件通知和后台审核台。

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
