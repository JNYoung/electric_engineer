import crypto from 'node:crypto'
import http from 'node:http'
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
    accountDeletionSlaDays: 15,
    requiredDisclosures: ['privacy-policy', 'sdk-list', 'permission-list', 'account-deletion']
  },
  overseas: {
    market: 'us',
    dataRegion: 'US',
    billingProvider: 'google_play',
    privacyPolicyPath: '/legal/privacy-us',
    termsPath: '/legal/terms-us',
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

function createInitialState() {
  return {
    users: new Map(),
    tokens: new Map(),
    progress: new Map(),
    questionBanks: new Map(),
    entitlements: new Map(),
    billingTransactions: new Map(),
    billingEvents: new Map(),
    deletionRequests: new Map()
  }
}

export function createAppBackendServer(options = {}) {
  const defaultRegion = normalizeRegion(options.region ?? process.env.AUTH_REGION)
  const defaultPort = Number(options.port ?? process.env.AUTH_SERVER_PORT ?? getDefaultPort(defaultRegion))
  const internalTestUnlock = String(options.internalTestUnlock ?? process.env.ENABLE_TEST_UNLOCK ?? '') === 'true'
  const state = options.state ?? createInitialState()

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    if (req.method === 'OPTIONS') {
      json(res, 204, {})
      return
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
        dataCategories: ['account', 'course_progress', 'question_bank', 'purchase_status', 'billing_event'],
        accountDeletion: {
          endpoint: '/api/auth/account/delete',
          slaDays: storeProfiles[region].accountDeletionSlaDays
        }
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/config') {
      const region = getRequestRegion(url, defaultRegion)
      json(res, 200, buildAuthConfig(region))
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
      const requestId = `del_${crypto.randomUUID()}`
      const request = {
        requestId,
        userId,
        region,
        status: 'queued',
        requestedAt: new Date().toISOString(),
        slaDays: storeProfiles[region].accountDeletionSlaDays
      }
      state.deletionRequests.set(requestId, request)
      json(res, 200, request)
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
      const entitlement = {
        userId,
        tier: 'team',
        source: 'internal_test_unlock',
        unlockedUntil: null,
        updatedAt: new Date().toISOString()
      }
      state.entitlements.set(userId, entitlement)
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
      const next = {
        ...current,
        ...body.progress,
        userId,
        updatedAt: new Date().toISOString()
      }
      state.progress.set(userId, next)
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
      bank.answers.push(answer)
      if (!answer.correct && answer.questionId) {
        bank.wrongQuestionIds = Array.from(new Set([...bank.wrongQuestionIds, answer.questionId]))
      }
      bank.updatedAt = new Date().toISOString()
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
    'access-control-allow-headers': 'content-type,authorization',
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
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
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
  })
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
      { id: 'sms', purpose: 'phone_otp', enabled: true }
    ]
  }

  return [
    { id: 'google_identity', purpose: 'social_login', enabled: true },
    { id: 'facebook_login', purpose: 'social_login', enabled: true },
    { id: 'admob', purpose: 'account_page_banner', enabled: true }
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
      { id: 'support', href: storeProfiles[region].termsPath }
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
    displayName: getDisplayName(provider, credential),
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

function getDisplayName(provider, credential) {
  if (credential.email) return String(credential.email).split('@')[0]
  if (credential.phone) return `user_${String(credential.phone).slice(-4)}`
  return {
    wechat: 'WeChat user',
    facebook: 'Facebook user',
    google: 'Google user',
    'phone-otp': 'Phone user',
    'email-password': 'Email user'
  }[provider] ?? 'User'
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
