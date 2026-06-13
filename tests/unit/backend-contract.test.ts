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

    expect(profile.session.userId).toBe(signIn.session.userId)
    expect(progress.questionBank.answered).toBe(3)
    expect(bank.id).toMatch(/^qb_/)
    expect(bank.trackId).toBe('high-school')
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
})
