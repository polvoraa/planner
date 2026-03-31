import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { getAuthSessionModel, getAuthUserModel } from '../models/AuthUser.js'

const SESSION_COOKIE_NAME = 'planner_session'
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7
const scryptAsync = promisify(crypto.scrypt)

const getAuthSecret = () => {
  const secret = process.env.AUTH_SECRET

  if (!secret) {
    throw new Error('AUTH_SECRET precisa estar configurado.')
  }

  return secret
}

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url')
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8')

const hashToken = (token) =>
  crypto.createHmac('sha256', getAuthSecret()).update(token).digest('hex')

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
const getBearerToken = (request) => {
  const authorization = String(request.headers.authorization || '').trim()

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return authorization.slice(7).trim()
}

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left))
  const rightBuffer = Buffer.from(String(right))

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

const createPasswordHash = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scryptAsync(password, salt, 64)
  return `${salt}:${Buffer.from(derivedKey).toString('hex')}`
}

const verifyPasswordHash = async (password, passwordHash) => {
  const [salt = '', storedHash = ''] = String(passwordHash).split(':')

  if (!salt || !storedHash) {
    return false
  }

  const derivedKey = await scryptAsync(password, salt, 64)
  return safeCompare(Buffer.from(derivedKey).toString('hex'), storedHash)
}

const isProduction = process.env.NODE_ENV === 'production'
const sameSitePolicy = isProduction ? 'None' : 'Lax'

const serializeSessionCookie = (token) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=${base64UrlEncode(token)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSitePolicy}`,
    `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`,
  ]

  if (isProduction) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

export const clearSessionCookie = () =>
  `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=${sameSitePolicy}; Max-Age=0${isProduction ? '; Secure' : ''}`

export const createSessionForUser = async (userId) => {
  const AuthSession = getAuthSessionModel()
  const token = crypto.randomBytes(48).toString('hex')

  await AuthSession.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    lastSeenAt: new Date(),
  })

  return serializeSessionCookie(token)
}

export const createApiTokenForUser = async (userId) => {
  const AuthSession = getAuthSessionModel()
  const token = crypto.randomBytes(48).toString('hex')

  await AuthSession.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    lastSeenAt: new Date(),
  })

  return token
}

export const authenticateUser = async ({ username, password }) => {
  const AuthUser = getAuthUserModel()
  const user = await AuthUser.findOne({ username: String(username || '').trim() })

  if (!user) {
    return null
  }

  const isValid = await verifyPasswordHash(password, user.passwordHash)

  if (!isValid) {
    return null
  }

  user.lastLoginAt = new Date()
  await user.save()

  return user
}

export const readSession = async (request) => {
  const AuthSession = getAuthSessionModel()
  const AuthUser = getAuthUserModel()
  const encodedToken = getSessionCookie(request)
  const bearerToken = getBearerToken(request)

  if (!encodedToken && !bearerToken) {
    return null
  }

  let token = ''

  if (bearerToken) {
    token = bearerToken
  } else {
    try {
      token = base64UrlDecode(encodedToken)
    } catch {
      return null
    }
  }

  const session = await AuthSession.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean()

  if (!session) {
    return null
  }

  const user = await AuthUser.findById(session.userId).lean()

  if (!user) {
    return null
  }

  await AuthSession.updateOne(
    { _id: session._id },
    {
      $set: { lastSeenAt: new Date() },
    },
  )

  return {
    userId: user._id.toString(),
    username: user.username,
    role: user.role,
  }
}

export const invalidateSession = async (request) => {
  const AuthSession = getAuthSessionModel()
  const encodedToken = getSessionCookie(request)
  const bearerToken = getBearerToken(request)

  if (!encodedToken && !bearerToken) {
    return
  }

  try {
    const token = bearerToken || base64UrlDecode(encodedToken)
    await AuthSession.deleteOne({ tokenHash: hashToken(token) })
  } catch {
    return
  }
}

export const requireAuth = async (request, response, next) => {
  try {
    const session = await readSession(request)

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

export const ensureSeedAdmin = async () => {
  const AuthUser = getAuthUserModel()
  const seedUsers = [
    {
      username: String(process.env.AUTH_SEED_USERNAME || '').trim(),
      password: String(process.env.AUTH_SEED_PASSWORD || ''),
      role: 'admin',
    },
    {
      username: String(process.env.AUTH_LULU_USERNAME || '').trim(),
      password: String(process.env.AUTH_LULU_PASSWORD || ''),
      role: 'admin',
    },
  ].filter((user) => user.username && user.password)

  for (const seedUser of seedUsers) {
    const existingUser = await AuthUser.findOne({ username: seedUser.username })
    const passwordHash = await createPasswordHash(seedUser.password)

    if (!existingUser) {
      await AuthUser.create({
        username: seedUser.username,
        passwordHash,
        role: seedUser.role,
      })
      continue
    }

    existingUser.passwordHash = passwordHash
    existingUser.role = seedUser.role
    await existingUser.save()
  }
}
