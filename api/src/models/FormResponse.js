import mongoose from 'mongoose'

const formResponseSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    message: { type: String, default: '' },
    source: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    strict: false,
  },
)

const DEFAULT_COLLECTION_NAME = process.env.RESPONSES_COLLECTION_NAME || 'responses'
const DEFAULT_MODEL_NAME = 'FormResponse'

export const getFormResponseModel = () => {
  const databaseName = process.env.RESPONSES_DB_NAME
  const connection = databaseName ? mongoose.connection.useDb(databaseName) : mongoose.connection
  const existingModel = connection.models[DEFAULT_MODEL_NAME]

  if (existingModel) {
    return existingModel
  }

  return connection.model(DEFAULT_MODEL_NAME, formResponseSchema, DEFAULT_COLLECTION_NAME)
}
