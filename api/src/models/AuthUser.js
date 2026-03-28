import mongoose from 'mongoose'

const authUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
)

const authSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true, expires: 0 },
    lastSeenAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
)

const getAuthConnection = () => {
  const databaseName = process.env.AUTH_DB_NAME || 'planner-auth'
  return mongoose.connection.useDb(databaseName)
}

export const getAuthUserModel = () => {
  const connection = getAuthConnection()

  if (connection.models.AuthUser) {
    return connection.models.AuthUser
  }

  return connection.model(
    'AuthUser',
    authUserSchema,
    process.env.AUTH_USERS_COLLECTION_NAME || 'users',
  )
}

export const getAuthSessionModel = () => {
  const connection = getAuthConnection()

  if (connection.models.AuthSession) {
    return connection.models.AuthSession
  }

  return connection.model(
    'AuthSession',
    authSessionSchema,
    process.env.AUTH_SESSIONS_COLLECTION_NAME || 'sessions',
  )
}
