import { getFormResponseModel } from '../models/FormResponse.js'

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildQuery = ({ source, search }) => {
  const query = {}

  if (source) {
    query.source = source
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i')
    query.$or = [
      { name: regex },
      { email: regex },
      { message: regex },
      { source: regex },
    ]
  }

  return query
}

const formatResponse = (response) => ({
  id: response._id.toString(),
  name: response.name || 'Sem nome',
  email: response.email || 'Sem email',
  message: response.message || '',
  source: response.source || 'desconhecido',
  metadata: response.metadata || {},
  createdAt: response.createdAt || null,
  updatedAt: response.updatedAt || null,
})

export const listResponses = async ({ source, search, limit }) => {
  const FormResponse = getFormResponseModel()
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200)
  const query = buildQuery({
    source: String(source || '').trim(),
    search: String(search || '').trim(),
  })

  const responses = await FormResponse.find(query).sort({ createdAt: -1 }).limit(normalizedLimit).lean()

  const items = responses.map(formatResponse)
  const summary = {
    total: items.length,
    bySource: items.reduce((accumulator, item) => {
      accumulator[item.source] = (accumulator[item.source] || 0) + 1
      return accumulator
    }, {}),
  }

  return {
    items,
    summary,
  }
}
