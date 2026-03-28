import mongoose from 'mongoose'

const formResponseSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    company: { type: String, default: '' },
    message: { type: String, default: '' },
    source: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    strict: false,
  },
)

const buildResponseSourceConfig = ({
  key,
  dbName,
  collectionName,
  fallbackSource,
}) => ({
  key,
  dbName,
  collectionName,
  fallbackSource,
})

export const getResponseSources = () => {
  const sources = []

  const primaryDbName = String(process.env.RESPONSES_DB_NAME || '').trim()
  const primaryCollectionName = String(process.env.RESPONSES_COLLECTION_NAME || 'responses').trim() || 'responses'
  const primaryFallbackSource = String(process.env.RESPONSES_FALLBACK_SOURCE || '').trim()

  sources.push(
    buildResponseSourceConfig({
      key: 'primary',
      dbName: primaryDbName,
      collectionName: primaryCollectionName,
      fallbackSource: primaryFallbackSource,
    }),
  )

  const secondaryDbName = String(process.env.RESPONSES_SECONDARY_DB_NAME || '').trim()
  const secondaryCollectionName = String(
    process.env.RESPONSES_SECONDARY_COLLECTION_NAME || 'responses',
  ).trim() || 'responses'
  const secondaryFallbackSource = String(
    process.env.RESPONSES_SECONDARY_FALLBACK_SOURCE || secondaryDbName,
  ).trim()

  if (secondaryDbName) {
    sources.push(
      buildResponseSourceConfig({
        key: 'secondary',
        dbName: secondaryDbName,
        collectionName: secondaryCollectionName,
        fallbackSource: secondaryFallbackSource,
      }),
    )
  }

  return sources
}

export const getFormResponseModel = ({ key, dbName, collectionName }) => {
  const connection = dbName ? mongoose.connection.useDb(dbName) : mongoose.connection
  const modelName = `FormResponse_${key}`
  const existingModel = connection.models[modelName]

  if (existingModel) {
    return existingModel
  }

  return connection.model(modelName, formResponseSchema, collectionName)
}
