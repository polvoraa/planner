const normalizeWhatsAppText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

const buildWhatsAppMessage = (item) => {
  const lines = [
    'Nova mensagem no planner',
    `Origem: ${normalizeWhatsAppText(item.source) || 'desconhecida'}`,
    `Nome: ${normalizeWhatsAppText(item.name) || 'Sem nome'}`,
    `Email: ${normalizeWhatsAppText(item.email) || 'Sem email'}`,
  ]

  const message = normalizeWhatsAppText(item.message)

  if (message) {
    lines.push(`Mensagem: ${message.slice(0, 280)}`)
  }

  return lines.join('\n')
}

const sendWithCallMeBot = async (item) => {
  const phone = String(process.env.WHATSAPP_NOTIFY_PHONE || '').trim()
  const apiKey = String(process.env.WHATSAPP_NOTIFY_API_KEY || '').trim()

  if (!phone || !apiKey) {
    return { skipped: true, reason: 'missing_credentials' }
  }

  const message = buildWhatsAppMessage(item)
  const query = new URLSearchParams({
    phone,
    text: message,
    apikey: apiKey,
  })

  const response = await fetch(`https://api.callmebot.com/whatsapp.php?${query.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || `CallMeBot respondeu com status ${response.status}.`)
  }

  return { skipped: false }
}

export const sendWhatsAppNotification = async (item) => {
  const isEnabled = String(process.env.WHATSAPP_NOTIFICATIONS_ENABLED || '')
    .trim()
    .toLowerCase()

  if (!['1', 'true', 'yes', 'on'].includes(isEnabled)) {
    return { skipped: true, reason: 'disabled' }
  }

  const provider = String(process.env.WHATSAPP_NOTIFY_PROVIDER || 'callmebot')
    .trim()
    .toLowerCase()

  if (provider === 'callmebot') {
    return sendWithCallMeBot(item)
  }

  return { skipped: true, reason: 'unsupported_provider' }
}
