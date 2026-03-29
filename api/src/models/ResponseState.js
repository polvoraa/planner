import mongoose from 'mongoose'

const responseStateSchema = new mongoose.Schema(
  {
    responseKey: { type: String, required: true, unique: true, index: true },
    source: { type: String, default: '', index: true },
    externalId: { type: String, default: '' },
    readAt: { type: Date, default: null },
    lastWhatsAppAttemptAt: { type: Date, default: null },
    whatsappNotifiedAt: { type: Date, default: null },
    lastWhatsAppError: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
)

const getResponseStateConnection = () => {
  const databaseName = process.env.AUTH_DB_NAME || 'planner-auth'
  return mongoose.connection.useDb(databaseName)
}

export const getResponseStateModel = () => {
  const connection = getResponseStateConnection()

  if (connection.models.ResponseState) {
    return connection.models.ResponseState
  }

  return connection.model(
    'ResponseState',
    responseStateSchema,
    process.env.RESPONSE_STATE_COLLECTION_NAME || 'response_states',
  )
}
