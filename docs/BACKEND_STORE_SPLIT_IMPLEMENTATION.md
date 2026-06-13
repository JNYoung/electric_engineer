# 后台与中国/美国包拆分实施记录

## 已落地

- `server/auth-dev-server.mjs` 从单一 auth mock 扩展为 app backend 骨架。
- 国内默认端口 `4317`，海外默认端口 `4318`。
- 后台接口覆盖账号、绑定、账号删除、进度同步、题库、权益和合规 manifest。
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
- 内部测试解锁：只允许服务端 `ENABLE_TEST_UNLOCK=true` 时启用。

## 美国/Google Play 包

- 登录：Facebook、Google、手机号验证码、邮箱。
- 后台默认端口：`4318`。
- 数据区域：`US`。
- 合规输出：隐私政策、Data safety 对应数据类型、账号删除入口。
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
- 支付：将 entitlement 写入接入 Google Play Billing / 国内支付回调。
- 账号删除：接入真实删除队列、邮件通知和后台审核台。

## 官方参考

- Android build variants: `https://developer.android.com/build/build-variants`
- Google Play User Data policy: `https://support.google.com/googleplay/android-developer/answer/10144311`
- Apple account deletion guideline: `https://developer.apple.com/support/offering-account-deletion-in-your-app/`
- WeChat Open Platform mobile app login: `https://developers.weixin.qq.com/doc/oplatform/Mobile_App/WeChat_Login/Development_Guide.html`
