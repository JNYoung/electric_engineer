import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const providerMatrix = {
  domestic: ['wechat', 'phone-otp', 'email-password'],
  overseas: ['facebook', 'google', 'phone-otp', 'email-password']
}

const storeProfiles = {
  domestic: {
    market: 'china',
    dataRegion: 'CN',
    billingProvider: 'domestic_channel',
    privacyPolicyPath: '/legal/privacy-cn',
    termsPath: '/legal/terms-cn',
    supportPath: '/support-cn',
    accountDeletionPath: '/account/delete-cn',
    billingPolicyPath: '/billing-cn',
    accountDeletionSlaDays: 15,
    requiredDisclosures: ['privacy-policy', 'sdk-list', 'permission-list', 'account-deletion']
  },
  overseas: {
    market: 'us',
    dataRegion: 'US',
    billingProvider: 'google_play',
    privacyPolicyPath: '/legal/privacy-us',
    termsPath: '/legal/terms-us',
    supportPath: '/support-us',
    accountDeletionPath: '/account/delete-us',
    billingPolicyPath: '/billing-us',
    accountDeletionSlaDays: 30,
    requiredDisclosures: ['privacy-policy', 'data-safety', 'account-deletion']
  }
}

const billingCatalog = {
  domestic: {
    currency: 'CNY',
    products: [
      { tier: 'pro', sku: 'cn_dg_pro_month', displayName: 'CN Pro Monthly', amountMinor: 3900, period: 'month' },
      { tier: 'team', sku: 'cn_dg_team_month', displayName: 'CN Team Monthly', amountMinor: 19900, period: 'month' }
    ]
  },
  overseas: {
    currency: 'USD',
    products: [
      { tier: 'pro', sku: 'googleplay_dg_pro_month', displayName: 'Pro Monthly', amountMinor: 599, period: 'month' },
      { tier: 'team', sku: 'googleplay_dg_team_month', displayName: 'Team Monthly', amountMinor: 2999, period: 'month' }
    ]
  }
}

const tierRank = {
  free: 0,
  pro: 1,
  team: 2
}

const maxTelemetryEvents = 1000

export function createAppBackendState(options = {}) {
  const storagePath = options.storagePath ?? process.env.APP_BACKEND_STORE_PATH ?? ''
  const state = {
    users: new Map(),
    tokens: new Map(),
    progress: new Map(),
    questionBanks: new Map(),
    entitlements: new Map(),
    billingTransactions: new Map(),
    billingEvents: new Map(),
    telemetryEvents: new Map(),
    deletionRequests: new Map(),
    storagePath
  }
  hydrateState(state, storagePath)
  return state
}

export function createAppBackendServer(options = {}) {
  const defaultRegion = normalizeRegion(options.region ?? process.env.AUTH_REGION)
  const defaultPort = Number(options.port ?? process.env.AUTH_SERVER_PORT ?? getDefaultPort(defaultRegion))
  const internalTestUnlock = String(options.internalTestUnlock ?? process.env.ENABLE_TEST_UNLOCK ?? '') === 'true'
  const adminToken = String(options.adminToken ?? process.env.APP_BACKEND_ADMIN_TOKEN ?? '')
  const state = options.state ?? createAppBackendState({ storagePath: options.storagePath })

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    if (req.method === 'OPTIONS') {
      json(res, 204, {})
      return
    }

    if (req.method === 'GET') {
      const page = buildPublicCompliancePage(url.pathname, getRequestRegion(url, defaultRegion))
      if (page) {
        html(res, 200, page)
        return
      }
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, 200, {
        ok: true,
        service: 'electric-master-backend',
        region: defaultRegion,
        port: defaultPort
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/app/config') {
      const region = getRequestRegion(url, defaultRegion)
      json(res, 200, {
        region,
        store: storeProfiles[region],
        auth: buildAuthConfig(region),
        features: {
          progressSync: true,
          questionBankSync: true,
          billing: true,
          purchaseRestore: true,
          accountDeletion: true,
          telemetry: true,
          internalTestUnlock
        }
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/compliance/manifest') {
      const region = getRequestRegion(url, defaultRegion)
      json(res, 200, {
        region,
        store: storeProfiles[region],
        sdkDisclosures: buildSdkDisclosures(region),
        dataCategories: ['account', 'course_progress', 'question_bank', 'purchase_status', 'billing_event', 'product_analytics'],
        publicPages: buildPublicPageManifest(region),
        accountDeletion: {
          endpoint: '/api/auth/account/delete',
          publicPath: storeProfiles[region].accountDeletionPath,
          slaDays: storeProfiles[region].accountDeletionSlaDays
        },
        support: {
          path: storeProfiles[region].supportPath
        },
        billing: {
          policyPath: storeProfiles[region].billingPolicyPath
        }
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/config') {
      const region = getRequestRegion(url, defaultRegion)
      json(res, 200, buildAuthConfig(region))
      return
    }

    if (url.pathname.startsWith('/api/admin/')) {
      if (!isAdminAuthorized(req, adminToken)) {
        json(res, adminToken ? 401 : 404, { error: adminToken ? 'admin_unauthorized' : 'admin_disabled' })
        return
      }

      const handled = await handleAdminRequest(req, res, url, state, defaultRegion)
      if (!handled) {
        json(res, 404, { error: 'admin_not_found' })
      }
      return
    }

    const telemetryRegion = getTelemetryRegionForPath(url.pathname)
    if (req.method === 'POST' && telemetryRegion) {
      const body = await readBody(req)
      const result = ingestTelemetryEvents(state, telemetryRegion, body)

      if (result.error) {
        json(res, 400, result)
        return
      }

      persistState(state)
      json(res, 200, result)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/otp/send') {
      const body = await readBody(req)
      json(res, 200, {
        ok: true,
        region: normalizeRegion(body.region ?? defaultRegion),
        phone: sanitizePhone(body.phone),
        expiresInSeconds: 300
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/sign-in') {
      const body = await readBody(req)
      const region = normalizeRegion(body.region ?? defaultRegion)
      const provider = normalizeProvider(region, body.provider)
      const session = upsertUserSession(state, region, provider, body.credential)
      const token = issueToken(state, session.userId)
      persistState(state)
      json(res, 200, { session, token })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/link') {
      const body = await readBody(req)
      const region = normalizeRegion(body.region ?? defaultRegion)
      const provider = normalizeProvider(region, body.provider)
      const userId = getAuthorizedUserId(req, state) ?? body.userId
      const session = userId ? state.users.get(userId) : undefined
      const linkedProviders = Array.from(new Set([...(session?.linkedProviders ?? body.linkedProviders ?? []), provider]))

      if (session) {
        session.linkedProviders = linkedProviders
        session.updatedAt = new Date().toISOString()
        persistState(state)
      }

      json(res, 200, {
        ok: true,
        linkedProvider: provider,
        linkedProviders
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/sign-out') {
      json(res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/profile') {
      const userId = getAuthorizedUserId(req, state)
      json(res, 200, {
        session: userId ? state.users.get(userId) : null
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/account/delete') {
      const body = await readBody(req)
      const userId = getAuthorizedUserId(req, state) ?? body.userId ?? 'anonymous-delete-request'
      const region = normalizeRegion(body.region ?? defaultRegion)
      const request = queueAccountDeletionRequest(state, {
        userId,
        region,
        source: 'api'
      })
      persistState(state)
      json(res, 200, request)
      return
    }

    if (req.method === 'POST' && url.pathname === '/account/delete-request') {
      const body = await readBody(req)
      const region = normalizeRegion(body.region ?? defaultRegion)
      const request = queueAccountDeletionRequest(state, {
        userId: body.userId || 'web-delete-request',
        region,
        source: 'public_web',
        contact: body.contact
      })
      persistState(state)
      html(res, 200, buildAccountDeletionConfirmationPage(region, request))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/billing/products') {
      const region = getRequestRegion(url, defaultRegion)
      json(res, 200, buildBillingCatalog(region))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/billing/checkout') {
      const body = await readBody(req)
      const region = normalizeRegion(body.region ?? defaultRegion)
      const userId = getAuthorizedUserId(req, state) ?? body.userId ?? 'anonymous'
      const product = findBillingProduct(region, body.sku, body.tier)

      if (!product) {
        json(res, 400, { error: 'billing_product_not_found' })
        return
      }

      const transaction = createBillingTransaction(state, {
        userId,
        region,
        product,
        status: 'pending',
        source: 'checkout'
      })
      persistState(state)

      json(res, 200, {
        transaction,
        clientAction: region === 'overseas' ? 'start_google_play_billing' : 'start_domestic_channel_billing',
        restoreEndpoint: '/api/billing/restore'
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/billing/restore') {
      const body = await readBody(req)
      const region = normalizeRegion(body.region ?? defaultRegion)
      const userId = getAuthorizedUserId(req, state) ?? body.userId ?? 'anonymous'
      const purchases = Array.isArray(body.purchases) ? body.purchases : [body.purchase ?? body].filter(Boolean)
      const restoredTransactions = []

      for (const purchase of purchases) {
        const product = findBillingProduct(region, purchase.sku, purchase.tier)
        if (!product || !purchase.purchaseToken) continue
        const transaction = createBillingTransaction(state, {
          userId,
          region,
          product,
          status: 'paid',
          source: 'restore',
          purchaseToken: purchase.purchaseToken,
          externalTransactionId: purchase.transactionId
        })
        restoredTransactions.push(transaction)
      }

      const entitlement = restoredTransactions.reduce((current, transaction) => {
        if (tierRank[transaction.tier] > tierRank[current.tier]) {
          return activateEntitlement(state, userId, transaction.tier, 'purchase_restore', {
            region,
            provider: transaction.provider,
            productId: transaction.sku,
            transactionId: transaction.id
          })
        }
        return current
      }, getEntitlements(state, userId))
      persistState(state)

      json(res, 200, {
        userId,
        entitlement,
        restoredTransactions
      })
      return
    }

    if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/api/billing/portal') {
      const body = req.method === 'POST' ? await readBody(req) : {}
      const region = normalizeRegion(url.searchParams.get('region') ?? body.region ?? defaultRegion)
      const userId = getAuthorizedUserId(req, state) ?? url.searchParams.get('userId') ?? body.userId ?? 'anonymous'
      json(res, 200, buildBillingPortal(state, region, userId))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/billing/webhook') {
      const body = await readBody(req)
      const region = normalizeRegion(body.region ?? defaultRegion)
      const eventId = body.eventId || `evt_${crypto.randomUUID()}`

      if (state.billingEvents.has(eventId)) {
        json(res, 200, {
          ok: true,
          duplicate: true,
          event: state.billingEvents.get(eventId)
        })
        return
      }

      const product = findBillingProduct(region, body.sku, body.tier)
      const userId = getAuthorizedUserId(req, state) ?? body.userId ?? 'anonymous'
      const event = {
        id: eventId,
        type: body.type || 'purchase.updated',
        region,
        provider: storeProfiles[region].billingProvider,
        userId,
        sku: product?.sku ?? body.sku ?? null,
        tier: product?.tier ?? normalizeTier(body.tier),
        status: body.status || 'active',
        receivedAt: new Date().toISOString()
      }
      state.billingEvents.set(eventId, event)

      let entitlement = getEntitlements(state, userId)
      if (['paid', 'active', 'renewed', 'restored'].includes(event.status) && event.tier !== 'free') {
        entitlement = activateEntitlement(state, userId, event.tier, 'billing_webhook', {
          region,
          provider: event.provider,
          productId: event.sku,
          eventId
        })
      } else if (['expired', 'refunded', 'revoked', 'canceled'].includes(event.status)) {
        entitlement = activateEntitlement(state, userId, 'free', 'billing_webhook', {
          region,
          provider: event.provider,
          productId: event.sku,
          eventId
        })
      }
      persistState(state)

      json(res, 200, {
        ok: true,
        event,
        entitlement
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/entitlements') {
      const userId = getAuthorizedUserId(req, state) ?? url.searchParams.get('userId') ?? 'anonymous'
      json(res, 200, getEntitlements(state, userId))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/entitlements/test-unlock') {
      if (!internalTestUnlock) {
        json(res, 403, { error: 'internal_test_unlock_disabled' })
        return
      }
      const body = await readBody(req)
      const userId = getAuthorizedUserId(req, state) ?? body.userId ?? 'anonymous'
      const entitlement = activateEntitlement(state, userId, 'team', 'internal_test_unlock')
      persistState(state)
      json(res, 200, entitlement)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/progress') {
      const userId = getAuthorizedUserId(req, state) ?? url.searchParams.get('userId') ?? 'anonymous'
      json(res, 200, getProgress(state, userId))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/progress/sync') {
      const body = await readBody(req)
      const userId = getAuthorizedUserId(req, state) ?? body.userId ?? 'anonymous'
      const current = getProgress(state, userId)
      const incoming = body.progress ?? {}
      const next = {
        ...current,
        ...incoming,
        courseProgress: {
          ...(current.courseProgress ?? {}),
          ...(incoming.courseProgress ?? {})
        },
        questionBank: {
          ...(current.questionBank ?? {}),
          ...(incoming.questionBank ?? {})
        },
        userId,
        updatedAt: new Date().toISOString()
      }
      state.progress.set(userId, next)
      persistState(state)
      json(res, 200, next)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/question-banks') {
      const userId = getAuthorizedUserId(req, state) ?? url.searchParams.get('userId') ?? 'anonymous'
      json(res, 200, {
        userId,
        banks: getQuestionBanks(state, userId)
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/question-banks') {
      const body = await readBody(req)
      const userId = getAuthorizedUserId(req, state) ?? body.userId ?? 'anonymous'
      const bank = {
        id: `qb_${crypto.randomUUID()}`,
        userId,
        title: body.title || 'default-bank',
        mode: body.mode || 'question-bank',
        trackId: body.trackId || 'high-school',
        answers: [],
        wrongQuestionIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      const banks = getQuestionBanks(state, userId)
      banks.push(bank)
      state.questionBanks.set(userId, banks)
      persistState(state)
      json(res, 200, bank)
      return
    }

    const answerMatch = /^\/api\/question-banks\/([^/]+)\/answer$/.exec(url.pathname)
    if (req.method === 'POST' && answerMatch) {
      const body = await readBody(req)
      const userId = getAuthorizedUserId(req, state) ?? body.userId ?? 'anonymous'
      const banks = getQuestionBanks(state, userId)
      const bank = banks.find((item) => item.id === answerMatch[1])

      if (!bank) {
        json(res, 404, { error: 'question_bank_not_found' })
        return
      }

      const answer = {
        questionId: body.questionId,
        answerId: body.answerId,
        correct: Boolean(body.correct),
        answeredAt: new Date().toISOString()
      }
      bank.answers = [
        ...bank.answers.filter((item) => item.questionId !== answer.questionId),
        answer
      ]
      if (!answer.correct && answer.questionId) {
        bank.wrongQuestionIds = Array.from(new Set([...bank.wrongQuestionIds, answer.questionId]))
      } else if (answer.questionId) {
        bank.wrongQuestionIds = bank.wrongQuestionIds.filter((questionId) => questionId !== answer.questionId)
      }
      bank.updatedAt = new Date().toISOString()
      persistState(state)
      json(res, 200, bank)
      return
    }

    json(res, 404, { error: 'not_found' })
  })
}

function json(res, status, payload) {
  const body = JSON.stringify(payload, null, 2)
  res.writeHead(status, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-admin-token',
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  })
  res.end(body)
}

function html(res, status, body) {
  res.writeHead(status, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-admin-token',
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        if (!body) {
          resolve({})
          return
        }

        const contentType = String(req.headers['content-type'] ?? '')
        if (contentType.includes('application/x-www-form-urlencoded')) {
          resolve(Object.fromEntries(new URLSearchParams(body)))
          return
        }

        resolve(JSON.parse(body))
      } catch {
        resolve({})
      }
    })
  })
}

function buildPublicPageManifest(region) {
  const profile = storeProfiles[region]
  return {
    privacy: profile.privacyPolicyPath,
    terms: profile.termsPath,
    support: profile.supportPath,
    accountDeletion: profile.accountDeletionPath,
    billing: profile.billingPolicyPath
  }
}

function buildPublicCompliancePage(pathname, fallbackRegion) {
  const route = resolvePublicComplianceRoute(pathname, fallbackRegion)
  if (!route) return null

  if (route.type === 'privacy') return renderPrivacyPage(route.region)
  if (route.type === 'terms') return renderTermsPage(route.region)
  if (route.type === 'support') return renderSupportPage(route.region)
  if (route.type === 'account-delete') return renderAccountDeletionPage(route.region)
  if (route.type === 'billing') return renderBillingPage(route.region)
  return null
}

function resolvePublicComplianceRoute(pathname, fallbackRegion) {
  const explicitRoutes = {
    '/legal/privacy-cn': { type: 'privacy', region: 'domestic' },
    '/legal/privacy-us': { type: 'privacy', region: 'overseas' },
    '/legal/terms-cn': { type: 'terms', region: 'domestic' },
    '/legal/terms-us': { type: 'terms', region: 'overseas' },
    '/support-cn': { type: 'support', region: 'domestic' },
    '/support-us': { type: 'support', region: 'overseas' },
    '/account/delete-cn': { type: 'account-delete', region: 'domestic' },
    '/account/delete-us': { type: 'account-delete', region: 'overseas' },
    '/billing-cn': { type: 'billing', region: 'domestic' },
    '/billing-us': { type: 'billing', region: 'overseas' }
  }
  if (explicitRoutes[pathname]) return explicitRoutes[pathname]

  const genericRoutes = {
    '/privacy': 'privacy',
    '/terms': 'terms',
    '/support': 'support',
    '/account/delete': 'account-delete',
    '/billing': 'billing'
  }
  if (!genericRoutes[pathname]) return null

  return {
    type: genericRoutes[pathname],
    region: fallbackRegion
  }
}

function renderPrivacyPage(region) {
  const isDomestic = region === 'domestic'
  const title = isDomestic ? '电工大师隐私政策' : 'Electric Master Privacy Policy'
  return renderPublicPage({
    region,
    title,
    kicker: isDomestic ? '隐私与数据保护' : 'Privacy and data protection',
    lead: isDomestic
      ? '我们只收集账号登录、学习进度、题库答题、购买权益和产品分析所必需的数据，并按国内包与海外包分别处理。'
      : 'We process only the data needed for account sign-in, learning progress, question banks, purchases, support, and product analytics.',
    sections: isDomestic
      ? [
          {
            heading: '我们收集的信息',
            items: ['账号标识、手机号、邮箱或微信登录状态。', '课程进度、题库答题、错题和仿真练习记录。', '套餐权益、购买状态、订单状态和恢复购买结果。', 'App 版本、渠道、设备平台、匿名会话和产品分析事件。']
          },
          {
            heading: '使用目的',
            items: ['提供登录、账号绑定、跨设备同步、题库练习和权益恢复。', '处理客服、账号注销、支付状态核验和安全风控。', '统计核心功能完成率，改进课程、仿真和题库体验。']
          },
          {
            heading: '第三方 SDK 与共享',
            items: ['国内包仅启用微信登录、短信验证码和自建产品分析所需能力。', '不会把题库答案或学习详情用于广告追踪。', '正式接入新 SDK 前会同步更新 SDK 清单、权限清单和隐私政策。']
          },
          {
            heading: '保存、删除与联系我们',
            items: [`账号删除请求会进入删除队列，预计 ${storeProfiles[region].accountDeletionSlaDays} 天内处理。`, '你可以在 App 账号页提交删除，也可以使用本页底部的公开删除入口。', '支持页面提供问题反馈、订阅和数据权利联系渠道。']
          }
        ]
      : [
          {
            heading: 'Data we collect',
            items: ['Account identifiers, email, phone number, Google or Facebook sign-in state.', 'Course progress, question-bank answers, wrong-question sets, and simulation practice state.', 'Entitlement tier, purchase status, transaction state, and purchase-restore results.', 'App version, channel, platform, locale, anonymous session, and product analytics events.']
          },
          {
            heading: 'How we use data',
            items: ['Provide sign-in, account linking, progress sync, question banks, and entitlement restore.', 'Handle support, account deletion, billing status checks, fraud prevention, and service reliability.', 'Measure feature completion and improve lessons, simulations, and question-bank quality.']
          },
          {
            heading: 'Third parties and Data Safety',
            items: ['Google Play builds may use Google Sign-In, Facebook Login, Google Play Billing, and an account-page ad banner for free accounts.', 'Paid accounts do not show ads, and learning answers are not used for ad targeting.', 'The Data Safety form should match the SDK list and data categories returned by the compliance manifest.']
          },
          {
            heading: 'Retention, deletion, and contact',
            items: [`Account deletion requests are queued and handled within ${storeProfiles[region].accountDeletionSlaDays} days.`, 'You can request deletion in the app account page or through the public deletion page.', 'Support links below cover subscription, restore, deletion, and privacy questions.']
          }
        ],
    actions: buildPublicPageActions(region)
  })
}

function renderTermsPage(region) {
  const isDomestic = region === 'domestic'
  return renderPublicPage({
    region,
    title: isDomestic ? '电工大师服务条款' : 'Electric Master Terms of Service',
    kicker: isDomestic ? '服务规则' : 'Service terms',
    lead: isDomestic
      ? '使用电工大师即表示你同意遵守学习、仿真、题库、账号和订阅相关规则。'
      : 'By using Electric Master, you agree to the rules for learning content, simulations, question banks, accounts, and subscriptions.',
    sections: isDomestic
      ? [
          {
            heading: '账号与安全',
            items: ['请使用本人可控制的手机号、邮箱或微信账号登录。', '请勿共享账号、绕过权益限制或批量抓取题库与课程内容。']
          },
          {
            heading: '学习内容与仿真',
            items: ['仿真和题库用于教育训练，不能替代现场电气作业规范、持证要求和专业安全评估。', '涉及真实设备、强电或工控系统时，应由具备资质的人员执行。']
          },
          {
            heading: '订阅与权益',
            items: ['国内包通过国内渠道支付或平台允许的支付方式开通权益。', '购买、退款、恢复和续费状态以支付渠道和服务端权益记录为准。']
          },
          {
            heading: '变更与终止',
            items: ['我们可能根据法规、商店规则或课程运营调整功能和条款。', '严重违反安全、支付或内容使用规则时，可能限制账号访问。']
          }
        ]
      : [
          {
            heading: 'Accounts and security',
            items: ['Use an email, phone number, Google account, or Facebook account you control.', 'Do not share accounts, bypass entitlements, or scrape lessons and question-bank content.']
          },
          {
            heading: 'Educational use',
            items: ['Simulations and question banks are for learning and do not replace field electrical codes, licensing, or professional safety review.', 'Real equipment, high-voltage work, and industrial control systems must be handled by qualified people.']
          },
          {
            heading: 'Subscriptions and entitlements',
            items: ['Google Play builds use Google Play Billing for in-app digital content and subscription purchases.', 'Purchase restore, cancellation, refund, and renewal status are synchronized through store and backend records.']
          },
          {
            heading: 'Changes and termination',
            items: ['We may update features and terms to reflect regulation, store policy, or content operations.', 'Serious abuse of safety, billing, or content rules may limit account access.']
          }
        ],
    actions: buildPublicPageActions(region)
  })
}

function renderSupportPage(region) {
  const isDomestic = region === 'domestic'
  return renderPublicPage({
    region,
    title: isDomestic ? '电工大师客服支持' : 'Electric Master Support',
    kicker: isDomestic ? '帮助与联系' : 'Help and contact',
    lead: isDomestic
      ? '这里集中处理账号、题库进度、订阅权益、发票/退款、账号注销和数据权利请求。'
      : 'Use this page for account, question-bank progress, subscription, restore, refund, deletion, and data-rights support.',
    sections: isDomestic
      ? [
          {
            heading: '支持范围',
            items: ['登录、绑定手机号/邮箱/微信和账号状态异常。', '课程进度、题库同步、错题记录和跨设备恢复。', '订阅权益、支付状态、退款协助和账号注销。']
          },
          {
            heading: '联系信息',
            items: ['邮箱：support@electricmaster.app。', '提交问题时请附上 App 版本、渠道、账号登录方式和问题时间。', '账号删除请求请优先使用账号页或公开删除入口，便于核验身份。']
          }
        ]
      : [
          {
            heading: 'Support topics',
            items: ['Sign-in, linking email, phone, Google, or Facebook accounts.', 'Course progress, question-bank sync, wrong-question records, and device restore.', 'Subscriptions, Google Play purchase restore, refunds, account deletion, and privacy requests.']
          },
          {
            heading: 'Contact',
            items: ['Email: support@electricmaster.app.', 'Include app version, store channel, sign-in method, and issue time when you contact support.', 'For account deletion, use the in-app account page or the public deletion page so identity can be checked.']
          }
        ],
    actions: buildPublicPageActions(region)
  })
}

function renderAccountDeletionPage(region) {
  const isDomestic = region === 'domestic'
  return renderPublicPage({
    region,
    title: isDomestic ? '电工大师账号删除' : 'Electric Master Account Deletion',
    kicker: isDomestic ? '账号与数据删除' : 'Account and data deletion',
    lead: isDomestic
      ? `你可以在 App 账号页提交删除账号，也可以在此提交公开删除请求。我们会在 ${storeProfiles[region].accountDeletionSlaDays} 天内处理。`
      : `You can request deletion from the app account page or submit a public request here. Requests are handled within ${storeProfiles[region].accountDeletionSlaDays} days.`,
    sections: isDomestic
      ? [
          {
            heading: '会删除的数据',
            items: ['账号登录标识和绑定关系。', '学习进度、题库记录、错题记录和仿真练习状态。', '与账号关联的订阅权益状态和客服处理记录，法律或财务要求保留的订单摘要除外。']
          },
          {
            heading: '处理流程',
            items: ['优先在 App 账号页提交，系统会带上登录态。', '公开页面提交后，客服会根据联系方式核验账号归属。', '处理完成后，账号无法恢复，订阅取消和退款仍遵循支付渠道规则。']
          }
        ]
      : [
          {
            heading: 'Data deleted',
            items: ['Account sign-in identifiers and linked-provider state.', 'Learning progress, question-bank records, wrong-question sets, and simulation practice state.', 'Account-linked entitlement state and support records, except order summaries retained for legal or financial obligations.']
          },
          {
            heading: 'Process',
            items: ['The in-app account page is the preferred path because it includes your signed-in account.', 'Public web requests require support verification through the contact you provide.', 'Once completed, the account cannot be restored. Subscription cancellation and refunds still follow store policy.']
          }
        ],
    actions: buildPublicPageActions(region),
    form: buildAccountDeletionForm(region)
  })
}

function renderBillingPage(region) {
  const isDomestic = region === 'domestic'
  const catalog = billingCatalog[region]
  return renderPublicPage({
    region,
    title: isDomestic ? '电工大师订阅与付费说明' : 'Electric Master Billing Policy',
    kicker: isDomestic ? '订阅、退款与恢复' : 'Subscriptions, refunds, and restore',
    lead: isDomestic
      ? '付费内容用于解锁专业元件、题库、课程和训练能力，具体权益以 App 内套餐页和账号权益记录为准。'
      : 'Paid content unlocks professional components, question banks, lessons, and training features. Entitlements are synchronized with your store account and backend record.',
    sections: isDomestic
      ? [
          {
            heading: '商品目录',
            items: catalog.products.map((product) => `${product.displayName}: ${formatMinorAmount(catalog.currency, product.amountMinor)}/${product.period}`)
          },
          {
            heading: '恢复与退款',
            items: ['更换设备或重新登录后，可在账号页恢复已购买权益。', '退款、取消和续费按对应国内支付渠道或应用商店规则执行。', '付费账号不展示账号页广告。']
          }
        ]
      : [
          {
            heading: 'Catalog',
            items: catalog.products.map((product) => `${product.displayName}: ${formatMinorAmount(catalog.currency, product.amountMinor)}/${product.period}`)
          },
          {
            heading: 'Restore and refunds',
            items: ['Google Play builds use Google Play Billing for in-app digital content.', 'Restore purchases from the account page after reinstalling or changing devices.', 'Refunds, cancellation, and renewal management follow Google Play policy. Paid accounts do not show account-page ads.']
          }
        ],
    actions: buildPublicPageActions(region)
  })
}

function buildAccountDeletionConfirmationPage(region, request) {
  const isDomestic = region === 'domestic'
  return renderPublicPage({
    region,
    title: isDomestic ? '删除请求已提交' : 'Deletion Request Submitted',
    kicker: isDomestic ? '账号删除' : 'Account deletion',
    lead: isDomestic
      ? `请求编号 ${request.requestId} 已进入处理队列，预计 ${request.slaDays} 天内完成。`
      : `Request ${request.requestId} is queued and will be handled within ${request.slaDays} days.`,
    sections: isDomestic
      ? [
          {
            heading: '下一步',
            items: ['请保留请求编号。', '如通过公开页面提交，客服可能通过你提供的联系方式核验账号归属。', '处理完成后，账号和学习数据不可恢复。']
          }
        ]
      : [
          {
            heading: 'Next steps',
            items: ['Keep the request ID for support.', 'For public web requests, support may verify ownership through the contact you provided.', 'After completion, your account and learning data cannot be restored.']
          }
        ],
    actions: buildPublicPageActions(region)
  })
}

function buildPublicPageActions(region) {
  const profile = storeProfiles[region]
  return [
    { label: region === 'domestic' ? '隐私政策' : 'Privacy', href: profile.privacyPolicyPath },
    { label: region === 'domestic' ? '服务条款' : 'Terms', href: profile.termsPath },
    { label: region === 'domestic' ? '客服支持' : 'Support', href: profile.supportPath },
    { label: region === 'domestic' ? '删除账号' : 'Delete account', href: profile.accountDeletionPath },
    { label: region === 'domestic' ? '订阅说明' : 'Billing', href: profile.billingPolicyPath }
  ]
}

function buildAccountDeletionForm(region) {
  const isDomestic = region === 'domestic'
  return `
    <form class="request-form" method="post" action="/account/delete-request">
      <input type="hidden" name="region" value="${escapeHtml(region)}" />
      <label>
        <span>${isDomestic ? '账号或用户 ID' : 'Account or user ID'}</span>
        <input name="userId" autocomplete="username" placeholder="${isDomestic ? '可选' : 'Optional'}" />
      </label>
      <label>
        <span>${isDomestic ? '联系邮箱或手机号' : 'Contact email or phone'}</span>
        <input name="contact" autocomplete="email" required />
      </label>
      <button type="submit">${isDomestic ? '提交删除请求' : 'Submit deletion request'}</button>
    </form>
  `
}

function renderPublicPage({
  region,
  title,
  kicker,
  lead,
  sections,
  actions = [],
  form = ''
}) {
  const sectionMarkup = sections.map((section) => `
    <section>
      <h2>${escapeHtml(section.heading)}</h2>
      <ul>
        ${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </section>
  `).join('')
  const actionMarkup = actions.map((action) => `<a href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`).join('')

  return `<!doctype html>
<html lang="${region === 'domestic' ? 'zh-CN' : 'en-US'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #eef3f9; }
    body { margin: 0; padding: 24px; }
    main { max-width: 880px; margin: 0 auto; }
    header, section, .request-form { background: #fff; border: 1px solid #dbe3ef; border-radius: 10px; padding: 18px; box-sizing: border-box; }
    header { background: #132238; color: #fff; }
    .kicker { margin: 0 0 8px; color: rgba(255,255,255,.72); font-size: 13px; font-weight: 800; }
    h1 { margin: 0; font-size: clamp(26px, 5vw, 42px); line-height: 1.1; }
    .lead { margin: 12px 0 0; color: rgba(255,255,255,.78); line-height: 1.6; }
    nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
    nav a, button { border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; color: #172033; padding: 10px 12px; text-decoration: none; font-weight: 800; }
    section { margin-top: 12px; }
    h2 { margin: 0 0 10px; font-size: 18px; line-height: 1.3; }
    ul { margin: 0; padding-left: 20px; color: #4b5565; line-height: 1.7; }
    .request-form { display: grid; gap: 12px; margin-top: 12px; }
    label { display: grid; gap: 6px; color: #4b5565; font-weight: 800; }
    input { min-height: 42px; border: 1px solid #dbe3ef; border-radius: 8px; padding: 0 10px; font: inherit; box-sizing: border-box; }
    button { justify-self: start; background: #132238; color: #fff; cursor: pointer; }
    footer { margin-top: 16px; color: #657186; font-size: 12px; line-height: 1.6; }
    @media (max-width: 540px) { body { padding: 14px; } header, section, .request-form { padding: 14px; } nav a { flex: 1 1 44%; text-align: center; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="kicker">${escapeHtml(kicker)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lead">${escapeHtml(lead)}</p>
    </header>
    <nav>${actionMarkup}</nav>
    ${sectionMarkup}
    ${form}
    <footer>${region === 'domestic' ? '生效日期：2026-06-14。客服邮箱：support@electricmaster.app。' : 'Effective date: 2026-06-14. Contact: support@electricmaster.app.'}</footer>
  </main>
</body>
</html>`
}

function queueAccountDeletionRequest(state, {
  userId,
  region,
  source,
  contact
}) {
  const requestId = `del_${crypto.randomUUID()}`
  const request = {
    requestId,
    userId: String(userId || 'delete-request').slice(0, 120),
    region,
    status: 'queued',
    source,
    contactHash: contact ? hashSecret(contact).slice(0, 24) : null,
    requestedAt: new Date().toISOString(),
    slaDays: storeProfiles[region].accountDeletionSlaDays
  }
  state.deletionRequests.set(requestId, request)
  return request
}

function formatMinorAmount(currency, amountMinor) {
  const amount = Number(amountMinor) / 100
  if (currency === 'CNY') return `CNY ${amount.toFixed(2)}`
  if (currency === 'USD') return `USD ${amount.toFixed(2)}`
  return `${currency} ${amount.toFixed(2)}`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function handleAdminRequest(req, res, url, state, defaultRegion) {
  if (req.method === 'GET' && url.pathname === '/api/admin/users') {
    const region = url.searchParams.get('region')
    const users = Array.from(state.users.values())
      .filter((session) => !region || session.authRegion === normalizeRegion(region))
      .sort(sortByUpdatedAtDesc)
    json(res, 200, { users })
    return true
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/progress') {
    const userId = url.searchParams.get('userId')
    const progress = userId
      ? [getProgress(state, userId)]
      : Array.from(state.progress.values()).sort(sortByUpdatedAtDesc)
    json(res, 200, { progress })
    return true
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/question-banks') {
    const userId = url.searchParams.get('userId')
    const banks = userId
      ? getQuestionBanks(state, userId)
      : Array.from(state.questionBanks.values()).flat().sort(sortByUpdatedAtDesc)
    json(res, 200, { banks })
    return true
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/deletion-requests') {
    const requests = Array.from(state.deletionRequests.values()).sort(sortByRequestedAtDesc)
    json(res, 200, { requests })
    return true
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/billing-transactions') {
    const userId = url.searchParams.get('userId')
    const transactions = Array.from(state.billingTransactions.values())
      .filter((transaction) => !userId || transaction.userId === userId)
      .sort(sortByUpdatedAtDesc)
    json(res, 200, { transactions })
    return true
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/telemetry-events') {
    const region = url.searchParams.get('region')
    const eventName = url.searchParams.get('eventName')
    const limit = clampNumber(Number(url.searchParams.get('limit') ?? 100), 1, 500)
    const events = Array.from(state.telemetryEvents.values())
      .filter((event) => !region || event.region === normalizeRegion(region))
      .filter((event) => !eventName || event.eventName === eventName)
      .sort(sortByReceivedAtDesc)
    json(res, 200, {
      total: events.length,
      events: events.slice(0, limit)
    })
    return true
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/review-accounts') {
    const body = await readBody(req)
    const region = normalizeRegion(body.region ?? defaultRegion)
    const provider = normalizeProvider(region, body.provider)
    const credential = buildReviewCredential(region, provider, body)
    const session = upsertUserSession(state, region, provider, credential)
    const entitlement = activateEntitlement(state, session.userId, normalizeTier(body.tier ?? 'pro'), 'review_account', {
      region,
      provider,
      note: body.note ?? 'store_review'
    })
    const token = issueToken(state, session.userId)
    persistState(state)
    json(res, 200, {
      session: state.users.get(session.userId),
      entitlement,
      token,
      signIn: {
        region,
        provider,
        credential
      }
    })
    return true
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/entitlements/grant') {
    const body = await readBody(req)
    const userId = body.userId

    if (!userId) {
      json(res, 400, { error: 'user_id_required' })
      return true
    }

    const entitlement = activateEntitlement(state, userId, normalizeTier(body.tier), 'admin_grant', {
      reason: body.reason ?? 'manual_support',
      region: normalizeRegion(body.region ?? defaultRegion)
    })
    persistState(state)
    json(res, 200, entitlement)
    return true
  }

  return false
}

function isAdminAuthorized(req, adminToken) {
  if (!adminToken) return false

  const auth = req.headers.authorization ?? ''
  if (auth === `Bearer ${adminToken}`) return true

  return req.headers['x-admin-token'] === adminToken
}

function buildReviewCredential(region, provider, body) {
  if (body.credential && typeof body.credential === 'object') {
    return body.credential
  }

  if (provider === 'email-password') {
    return {
      email: body.email ?? `review-${region}@electricmaster.test`,
      password: body.password ?? 'review-pass'
    }
  }

  if (provider === 'phone-otp') {
    return {
      phone: body.phone ?? (region === 'domestic' ? '13800138000' : '+1555010000'),
      otp: body.otp ?? '000000'
    }
  }

  return {
    idToken: body.idToken ?? `${provider}-review-token`,
    openId: body.openId ?? `${region}-${provider}-review`
  }
}

function hydrateState(state, storagePath) {
  if (!storagePath || !fs.existsSync(storagePath)) return

  const snapshot = JSON.parse(fs.readFileSync(storagePath, 'utf8'))
  restoreMap(state.users, snapshot.users)
  restoreMap(state.tokens, snapshot.tokens)
  restoreMap(state.progress, snapshot.progress)
  restoreMap(state.questionBanks, snapshot.questionBanks)
  restoreMap(state.entitlements, snapshot.entitlements)
  restoreMap(state.billingTransactions, snapshot.billingTransactions)
  restoreMap(state.billingEvents, snapshot.billingEvents)
  restoreMap(state.telemetryEvents, snapshot.telemetryEvents)
  restoreMap(state.deletionRequests, snapshot.deletionRequests)
}

function persistState(state) {
  if (!state.storagePath) return

  const snapshot = {
    version: 1,
    updatedAt: new Date().toISOString(),
    users: Array.from(state.users.entries()),
    tokens: Array.from(state.tokens.entries()),
    progress: Array.from(state.progress.entries()),
    questionBanks: Array.from(state.questionBanks.entries()),
    entitlements: Array.from(state.entitlements.entries()),
    billingTransactions: Array.from(state.billingTransactions.entries()),
    billingEvents: Array.from(state.billingEvents.entries()),
    telemetryEvents: Array.from(state.telemetryEvents.entries()),
    deletionRequests: Array.from(state.deletionRequests.entries())
  }
  const directory = path.dirname(state.storagePath)
  const tempPath = `${state.storagePath}.${process.pid}.tmp`

  fs.mkdirSync(directory, { recursive: true })
  fs.writeFileSync(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`)
  fs.renameSync(tempPath, state.storagePath)
}

function restoreMap(map, entries) {
  map.clear()
  if (!Array.isArray(entries)) return

  entries.forEach(([key, value]) => {
    map.set(key, value)
  })
}

function sortByUpdatedAtDesc(left, right) {
  return String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? ''))
}

function sortByRequestedAtDesc(left, right) {
  return String(right.requestedAt ?? '').localeCompare(String(left.requestedAt ?? ''))
}

function sortByReceivedAtDesc(left, right) {
  return String(right.receivedAt ?? '').localeCompare(String(left.receivedAt ?? ''))
}

function getTelemetryRegionForPath(pathname) {
  if (pathname === '/api/telemetry/cn/events') return 'domestic'
  if (pathname === '/api/telemetry/global/events') return 'overseas'
  return null
}

function ingestTelemetryEvents(state, region, body) {
  const envelopes = Array.isArray(body.events) ? body.events : [body]
  const receivedAt = new Date().toISOString()
  const events = []

  if (envelopes.length === 0) {
    return { error: 'telemetry_events_required' }
  }

  for (const envelope of envelopes) {
    const event = buildTelemetryEvent(region, envelope, receivedAt)
    if (!event) {
      return { error: 'telemetry_schema_mismatch', region }
    }

    state.telemetryEvents.set(event.id, event)
    events.push(event)
  }

  trimTelemetryEvents(state)

  return {
    ok: true,
    region,
    received: events.length,
    events
  }
}

function buildTelemetryEvent(region, envelope, receivedAt) {
  if (!envelope || typeof envelope !== 'object') return null

  if (region === 'domestic' && envelope.schema === 'cn-edu-v1') {
    const common = envelope.common ?? {}
    return createStoredTelemetryEvent({
      region,
      schema: envelope.schema,
      eventName: String(envelope.event ?? '').replace(/^cn_/, '') || 'unknown',
      actorId: envelope.distinctId,
      timestamp: envelope.time,
      appVersion: common.appVersion,
      buildTarget: common.buildTarget,
      channel: common.channel,
      platform: common.platform,
      locale: common.locale,
      sessionId: common.sessionId,
      properties: envelope.properties,
      receivedAt
    })
  }

  if (region === 'overseas' && envelope.schema === 'global-edu-v1') {
    const app = envelope.app ?? {}
    return createStoredTelemetryEvent({
      region,
      schema: envelope.schema,
      eventName: String(envelope.eventName ?? '') || 'unknown',
      actorId: envelope.clientId,
      timestamp: Number(envelope.timestampMicros) / 1000,
      appVersion: app.version,
      buildTarget: app.buildTarget,
      channel: app.channel,
      platform: app.platform,
      locale: app.locale,
      sessionId: app.sessionId,
      properties: envelope.params,
      receivedAt
    })
  }

  return null
}

function createStoredTelemetryEvent({
  region,
  schema,
  eventName,
  actorId,
  timestamp,
  appVersion,
  buildTarget,
  channel,
  platform,
  locale,
  sessionId,
  properties,
  receivedAt
}) {
  return {
    id: `tel_${crypto.randomUUID()}`,
    region,
    schema,
    eventName,
    actorHash: hashSecret(actorId ?? 'anonymous').slice(0, 24),
    sessionHash: hashSecret(sessionId ?? 'session').slice(0, 24),
    appVersion: String(appVersion ?? ''),
    buildTarget: String(buildTarget ?? ''),
    channel: String(channel ?? ''),
    platform: String(platform ?? ''),
    locale: String(locale ?? ''),
    properties: sanitizeTelemetryProperties(properties),
    occurredAt: toIsoTime(timestamp),
    receivedAt
  }
}

function sanitizeTelemetryProperties(properties = {}) {
  if (!properties || typeof properties !== 'object') return {}

  return Object.entries(properties).reduce((result, [key, value]) => {
    if (typeof key !== 'string' || !key) return result
    if (value === undefined) return result
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key.slice(0, 80)] = value
      return result
    }
    result[key.slice(0, 80)] = String(value)
    return result
  }, {})
}

function toIsoTime(value) {
  const timestamp = Number(value)
  const time = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now()
  return new Date(time).toISOString()
}

function trimTelemetryEvents(state) {
  if (state.telemetryEvents.size <= maxTelemetryEvents) return

  const keepIds = new Set(
    Array.from(state.telemetryEvents.values())
      .sort(sortByReceivedAtDesc)
      .slice(0, maxTelemetryEvents)
      .map((event) => event.id)
  )

  for (const id of state.telemetryEvents.keys()) {
    if (!keepIds.has(id)) {
      state.telemetryEvents.delete(id)
    }
  }
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

function normalizeRegion(value) {
  return value === 'overseas' ? 'overseas' : 'domestic'
}

function getDefaultPort(region) {
  return region === 'overseas' ? 4318 : 4317
}

function getRequestRegion(url, fallback) {
  return normalizeRegion(url.searchParams.get('region') ?? fallback)
}

function normalizeProvider(region, provider) {
  return providerMatrix[region].includes(provider) ? provider : providerMatrix[region][0]
}

function buildAuthConfig(region) {
  return {
    region,
    providers: providerMatrix[region],
    endpoints: {
      signIn: '/api/auth/sign-in',
      link: '/api/auth/link',
      otp: '/api/auth/otp/send',
      profile: '/api/auth/profile',
      accountDelete: '/api/auth/account/delete'
    }
  }
}

function buildSdkDisclosures(region) {
  if (region === 'domestic') {
    return [
      { id: 'wechat', purpose: 'social_login', enabled: true },
      { id: 'sms', purpose: 'phone_otp', enabled: true },
      { id: 'self_hosted_telemetry', purpose: 'product_analytics', enabled: true }
    ]
  }

  return [
    { id: 'google_identity', purpose: 'social_login', enabled: true },
    { id: 'facebook_login', purpose: 'social_login', enabled: true },
    { id: 'admob', purpose: 'account_page_banner', enabled: true },
    { id: 'self_hosted_telemetry', purpose: 'product_analytics', enabled: true }
  ]
}

function buildBillingCatalog(region) {
  return {
    region,
    provider: storeProfiles[region].billingProvider,
    currency: billingCatalog[region].currency,
    products: billingCatalog[region].products
  }
}

function findBillingProduct(region, sku, tier) {
  const normalizedTier = normalizeTier(tier)
  return billingCatalog[region].products.find((product) => {
    if (sku && product.sku === sku) return true
    return normalizedTier !== 'free' && product.tier === normalizedTier
  })
}

function createBillingTransaction(state, {
  userId,
  region,
  product,
  status,
  source,
  purchaseToken,
  externalTransactionId
}) {
  const now = new Date().toISOString()
  const id = externalTransactionId
    ? `bill_${String(externalTransactionId).replace(/[^a-zA-Z0-9_-]+/g, '_')}`
    : `bill_${crypto.randomUUID()}`
  const transaction = {
    id,
    userId,
    region,
    provider: storeProfiles[region].billingProvider,
    sku: product.sku,
    tier: product.tier,
    amountMinor: product.amountMinor,
    currency: billingCatalog[region].currency,
    period: product.period,
    status,
    source,
    purchaseToken: purchaseToken ? hashSecret(purchaseToken) : null,
    createdAt: now,
    updatedAt: now
  }
  state.billingTransactions.set(id, transaction)
  return transaction
}

function buildBillingPortal(state, region, userId) {
  const entitlement = getEntitlements(state, userId)
  const transactions = Array.from(state.billingTransactions.values())
    .filter((transaction) => transaction.userId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

  return {
    userId,
    region,
    provider: storeProfiles[region].billingProvider,
    entitlement,
    products: buildBillingCatalog(region).products,
    transactions: transactions.slice(0, 20),
    actions: [
      { id: 'restore_purchase', endpoint: '/api/billing/restore' },
      { id: 'delete_account', endpoint: '/api/auth/account/delete' },
      { id: 'support', href: storeProfiles[region].supportPath },
      { id: 'billing_policy', href: storeProfiles[region].billingPolicyPath }
    ]
  }
}

function upsertUserSession(state, region, provider, credential = {}) {
  const externalId = getCredentialKey(provider, credential)
  const userId = `${region}_${provider}_${externalId}`
  const existing = state.users.get(userId)
  const session = {
    status: 'authenticated',
    userId,
    displayName: getDisplayName(region, provider, credential),
    tier: existing?.tier ?? 'free',
    authRegion: region,
    provider,
    linkedProviders: Array.from(new Set([...(existing?.linkedProviders ?? []), provider])),
    updatedAt: new Date().toISOString()
  }
  state.users.set(userId, session)

  if (!state.progress.has(userId)) {
    state.progress.set(userId, getDefaultProgress(userId))
  }

  if (!state.entitlements.has(userId)) {
    state.entitlements.set(userId, {
      userId,
      tier: session.tier,
      source: 'account',
      unlockedUntil: null,
      updatedAt: session.updatedAt
    })
  }

  return session
}

function getCredentialKey(provider, credential) {
  const raw = credential.email || credential.phone || credential.openId || credential.idToken || provider
  return String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'user'
}

function getDisplayName(region, provider, credential) {
  if (credential.email) return String(credential.email).split('@')[0]
  if (credential.phone) return region === 'overseas'
    ? `Phone user ${String(credential.phone).slice(-4)}`
    : `手机用户${String(credential.phone).slice(-4)}`

  const domesticNames = {
    wechat: '微信用户',
    'phone-otp': '手机号用户',
    'email-password': '邮箱用户'
  }
  const overseasNames = {
    wechat: 'WeChat user',
    facebook: 'Facebook user',
    google: 'Google user',
    'phone-otp': 'Phone user',
    'email-password': 'Email user'
  }

  return (region === 'overseas' ? overseasNames : domesticNames)[provider] ?? 'User'
}

function issueToken(state, userId) {
  const token = `dev_${crypto.randomUUID()}`
  state.tokens.set(token, userId)
  return token
}

function getAuthorizedUserId(req, state) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return state.tokens.get(auth.slice('Bearer '.length)) ?? null
}

function sanitizePhone(phone) {
  return String(phone ?? '').replace(/[^\d+]/g, '')
}

function normalizeTier(tier) {
  return ['team', 'pro', 'free'].includes(tier) ? tier : 'free'
}

function hashSecret(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex')
}

function getDefaultProgress(userId) {
  return {
    userId,
    courseProgress: {},
    questionBank: {
      answered: 0,
      correct: 0,
      wrong: 0
    },
    updatedAt: new Date().toISOString()
  }
}

function getProgress(state, userId) {
  if (!state.progress.has(userId)) {
    state.progress.set(userId, getDefaultProgress(userId))
  }
  return state.progress.get(userId)
}

function getQuestionBanks(state, userId) {
  if (!state.questionBanks.has(userId)) {
    state.questionBanks.set(userId, [])
  }
  return state.questionBanks.get(userId)
}

function getEntitlements(state, userId) {
  if (!state.entitlements.has(userId)) {
    state.entitlements.set(userId, {
      userId,
      tier: 'free',
      source: 'default',
      unlockedUntil: null,
      updatedAt: new Date().toISOString()
    })
  }
  return state.entitlements.get(userId)
}

function activateEntitlement(state, userId, tier, source, metadata = {}) {
  const entitlement = {
    userId,
    tier: normalizeTier(tier),
    source,
    unlockedUntil: null,
    metadata,
    updatedAt: new Date().toISOString()
  }
  state.entitlements.set(userId, entitlement)

  const session = state.users.get(userId)
  if (session) {
    session.tier = entitlement.tier
    session.updatedAt = entitlement.updatedAt
  }

  return entitlement
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const region = normalizeRegion(process.env.AUTH_REGION)
  const port = Number(process.env.AUTH_SERVER_PORT || getDefaultPort(region))
  const server = createAppBackendServer({ region, port })

  server.listen(port, () => {
    console.log(`[electric-master-backend] ${region} listening on http://127.0.0.1:${port}`)
  })
}
