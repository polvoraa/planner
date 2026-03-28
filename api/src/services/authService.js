import crypto from 'node:crypto'

const SESSION_COOKIE_NAME = 'planner_session'
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12

const getAuthConfig = () => {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  const secret = process.env.AUTH_SECRET

  if (!username || !password || !secret) {
    throw new Error('ADMIN_USERNAME, ADMIN_PASSWORD e AUTH_SECRET precisam estar configurados.')
  }

  return { username, password, secret }
}

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url')
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8')

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left))
  const rightBuffer = Buffer.from(String(right))

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

const sign = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('base64url')

const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((accumulator, part) => {
      const [key, ...rest] = part.split('=')

      if (!key) {
        return accumulator
      }

      accumulator[key] = rest.join('=')
      return accumulator
    }, {})

const getSessionCookie = (request) => parseCookies(request.headers.cookie)[SESSION_COOKIE_NAME] || ''

const buildCookieValue = (username, secret) => {
  const payload = {
    username,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

const parseSessionCookie = (cookieValue, secret) => {
  const [encodedPayload = '', signature = ''] = String(cookieValue).split('.')

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = sign(encodedPayload, secret)

  if (!safeCompare(signature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload))

    if (!payload?.username || !payload?.expiresAt || payload.expiresAt < Date.now()) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

const isProduction = process.env.NODE_ENV === 'production'

const serializeSessionCookie = (username) => {
  const { secret } = getAuthConfig()
  const value = buildCookieValue(username, secret)
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
  ]

  if (isProduction) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export const clearSessionCookie = () =>
  `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`

export const authenticateUser = ({ username, password }) => {
  const auth = getAuthConfig()
  return safeCompare(username, auth.username) && safeCompare(password, auth.password)
}

export const createSessionCookie = (username) => serializeSessionCookie(username)

export const readSession = (request) => {
  const { secret } = getAuthConfig()
  const cookieValue = getSessionCookie(request)

  if (!cookieValue) {
    return null
  }

  return parseSessionCookie(cookieValue, secret)
}

export const requireAuth = (request, response, next) => {
  try {
    const session = readSession(request)

    if (!session) {
      response.status(401).json({ message: 'Autenticacao necessaria.' })
      return
    }

    request.auth = session
    next()
  } catch (error) {
    next(error)
  }
}
