import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestBillingCheckout, requestBillingPortal } from '../../src/core/billing'
import { buildProviderSession, getAuthProviders } from '../../src/core/auth'
import type { RuntimeAuthConfig } from '../../src/core/auth'

const config: RuntimeAuthConfig = {
  region: 'overseas',
  apiBaseUrl: 'http://billing.test',
  serverPort: 4318,
  appDistribution: 'production',
  internalTestUnlock: false,
  providers: getAuthProviders('overseas'),
  signInEndpoint: 'http://billing.test/api/auth/sign-in',
  linkEndpoint: 'http://billing.test/api/auth/link',
  otpEndpoint: 'http://billing.test/api/auth/otp/send',
  profileEndpoint: 'http://billing.test/api/auth/profile',
  internalUnlockEndpoint: 'http://billing.test/api/entitlements/test-unlock'
}

describe('billing client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates checkout sessions through the configured backend', async () => {
    const google = getAuthProviders('overseas').find((provider) => provider.id === 'google')!
    const session = buildProviderSession(google, 'overseas')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        clientAction: 'start_google_play_billing',
        transaction: {
          id: 'txn_1',
          userId: session.userId,
          tier: 'pro',
          sku: 'sku_dg_pro_month',
          status: 'pending'
        }
      })
    } as Response)

    const checkout = await requestBillingCheckout(config, session, 'pro')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://billing.test/api/billing/checkout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          region: 'overseas',
          userId: session.userId,
          tier: 'pro',
          sku: 'sku_dg_pro_month'
        })
      })
    )
    expect(checkout.ok).toBe(true)
    expect(checkout.clientAction).toBe('start_google_play_billing')
    expect(checkout.transaction?.status).toBe('pending')
  })

  it('skips checkout for the free plan', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const checkout = await requestBillingCheckout(config, buildProviderSession(config.providers[0], 'overseas'), 'free')

    expect(checkout).toEqual({ ok: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('opens the backend billing portal and returns controlled failures', async () => {
    const session = buildProviderSession(config.providers[0], 'overseas')
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          portalUrl: 'https://billing.test/portal'
        })
      } as Response)
      .mockRejectedValueOnce(new Error('network_down'))

    const portal = await requestBillingPortal(config, session)
    const unavailable = await requestBillingCheckout(config, session, 'team')

    expect(portal.ok).toBe(true)
    expect(portal.portalUrl).toBe('https://billing.test/portal')
    expect(unavailable.ok).toBe(false)
    expect(unavailable.error).toBe('network_down')
  })
})
