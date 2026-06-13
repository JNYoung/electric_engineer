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
    privacyPolicyPath: '/legal/privacy-cn',
    termsPath: '/legal/terms-cn',
    accountDeletionSlaDays: 15,
    requiredDisclosures: ['privacy-policy', 'sdk-list', 'permission-list', 'account-deletion']
  },
  overseas: {
    market: 'us',
    dataRegion: 'US',
    privacyPolicyPath: '/legal/privacy-us',
    termsPath: '/legal/terms-us',
    accountDeletionSlaDays: 30,
    requiredDisclosures: ['privacy-policy', 'data-safety', 'account-deletion']
  }
}

function createInitialState() {
  return {
    users: new Map(),
    tokens: new Map(),
    progress: new Map(),
    questionBanks: new Map(),
    entitlements: new Map(),
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
        dataCategories: ['account', 'course_progress', 'question_bank', 'purchase_status'],
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

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const region = normalizeRegion(process.env.AUTH_REGION)
  const port = Number(process.env.AUTH_SERVER_PORT || getDefaultPort(region))
  const server = createAppBackendServer({ region, port })

  server.listen(port, () => {
    console.log(`[electric-master-backend] ${region} listening on http://127.0.0.1:${port}`)
  })
}
