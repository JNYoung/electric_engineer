import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

type TestServer = {
  close: () => Promise<void>
  url: string
}

async function startBackend(options: Record<string, unknown> = {}): Promise<TestServer> {
  const { createAppBackendServer } = await import('../../server/auth-dev-server.mjs')
  const server = createAppBackendServer(options)

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('test_backend_address_unavailable')
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    })
  }
}

async function postJson<T>(url: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  })

  return await response.json() as T
}

describe('app backend contract', () => {
  const servers: TestServer[] = []

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()))
  })

  it('exposes overseas app config and compliance manifest', async () => {
    const server = await startBackend({ region: 'overseas', internalTestUnlock: true })
    servers.push(server)

    const config = await fetch(`${server.url}/api/app/config?region=overseas`).then((response) => response.json())
    const manifest = await fetch(`${server.url}/api/compliance/manifest?region=overseas`).then((response) => response.json())

    expect(config.region).toBe('overseas')
    expect(config.auth.providers).toEqual(['facebook', 'google', 'phone-otp', 'email-password'])
    expect(config.features.accountDeletion).toBe(true)
    expect(config.features.internalTestUnlock).toBe(true)
    expect(manifest.store.market).toBe('us')
    expect(manifest.accountDeletion.endpoint).toBe('/api/auth/account/delete')
  })

  it('signs in, reads profile, syncs progress, and creates question banks', async () => {
    const server = await startBackend({ region: 'domestic' })
    servers.push(server)

    const signIn = await postJson<{ session: { userId: string }; token: string }>(
      `${server.url}/api/auth/sign-in`,
      {
        region: 'domestic',
        provider: 'phone-otp',
        credential: { phone: '13800138000', otp: '123456' }
      }
    )
    const profile = await fetch(`${server.url}/api/auth/profile`, {
      headers: { authorization: `Bearer ${signIn.token}` }
    }).then((response) => response.json())
    const progress = await postJson<{ questionBank: { answered: number } }>(
      `${server.url}/api/progress/sync`,
      { progress: { questionBank: { answered: 3, correct: 2, wrong: 1 } } },
      signIn.token
    )
    const bank = await postJson<{ id: string; trackId: string }>(
      `${server.url}/api/question-banks`,
      { title: '低压题库', trackId: 'high-school' },
      signIn.token
    )
    const wrongBank = await postJson<{ answers: unknown[]; wrongQuestionIds: string[] }>(
      `${server.url}/api/question-banks/${bank.id}/answer`,
      { questionId: 'hs-ohm-current', answerId: 'b', correct: false },
      signIn.token
    )
    const correctedBank = await postJson<{ answers: unknown[]; wrongQuestionIds: string[] }>(
      `${server.url}/api/question-banks/${bank.id}/answer`,
      { questionId: 'hs-ohm-current', answerId: 'a', correct: true },
      signIn.token
    )

    expect(profile.session.userId).toBe(signIn.session.userId)
    expect(progress.questionBank.answered).toBe(3)
    expect(bank.id).toMatch(/^qb_/)
    expect(bank.trackId).toBe('high-school')
    expect(wrongBank.wrongQuestionIds).toEqual(['hs-ohm-current'])
    expect(correctedBank.answers).toHaveLength(1)
    expect(correctedBank.wrongQuestionIds).toEqual([])
  })

  it('queues account deletion and hides internal unlock unless enabled', async () => {
    const server = await startBackend({ region: 'overseas' })
    servers.push(server)

    const deletion = await postJson<{ status: string; slaDays: number }>(
      `${server.url}/api/auth/account/delete`,
      { userId: 'u1', region: 'overseas' }
    )
    const unlock = await fetch(`${server.url}/api/entitlements/test-unlock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'u1' })
    }).then((response) => response.json())

    expect(deletion.status).toBe('queued')
    expect(deletion.slaDays).toBe(30)
    expect(unlock.error).toBe('internal_test_unlock_disabled')
  })

  it('creates billing checkout, restores purchases, and exposes billing portal', async () => {
    const server = await startBackend({ region: 'overseas' })
    servers.push(server)

    const signIn = await postJson<{ session: { userId: string }; token: string }>(
      `${server.url}/api/auth/sign-in`,
      {
        region: 'overseas',
        provider: 'google',
        credential: { idToken: 'google-user-1' }
      }
    )
    const products = await fetch(`${server.url}/api/billing/products?region=overseas`).then((response) => response.json())
    const checkout = await postJson<{
      transaction: { status: string; provider: string; sku: string; tier: string }
      clientAction: string
    }>(
      `${server.url}/api/billing/checkout`,
      { region: 'overseas', tier: 'pro' },
      signIn.token
    )
    const restore = await postJson<{
      entitlement: { tier: string; source: string }
      restoredTransactions: Array<{ status: string; purchaseToken: string }>
    }>(
      `${server.url}/api/billing/restore`,
      {
        region: 'overseas',
        purchases: [
          {
            sku: 'googleplay_dg_pro_month',
            purchaseToken: 'purchase-token-1',
            transactionId: 'gpa.1234'
          }
        ]
      },
      signIn.token
    )
    const portal = await fetch(`${server.url}/api/billing/portal?region=overseas`, {
      headers: { authorization: `Bearer ${signIn.token}` }
    }).then((response) => response.json())

    expect(products.provider).toBe('google_play')
    expect(products.products.map((product: { sku: string }) => product.sku)).toContain('googleplay_dg_pro_month')
    expect(checkout.transaction.status).toBe('pending')
    expect(checkout.transaction.provider).toBe('google_play')
    expect(checkout.clientAction).toBe('start_google_play_billing')
    expect(restore.entitlement.tier).toBe('pro')
    expect(restore.entitlement.source).toBe('purchase_restore')
    expect(restore.restoredTransactions[0].status).toBe('paid')
    expect(restore.restoredTransactions[0].purchaseToken).not.toBe('purchase-token-1')
    expect(portal.entitlement.tier).toBe('pro')
    expect(portal.transactions[0].sku).toBe('googleplay_dg_pro_month')
  })

  it('applies billing webhook events idempotently', async () => {
    const server = await startBackend({ region: 'domestic' })
    servers.push(server)

    const paid = await postJson<{
      duplicate?: boolean
      entitlement: { tier: string; source: string }
    }>(
      `${server.url}/api/billing/webhook`,
      {
        eventId: 'evt-paid-1',
        region: 'domestic',
        userId: 'u-billing',
        sku: 'cn_dg_team_month',
        status: 'active'
      }
    )
    const duplicate = await postJson<{ duplicate?: boolean }>(
      `${server.url}/api/billing/webhook`,
      {
        eventId: 'evt-paid-1',
        region: 'domestic',
        userId: 'u-billing',
        sku: 'cn_dg_team_month',
        status: 'active'
      }
    )
    const revoked = await postJson<{ entitlement: { tier: string; source: string } }>(
      `${server.url}/api/billing/webhook`,
      {
        eventId: 'evt-revoke-1',
        region: 'domestic',
        userId: 'u-billing',
        sku: 'cn_dg_team_month',
        status: 'refunded'
      }
    )

    expect(paid.entitlement.tier).toBe('team')
    expect(paid.entitlement.source).toBe('billing_webhook')
    expect(duplicate.duplicate).toBe(true)
    expect(revoked.entitlement.tier).toBe('free')
  })

  it('persists backend state and protects admin review operations', async () => {
    const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electric-master-backend-'))
    const storagePath = path.join(storageDir, 'state.json')
    const adminToken = 'admin-secret'
    const firstServer = await startBackend({ region: 'overseas', storagePath, adminToken })
    servers.push(firstServer)

    const unauthorized = await fetch(`${firstServer.url}/api/admin/users`)
    const reviewAccount = await fetch(`${firstServer.url}/api/admin/review-accounts`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        region: 'overseas',
        provider: 'google',
        tier: 'team'
      })
    }).then((response) => response.json())
    const progress = await postJson<{ questionBank: { answered: number } }>(
      `${firstServer.url}/api/progress/sync`,
      { progress: { questionBank: { answered: 4, correct: 3, wrong: 1 } } },
      reviewAccount.token
    )

    expect(unauthorized.status).toBe(401)
    expect(reviewAccount.session.provider).toBe('google')
    expect(reviewAccount.entitlement.tier).toBe('team')
    expect(progress.questionBank.answered).toBe(4)
    expect(fs.existsSync(storagePath)).toBe(true)

    await firstServer.close()
    servers.splice(servers.indexOf(firstServer), 1)

    const secondServer = await startBackend({ region: 'overseas', storagePath, adminToken })
    servers.push(secondServer)
    const users = await fetch(`${secondServer.url}/api/admin/users?region=overseas`, {
      headers: { authorization: `Bearer ${adminToken}` }
    }).then((response) => response.json())
    const restoredProgress = await fetch(`${secondServer.url}/api/progress`, {
      headers: { authorization: `Bearer ${reviewAccount.token}` }
    }).then((response) => response.json())
    const entitlements = await fetch(`${secondServer.url}/api/entitlements`, {
      headers: { authorization: `Bearer ${reviewAccount.token}` }
    }).then((response) => response.json())

    expect(users.users.map((user: { userId: string }) => user.userId)).toContain(reviewAccount.session.userId)
    expect(restoredProgress.questionBank.answered).toBe(4)
    expect(entitlements.tier).toBe('team')

    fs.rmSync(storageDir, { recursive: true, force: true })
  })
})
