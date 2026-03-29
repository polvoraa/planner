import { getFormResponseModel, getResponseSources } from '../models/FormResponse.js'
import { getResponseStateModel } from '../models/ResponseState.js'
import { sendWhatsAppNotification } from './notificationService.js'

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
  externalId: response._id.toString(),
  sourceKey: sourceConfig.key,
  name: response.name || 'Sem nome',
  email: response.email || 'Sem email',
  company: response.company || '',
  message: response.message || '',
  source: response.source || sourceConfig.fallbackSource || sourceConfig.dbName || 'desconhecido',
  metadata: response.metadata || {},
  createdAt: response.createdAt || null,
  updatedAt: response.updatedAt || null,
})

const buildStateMap = async (items) => {
  const ResponseState = getResponseStateModel()
  const responseKeys = items.map((item) => item.id)

  const states = responseKeys.length
    ? await ResponseState.find({ responseKey: { $in: responseKeys } }).lean()
    : []

  return states.reduce((accumulator, state) => {
    accumulator[state.responseKey] = state
    return accumulator
  }, {})
}

const attachReadState = (items, stateMap) =>
  items.map((item) => ({
    ...item,
    isRead: Boolean(stateMap[item.id]?.readAt),
    readAt: stateMap[item.id]?.readAt || null,
    whatsappNotifiedAt: stateMap[item.id]?.whatsappNotifiedAt || null,
    lastWhatsAppError: stateMap[item.id]?.lastWhatsAppError || '',
  }))

const notifyUnreadViaWhatsApp = async (items, stateMap) => {
  const ResponseState = getResponseStateModel()

  for (const item of items) {
    const state = stateMap[item.id]

    if (state?.whatsappNotifiedAt) {
      continue
    }

    try {
      const notificationResult = await sendWhatsAppNotification(item)

      if (notificationResult.skipped) {
        continue
      }

      await ResponseState.updateOne(
        { responseKey: item.id },
        {
          $set: {
            responseKey: item.id,
            source: item.source,
            externalId: item.externalId,
            whatsappNotifiedAt: new Date(),
            lastWhatsAppError: '',
          },
        },
        { upsert: true },
      )
    } catch (error) {
      await ResponseState.updateOne(
        { responseKey: item.id },
        {
          $set: {
            responseKey: item.id,
            source: item.source,
            externalId: item.externalId,
            lastWhatsAppError: error.message,
          },
        },
        { upsert: true },
      )
    }
  }
}

export const markResponsesAsRead = async ({ ids, read = true }) => {
  const normalizedIds = [...new Set((Array.isArray(ids) ? ids : []).map((item) => String(item).trim()))]
    .filter(Boolean)
    .slice(0, 200)

  if (!normalizedIds.length) {
    return { updated: 0 }
  }

  const ResponseState = getResponseStateModel()
  const now = new Date()

  if (read) {
    await Promise.all(
      normalizedIds.map((id) =>
        ResponseState.updateOne(
          { responseKey: id },
          {
            $set: {
              responseKey: id,
              readAt: now,
            },
          },
          { upsert: true },
        ),
      ),
    )
  } else {
    await ResponseState.updateMany(
      { responseKey: { $in: normalizedIds } },
      { $set: { readAt: null } },
    )
  }

  return { updated: normalizedIds.length }
}

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

  const stateMap = await buildStateMap(items)
  const itemsWithState = attachReadState(items, stateMap)

  await notifyUnreadViaWhatsApp(
    itemsWithState.filter((item) => !item.isRead),
    stateMap,
  )

  const summary = {
    total: itemsWithState.length,
    unreadTotal: itemsWithState.filter((item) => !item.isRead).length,
    bySource: itemsWithState.reduce((accumulator, item) => {
      accumulator[item.source] = (accumulator[item.source] || 0) + 1
      return accumulator
    }, {}),
    unreadBySource: itemsWithState.reduce((accumulator, item) => {
      if (!item.isRead) {
        accumulator[item.source] = (accumulator[item.source] || 0) + 1
      }

      return accumulator
    }, {}),
  }

  return {
    items: itemsWithState,
    summary,
  }
}
