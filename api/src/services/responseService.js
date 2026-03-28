import { getFormResponseModel, getResponseSources } from '../models/FormResponse.js'

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildSearchQuery = (search) => {
  if (!search) {
    return {}
  }

  const regex = new RegExp(escapeRegex(search), 'i')

  return {
    $or: [
      { name: regex },
      { email: regex },
      { company: regex },
      { message: regex },
      { source: regex },
    ],
  }
}

const formatResponse = (response, sourceConfig) => ({
  id: `${sourceConfig.key}:${response._id.toString()}`,
  name: response.name || 'Sem nome',
  email: response.email || 'Sem email',
  company: response.company || '',
  message: response.message || '',
  source: response.source || sourceConfig.fallbackSource || sourceConfig.dbName || 'desconhecido',
  metadata: response.metadata || {},
  createdAt: response.createdAt || null,
  updatedAt: response.updatedAt || null,
})

export const listResponses = async ({ source, search, limit }) => {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200)
  const normalizedSource = String(source || '').trim()
  const normalizedSearch = String(search || '').trim()
  const query = buildSearchQuery(normalizedSearch)

  const responsesBySource = await Promise.all(
    getResponseSources().map(async (sourceConfig) => {
      const FormResponse = getFormResponseModel(sourceConfig)
      const responses = await FormResponse.find(query)
        .sort({ createdAt: -1 })
        .limit(normalizedLimit)
        .lean()

      return responses.map((response) => formatResponse(response, sourceConfig))
    }),
  )

  const items = responsesBySource
    .flat()
    .filter((item) => !normalizedSource || item.source === normalizedSource)
    .sort((first, second) => {
      const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0
      const secondDate = second.createdAt ? new Date(second.createdAt).getTime() : 0
      return secondDate - firstDate
    })
    .slice(0, normalizedLimit)

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
