import http from 'node:http'

const region = process.env.AUTH_REGION === 'overseas' ? 'overseas' : 'domestic'
const port = Number(process.env.AUTH_SERVER_PORT || (region === 'overseas' ? 4318 : 4317))

const providers = {
  domestic: ['wechat', 'phone-otp', 'email-password'],
  overseas: ['facebook', 'google', 'phone-otp', 'email-password']
}

function json(res, status, payload) {
  const body = JSON.stringify(payload, null, 2)
  res.writeHead(status, {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
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

function providerLabel(provider) {
  return {
    wechat: '微信',
    facebook: 'Facebook',
    google: 'Google',
    'phone-otp': '手机号',
    'email-password': '邮箱'
  }[provider] ?? provider
}

function buildSession(requestedRegion, provider) {
  return {
    status: 'authenticated',
    userId: `${requestedRegion}-${provider}-dev-user`,
    displayName: `${providerLabel(provider)}开发账号`,
    tier: 'free',
    authRegion: requestedRegion,
    provider,
    linkedProviders: [provider]
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

  if (req.method === 'OPTIONS') {
    json(res, 204, {})
    return
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    json(res, 200, { ok: true, region, port })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/auth/config') {
    const requestedRegion = url.searchParams.get('region') === 'overseas' ? 'overseas' : region
    json(res, 200, {
      region: requestedRegion,
      providers: providers[requestedRegion],
      endpoints: {
        signIn: '/api/auth/sign-in',
        link: '/api/auth/link',
        otp: '/api/auth/otp/send',
        profile: '/api/auth/profile'
      }
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/otp/send') {
    const body = await readBody(req)
    json(res, 200, {
      ok: true,
      region: body.region ?? region,
      phone: body.phone,
      devCode: '123456'
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/sign-in') {
    const body = await readBody(req)
    const requestedRegion = body.region === 'overseas' ? 'overseas' : region
    const provider = providers[requestedRegion].includes(body.provider) ? body.provider : providers[requestedRegion][0]
    json(res, 200, {
      session: buildSession(requestedRegion, provider),
      token: `dev-token-${requestedRegion}-${provider}`
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/link') {
    const body = await readBody(req)
    const requestedRegion = body.region === 'overseas' ? 'overseas' : region
    const provider = providers[requestedRegion].includes(body.provider) ? body.provider : providers[requestedRegion][0]
    json(res, 200, {
      ok: true,
      linkedProvider: provider,
      linkedProviders: Array.from(new Set([...(body.linkedProviders ?? []), provider]))
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/sign-out') {
    json(res, 200, { ok: true })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/auth/profile') {
    json(res, 200, { session: buildSession(region, providers[region][0]) })
    return
  }

  json(res, 404, { error: 'not_found' })
})

server.listen(port, () => {
  console.log(`[auth-dev-server] ${region} auth server listening on http://127.0.0.1:${port}`)
})
