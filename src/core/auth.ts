import type { AuthSession, SubscriptionTier } from './commercial'

export type AuthRegion = 'domestic' | 'overseas'
export type AuthProviderId =
  | 'wechat'
  | 'facebook'
  | 'google'
  | 'phone-otp'
  | 'email-password'

export interface AuthProviderConfig {
  id: AuthProviderId
  label: string
  description: string
  credentialMode: 'oauth' | 'phone-otp' | 'email-password'
  bindable: boolean
}

export interface RuntimeAuthConfig {
  region: AuthRegion
  apiBaseUrl: string
  serverPort: number
  appDistribution: 'internal' | 'production'
  internalTestUnlock: boolean
  providers: AuthProviderConfig[]
  signInEndpoint: string
  linkEndpoint: string
  otpEndpoint: string
  profileEndpoint: string
  internalUnlockEndpoint: string
}

export interface AuthCredentialDraft {
  phone?: string
  otp?: string
  email?: string
  password?: string
}

export interface AuthOtpResponse {
  ok: boolean
  devCode?: string
}

interface AuthSignInResponse {
  session?: AuthSession
  token?: string
}

interface AuthLinkResponse {
  ok?: boolean
  linkedProvider?: AuthProviderId
  linkedProviders?: AuthProviderId[]
}

interface InternalUnlockResponse {
  tier?: SubscriptionTier
  userId?: string
}

declare const __AUTH_REGION__: string | undefined
declare const __AUTH_API_BASE_URL__: string | undefined
declare const __INTERNAL_TEST_UNLOCK__: boolean | undefined
declare const __APP_DISTRIBUTION__: string | undefined

const domesticProviders: AuthProviderConfig[] = [
  {
    id: 'wechat',
    label: '微信登录',
    description: '使用微信账号快速登录',
    credentialMode: 'oauth',
    bindable: true
  },
  {
    id: 'phone-otp',
    label: '手机号+验证码',
    description: '使用短信验证码登录或绑定',
    credentialMode: 'phone-otp',
    bindable: true
  },
  {
    id: 'email-password',
    label: '邮箱+密码',
    description: '使用邮箱和密码登录',
    credentialMode: 'email-password',
    bindable: true
  }
]

const overseasProviders: AuthProviderConfig[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    description: 'Use your Facebook account',
    credentialMode: 'oauth',
    bindable: true
  },
  {
    id: 'google',
    label: 'Google',
    description: 'Use your Google account',
    credentialMode: 'oauth',
    bindable: true
  },
  {
    id: 'phone-otp',
    label: '手机号+验证码',
    description: 'Sign in or link with an SMS code',
    credentialMode: 'phone-otp',
    bindable: true
  },
  {
    id: 'email-password',
    label: '邮箱登录',
    description: 'Sign in with email credentials',
    credentialMode: 'email-password',
    bindable: true
  }
]

export function normalizeAuthRegion(value?: string): AuthRegion {
  return value === 'overseas' ? 'overseas' : 'domestic'
}

export function getAuthProviders(region: AuthRegion) {
  return region === 'overseas' ? overseasProviders : domesticProviders
}

export function getDefaultAuthServerPort(region: AuthRegion) {
  return region === 'overseas' ? 4318 : 4317
}

export function getDefaultAuthApiBaseUrl(region: AuthRegion) {
  return `http://127.0.0.1:${getDefaultAuthServerPort(region)}`
}

export function getRuntimeAuthConfig(): RuntimeAuthConfig {
  const region = normalizeAuthRegion(typeof __AUTH_REGION__ === 'undefined' ? undefined : __AUTH_REGION__)
  const apiBaseUrl = typeof __AUTH_API_BASE_URL__ === 'undefined' || !__AUTH_API_BASE_URL__
    ? getDefaultAuthApiBaseUrl(region)
    : __AUTH_API_BASE_URL__
  const internalTestUnlock = typeof __INTERNAL_TEST_UNLOCK__ !== 'undefined' && __INTERNAL_TEST_UNLOCK__
  const appDistribution = typeof __APP_DISTRIBUTION__ !== 'undefined' && __APP_DISTRIBUTION__ === 'internal'
    ? 'internal'
    : 'production'

  return {
    region,
    apiBaseUrl,
    serverPort: getDefaultAuthServerPort(region),
    appDistribution,
    internalTestUnlock,
    providers: getAuthProviders(region),
    signInEndpoint: `${apiBaseUrl}/api/auth/sign-in`,
    linkEndpoint: `${apiBaseUrl}/api/auth/link`,
    otpEndpoint: `${apiBaseUrl}/api/auth/otp/send`,
    profileEndpoint: `${apiBaseUrl}/api/auth/profile`,
    internalUnlockEndpoint: `${apiBaseUrl}/api/entitlements/test-unlock`
  }
}

export function buildProviderSession(
  provider: AuthProviderConfig,
  region: AuthRegion,
  tier: SubscriptionTier = 'free'
): AuthSession {
  return {
    status: 'authenticated',
    userId: `${region}-${provider.id}-local-user`,
    displayName: getProviderDisplayName(region, provider.id),
    tier,
    authRegion: region,
    provider: provider.id,
    linkedProviders: [provider.id]
  }
}

function getProviderDisplayName(region: AuthRegion, providerId: AuthProviderId) {
  const domesticNames: Partial<Record<AuthProviderId, string>> = {
    wechat: '微信用户',
    'phone-otp': '手机号用户',
    'email-password': '邮箱用户'
  }
  const overseasNames: Partial<Record<AuthProviderId, string>> = {
    wechat: 'WeChat user',
    facebook: 'Facebook user',
    google: 'Google user',
    'phone-otp': 'Phone user',
    'email-password': 'Email user'
  }

  return (region === 'overseas' ? overseasNames : domesticNames)[providerId] ?? 'User'
}

export function linkProviderToSession(session: AuthSession, providerId: AuthProviderId): AuthSession {
  const linkedProviders = session.linkedProviders ?? []

  return {
    ...session,
    linkedProviders: linkedProviders.includes(providerId)
      ? linkedProviders
      : [...linkedProviders, providerId]
  }
}

export function buildInternalTestSession(region: AuthRegion, userId = `${region}-internal-test-user`): AuthSession {
  return {
    status: 'authenticated',
    userId,
    displayName: '内测权益账号',
    tier: 'team',
    authRegion: region,
    linkedProviders: []
  }
}

export async function requestInternalTestUnlock(
  config: RuntimeAuthConfig,
  session?: AuthSession
): Promise<AuthSession> {
  const fallback = buildInternalTestSession(config.region, session?.userId)

  if (!config.internalTestUnlock) {
    throw new Error('internal_test_unlock_disabled')
  }

  try {
    const response = await postJson<InternalUnlockResponse>(config.internalUnlockEndpoint, {
      region: config.region,
      userId: session?.userId ?? fallback.userId
    })

    return {
      ...fallback,
      userId: response.userId ?? fallback.userId,
      tier: response.tier ?? fallback.tier
    }
  } catch {
    return fallback
  }
}

export async function requestAuthOtp(config: RuntimeAuthConfig, phone = ''): Promise<AuthOtpResponse> {
  try {
    return await postJson<AuthOtpResponse>(config.otpEndpoint, {
      region: config.region,
      phone
    })
  } catch {
    return { ok: false }
  }
}

export async function requestAuthSignIn(
  config: RuntimeAuthConfig,
  provider: AuthProviderConfig,
  credential: AuthCredentialDraft
): Promise<AuthSession> {
  const fallback = buildProviderSession(provider, config.region, 'free')

  try {
    const response = await postJson<AuthSignInResponse>(config.signInEndpoint, {
      region: config.region,
      provider: provider.id,
      credential
    })

    return normalizeServerSession(response.session, fallback)
  } catch {
    return fallback
  }
}

export async function requestAuthLink(
  config: RuntimeAuthConfig,
  session: AuthSession,
  provider: AuthProviderConfig,
  credential: AuthCredentialDraft
): Promise<AuthSession> {
  const fallback = linkProviderToSession(session, provider.id)

  try {
    const response = await postJson<AuthLinkResponse>(config.linkEndpoint, {
      region: config.region,
      provider: provider.id,
      credential,
      linkedProviders: session.linkedProviders ?? []
    })
    const linkedProviders = response.linkedProviders?.filter(isAuthProviderId)

    return {
      ...session,
      linkedProviders: linkedProviders && linkedProviders.length > 0
        ? linkedProviders
        : fallback.linkedProviders
    }
  } catch {
    return fallback
  }
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  if (typeof fetch === 'undefined') {
    throw new Error('fetch_unavailable')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`auth_request_failed:${response.status}`)
  }

  return await response.json() as T
}

function normalizeServerSession(session: AuthSession | undefined, fallback: AuthSession): AuthSession {
  if (!session || session.status !== 'authenticated') {
    return fallback
  }

  return {
    ...fallback,
    ...session,
    linkedProviders: session.linkedProviders?.filter(isAuthProviderId) ?? fallback.linkedProviders
  }
}

function isAuthProviderId(value: unknown): value is AuthProviderId {
  return value === 'wechat' ||
    value === 'facebook' ||
    value === 'google' ||
    value === 'phone-otp' ||
    value === 'email-password'
}
