import { COMMERCIAL_API_CONTRACT, getBillingPlan } from './commercial'
import type { AuthSession, SubscriptionTier } from './commercial'
import type { RuntimeAuthConfig } from './auth'

export interface BillingTransaction {
  id: string
  userId: string
  tier: SubscriptionTier
  sku: string | null
  status: 'pending' | 'paid' | 'restored' | 'expired' | 'refunded' | 'revoked' | 'canceled'
  provider?: string
}

export interface BillingCheckoutResult {
  ok: boolean
  clientAction?: string
  checkoutUrl?: string
  restoreEndpoint?: string
  transaction?: BillingTransaction
  error?: string
}

export interface BillingPortalResult {
  ok: boolean
  portalUrl?: string
  actions?: Array<{ id: string; endpoint: string }>
  error?: string
}

export async function requestBillingCheckout(
  config: RuntimeAuthConfig,
  session: AuthSession,
  tier: SubscriptionTier
): Promise<BillingCheckoutResult> {
  const plan = getBillingPlan(tier)

  if (!plan.checkoutSku || tier === 'free') {
    return { ok: true }
  }

  try {
    const response = await postJson<BillingCheckoutResult>(
      `${config.apiBaseUrl}${COMMERCIAL_API_CONTRACT.billing.checkoutEndpoint}`,
      {
        region: config.region,
        userId: session.userId ?? `${config.region}-anonymous`,
        tier,
        sku: plan.checkoutSku
      }
    )

    return {
      ...response,
      ok: true
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'billing_checkout_unavailable'
    }
  }
}

export async function requestBillingPortal(
  config: RuntimeAuthConfig,
  session: AuthSession
): Promise<BillingPortalResult> {
  try {
    const response = await postJson<BillingPortalResult>(
      `${config.apiBaseUrl}${COMMERCIAL_API_CONTRACT.billing.portalEndpoint}`,
      {
        region: config.region,
        userId: session.userId ?? `${config.region}-anonymous`
      }
    )

    return {
      ...response,
      ok: true
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'billing_portal_unavailable'
    }
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`)
  }

  return response.json() as Promise<T>
}
