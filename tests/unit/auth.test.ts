import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildInternalTestSession,
  buildProviderSession,
  getAuthProviders,
  getDefaultAuthServerPort,
  linkProviderToSession,
  requestInternalTestUnlock,
  requestAuthLink,
  requestAuthOtp,
  requestAuthSignIn
} from '../../src/core/auth'
import type { RuntimeAuthConfig } from '../../src/core/auth'

const overseasConfig: RuntimeAuthConfig = {
  region: 'overseas',
  apiBaseUrl: 'http://auth.test',
  serverPort: 4318,
  appDistribution: 'production',
  internalTestUnlock: false,
  providers: getAuthProviders('overseas'),
  signInEndpoint: 'http://auth.test/api/auth/sign-in',
  linkEndpoint: 'http://auth.test/api/auth/link',
  otpEndpoint: 'http://auth.test/api/auth/otp/send',
  profileEndpoint: 'http://auth.test/api/auth/profile',
  internalUnlockEndpoint: 'http://auth.test/api/entitlements/test-unlock'
}

describe('auth flavor matrix', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes domestic login providers and server port', () => {
    expect(getDefaultAuthServerPort('domestic')).toBe(4317)
    expect(getAuthProviders('domestic').map((provider) => provider.id)).toEqual([
      'wechat',
      'phone-otp',
      'email-password'
    ])
  })

  it('exposes overseas login providers and server port', () => {
    expect(getDefaultAuthServerPort('overseas')).toBe(4318)
    expect(getAuthProviders('overseas').map((provider) => provider.id)).toEqual([
      'facebook',
      'google',
      'phone-otp',
      'email-password'
    ])
  })

  it('builds and links provider sessions', () => {
    const google = getAuthProviders('overseas').find((provider) => provider.id === 'google')
    expect(google).toBeDefined()

    const session = buildProviderSession(google!, 'overseas')
    expect(session.authRegion).toBe('overseas')
    expect(session.provider).toBe('google')
    expect(session.linkedProviders).toEqual(['google'])

    const linked = linkProviderToSession(session, 'phone-otp')
    expect(linked.linkedProviders).toEqual(['google', 'phone-otp'])
  })

  it('signs in through the configured auth endpoint', async () => {
    const google = getAuthProviders('overseas').find((provider) => provider.id === 'google')!
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        session: {
          status: 'authenticated',
          userId: 'server-google-user',
          displayName: 'Google服务端账号',
          tier: 'free',
          authRegion: 'overseas',
          provider: 'google',
          linkedProviders: ['google']
        },
        token: 'server-token'
      })
    } as Response)

    const session = await requestAuthSignIn(overseasConfig, google, { email: 'qa@example.com' })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://auth.test/api/auth/sign-in',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          region: 'overseas',
          provider: 'google',
          credential: { email: 'qa@example.com' }
        })
      })
    )
    expect(session.userId).toBe('server-google-user')
    expect(session.linkedProviders).toEqual(['google'])
  })

  it('links providers and sends otp through auth endpoints', async () => {
    const google = getAuthProviders('overseas').find((provider) => provider.id === 'google')!
    const phone = getAuthProviders('overseas').find((provider) => provider.id === 'phone-otp')!
    const session = buildProviderSession(google, 'overseas')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          linkedProviders: ['google', 'phone-otp']
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          devCode: '123456'
        })
      } as Response)

    const linked = await requestAuthLink(overseasConfig, session, phone, { phone: '13800138000', otp: '123456' })
    const otp = await requestAuthOtp(overseasConfig, '13800138000')

    expect(linked.linkedProviders).toEqual(['google', 'phone-otp'])
    expect(otp).toEqual({ ok: true, devCode: '123456' })
  })

  it('builds and requests internal test unlock sessions only for internal builds', async () => {
    const internalConfig: RuntimeAuthConfig = {
      ...overseasConfig,
      appDistribution: 'internal',
      internalTestUnlock: true
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        userId: 'qa-user',
        tier: 'team'
      })
    } as Response)

    const fallback = buildInternalTestSession('overseas')
    const unlocked = await requestInternalTestUnlock(internalConfig, fallback)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://auth.test/api/entitlements/test-unlock',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          region: 'overseas',
          userId: fallback.userId
        })
      })
    )
    expect(unlocked.userId).toBe('qa-user')
    expect(unlocked.tier).toBe('team')
    expect(unlocked.displayName).toBe('内测权益账号')
  })

  it('rejects internal test unlock when the build is production', async () => {
    await expect(requestInternalTestUnlock(overseasConfig)).rejects.toThrow('internal_test_unlock_disabled')
  })
})
