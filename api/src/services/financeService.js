import { randomUUID } from 'node:crypto'
import { FinancialWorkspace } from '../models/FinancialWorkspace.js'

const WORKSPACE_KEY = 'main'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile'
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: String(process.env.APP_TIMEZONE || 'America/Sao_Paulo').trim() || 'America/Sao_Paulo',
})

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const toMonthKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const formatTimestamp = (date = new Date()) => TIMESTAMP_FORMATTER.format(date)

const getGroqConfig = () => {
  const apiKey = String(process.env.GROQ_API_KEY || '').trim()

  if (!apiKey) {
    const error = new Error('GROQ_API_KEY nao configurada.')
    error.statusCode = 503
    throw error
  }

  return {
    apiKey,
    model: String(process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL).trim() || DEFAULT_GROQ_MODEL,
  }
}

const getOrCreateWorkspace = async () => {
  let workspace = await FinancialWorkspace.findOne({ key: WORKSPACE_KEY })

  if (!workspace) {
    workspace = await FinancialWorkspace.create({
      key: WORKSPACE_KEY,
      imports: [],
      transactions: [],
    })
  }

  return workspace
}

const formatImport = (item) => ({
  id: item.id,
  month: item.month,
  bank: item.bank,
  filename: item.filename,
  rowCount: item.rowCount,
  createdBy: item.createdBy,
  createdAtLabel: item.createdAtLabel,
})

const formatTransaction = (item) => ({
  id: item.id,
  importId: item.importId,
  month: item.month,
  bank: item.bank,
  date: item.date,
  description: item.description,
  amount: item.amount,
  type: item.type,
  balance: item.balance ?? null,
  category: item.category || '',
  notes: item.notes || '',
  ignored: Boolean(item.ignored),
})

const summarizeTransactions = (transactions) => {
  const visibleTransactions = transactions.filter((item) => !item.ignored)
  const income = visibleTransactions
    .filter((item) => item.amount > 0)
    .reduce((total, item) => total + item.amount, 0)
  const expenses = visibleTransactions
    .filter((item) => item.amount < 0)
    .reduce((total, item) => total + Math.abs(item.amount), 0)

  return {
    total: transactions.length,
    visible: visibleTransactions.length,
    income,
    expenses,
    balance: income - expenses,
  }
}

const formatWorkspace = (workspace, month = '') => {
  const filteredTransactions = month
    ? workspace.transactions.filter((transaction) => transaction.month === month)
    : workspace.transactions

  const sortedTransactions = [...filteredTransactions].sort((left, right) => {
    if (left.date === right.date) {
      return left.description.localeCompare(right.description)
    }

    return left.date.localeCompare(right.date)
  })

  const months = [...new Set(workspace.transactions.map((transaction) => transaction.month))]
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))

  return {
    imports: workspace.imports
      .filter((item) => !month || item.month === month)
      .map(formatImport)
      .sort((left, right) => right.createdAtLabel.localeCompare(left.createdAtLabel)),
    transactions: sortedTransactions.map(formatTransaction),
    summary: summarizeTransactions(sortedTransactions),
    months,
  }
}

const detectDelimiter = (text) => {
  const sample = text.split(/\r?\n/).slice(0, 5).join('\n')
  const candidates = [',', ';', '\t']

  return candidates
    .map((delimiter) => ({
      delimiter,
      count: sample.split(delimiter).length,
    }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter || ','
}

const parseCsv = (text) => {
  const delimiter = detectDelimiter(text)
  const rows = []
  let current = ''
  let row = []
  let insideQuotes = false

  const pushCell = () => {
    row.push(current)
    current = ''
  }

  const pushRow = () => {
    if (row.length > 1 || row[0]?.trim()) {
      rows.push(row.map((cell) => cell.trim()))
    }
    row = []
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        current += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (!insideQuotes && character === delimiter) {
      pushCell()
      continue
    }

    if (!insideQuotes && (character === '\n' || character === '\r')) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }
      pushCell()
      pushRow()
      continue
    }

    current += character
  }

  if (current || row.length) {
    pushCell()
    pushRow()
  }

  return rows
}

const isLikelyHeader = (row = []) => row.some((cell) => /[a-zA-Z]/.test(cell))

const parseAmount = (value) => {
  const raw = String(value || '')
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/[^\d,.-]/g, '')

  if (!raw) {
    return null
  }

  const hasComma = raw.includes(',')
  const hasDot = raw.includes('.')
  let normalized = raw

  if (hasComma && hasDot) {
    const lastComma = raw.lastIndexOf(',')
    const lastDot = raw.lastIndexOf('.')

    normalized =
      lastComma > lastDot
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw.replace(/,/g, '')
  } else if (hasComma) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (hasDot) {
    const decimalMatch = raw.match(/\.(\d{1,2})$/)
    normalized = decimalMatch ? raw : raw.replace(/\./g, '')
  }

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const parseDate = (value, fallbackMonth) => {
  const text = String(value || '').trim()
  if (!text) {
    return `${fallbackMonth}-01`
  }

  const brMatch = text.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/)
  if (brMatch) {
    const [, day, month, year] = brMatch
    const resolvedYear = year ? year.padStart(4, '20') : fallbackMonth.slice(0, 4)
    return `${resolvedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  }

  return `${fallbackMonth}-01`
}

const inferBankFromFilename = (filename) => {
  const normalized = normalizeText(filename)
  if (!normalized) {
    return 'Conta'
  }

  if (normalized.includes('nubank')) return 'Nubank'
  if (normalized.includes('inter')) return 'Inter'
  if (normalized.includes('sicredi')) return 'Sicredi'
  if (normalized.includes('bradesco')) return 'Bradesco'
  if (normalized.includes('itau')) return 'Itau'
  if (normalized.includes('caixa')) return 'Caixa'
  if (normalized.includes('bb') || normalized.includes('banco do brasil')) return 'Banco do Brasil'

  return filename.replace(/\.csv$/i, '').trim() || 'Conta'
}

const inferBankFromRows = (rows = [], filename = '') => {
  const bankFromFilename = inferBankFromFilename(filename)
  const normalizedFilename = normalizeText(filename)

  if (normalizedFilename.includes('nu_') || normalizedFilename.includes('nubank')) {
    return 'Nubank'
  }

  if (bankFromFilename !== filename.replace(/\.csv$/i, '').trim() || normalizedFilename.includes('bradesco')) {
    return bankFromFilename
  }

  const joined = normalizeText(rows.slice(0, 8).flat().join(' '))
  if (joined.includes('extrato de: ag') || joined.includes('credito (r$)') && joined.includes('debito (r$)')) {
    return 'Bradesco'
  }
  if (joined.includes('identificador') && joined.includes('valor') && joined.includes('descricao')) {
    return 'Nubank'
  }

  return bankFromFilename
}

const mapHeaders = (headers = []) => {
  const normalizedHeaders = headers.map((header) => normalizeText(header))

  const findHeaderIndex = (patterns) =>
    normalizedHeaders.findIndex((header) => patterns.some((pattern) => header.includes(pattern)))

  return {
    date: findHeaderIndex(['data', 'date', 'lancamento']),
    description: findHeaderIndex(['descricao', 'historico', 'titulo', 'detalhe', 'favorecido', 'estabelecimento']),
    amount: findHeaderIndex(['valor', 'amount', 'montante']),
    credit: findHeaderIndex(['credito', 'entrada']),
    debit: findHeaderIndex(['debito', 'saida']),
    balance: findHeaderIndex(['saldo', 'balance']),
    type: findHeaderIndex(['tipo', 'operacao']),
    category: findHeaderIndex(['categoria']),
  }
}

const isDateCell = (value) => /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(String(value || '').trim())

const isIgnorableFinanceRow = (row = []) => {
  const normalizedRow = row.map((cell) => String(cell || '').trim())
  const joined = normalizeText(normalizedRow.join(' '))

  if (!joined) {
    return true
  }

  const ignoredPatterns = [
    'extrato de: ag',
    'filtro de resultados',
    'os dados acima tem como base',
    'ultimos lancamentos',
    'ultimo lancamento',
    'total',
    'ag:',
    'conta:',
  ]

  if (ignoredPatterns.some((pattern) => joined.includes(pattern))) {
    return true
  }

  const nonEmptyCells = normalizedRow.filter(Boolean)
  if (!nonEmptyCells.length) {
    return true
  }

  return false
}

const isBradescoHeaderRow = (row = []) =>
  normalizeText(row[0]) === 'data' && normalizeText(row[1]).includes('historico')

const isNubankHeaderRow = (row = []) => {
  const normalized = row.map((cell) => normalizeText(cell))
  return (
    normalized[0] === 'data' &&
    normalized[1] === 'valor' &&
    normalized[2] === 'identificador' &&
    (normalized[3].includes('descricao') || normalized[3].startsWith('descri'))
  )
}

const buildTransactionFromMappedRow = ({
  row,
  columnMap,
  month,
  bank,
  username,
  headers,
  keepZeroAmount = false,
  allowBalanceOnlyRow = false,
}) => {
  const amountFromValue = columnMap.amount >= 0 ? parseAmount(row[columnMap.amount]) : null
  const credit = columnMap.credit >= 0 ? parseAmount(row[columnMap.credit]) : null
  const debit = columnMap.debit >= 0 ? parseAmount(row[columnMap.debit]) : null
  const balance = columnMap.balance >= 0 ? parseAmount(row[columnMap.balance]) : null
  const amount = amountFromValue ?? (credit !== null ? credit : debit !== null ? -Math.abs(debit) : null)

  const descriptionCandidates = [
    columnMap.description >= 0 ? row[columnMap.description] : '',
    row[1],
    row[2],
  ]
  const description = descriptionCandidates.find((item) => String(item || '').trim()) || ''

  const resolvedAmount =
    amount === null && allowBalanceOnlyRow && balance !== null
      ? 0
      : amount

  if (!description || resolvedAmount === null || (!keepZeroAmount && resolvedAmount === 0)) {
    return null
  }

  const date = parseDate(
    columnMap.date >= 0 ? row[columnMap.date] : row[0],
    month,
  )
  const typeValue =
    (columnMap.type >= 0 ? String(row[columnMap.type] || '').trim() : '') ||
    (resolvedAmount > 0 ? 'credit' : resolvedAmount < 0 ? 'debit' : 'unknown')

  return {
    id: randomUUID(),
    importId: '',
    month,
    bank,
    date,
    description: description.trim(),
    amount: resolvedAmount,
    type: typeValue,
    balance,
    category: columnMap.category >= 0 ? String(row[columnMap.category] || '').trim() : '',
    notes: '',
    ignored: false,
    raw: {
      row,
      importedBy: username,
      headers,
    },
  }
}

const parseBradescoRows = ({ rows, month, username }) => {
  const transactions = []
  let activeHeaders = []
  let columnMap = null
  let bank = 'Bradesco'

  rows.forEach((row) => {
    const normalizedRow = row.map((cell) => String(cell || '').trim())
    const joined = normalizeText(normalizedRow.join(' '))

    if (joined.includes('extrato de: ag')) {
      bank = 'Bradesco'
    }

    if (isIgnorableFinanceRow(normalizedRow)) {
      return
    }

    if (isBradescoHeaderRow(normalizedRow)) {
      activeHeaders = normalizedRow
      columnMap = mapHeaders(activeHeaders)
      return
    }

    if (!columnMap) {
      return
    }

    if (!isDateCell(normalizedRow[0])) {
      return
    }

    const transaction = buildTransactionFromMappedRow({
      row: normalizedRow,
      columnMap,
      month,
      bank,
      username,
      headers: activeHeaders,
      keepZeroAmount: true,
      allowBalanceOnlyRow: true,
    })

    if (transaction) {
      transactions.push(transaction)
    }
  })

  const dedupedTransactions = transactions.filter((transaction, index, collection) => {
    const key = `${transaction.date}|${transaction.description}|${transaction.amount}|${transaction.balance ?? ''}`
    return collection.findIndex((item) => `${item.date}|${item.description}|${item.amount}|${item.balance ?? ''}` === key) === index
  })

  return {
    bank,
    headers: activeHeaders,
    transactions: dedupedTransactions,
  }
}

const parseNubankRows = ({ rows, month, username }) => {
  const headerIndex = rows.findIndex((row) => isNubankHeaderRow(row))

  if (headerIndex < 0) {
    return {
      bank: 'Nubank',
      headers: [],
      transactions: [],
    }
  }

  const headers = rows[headerIndex].map((cell) => String(cell || '').trim())
  const transactions = rows
    .slice(headerIndex + 1)
    .map((row) => row.map((cell) => String(cell || '').trim()))
    .filter((row) => row.some(Boolean))
    .filter((row) => isDateCell(row[0]))
    .map((row) => {
      const amount = parseAmount(row[1])
      const description = String(row[3] || '').trim()

      if (!description || amount === null || amount === 0) {
        return null
      }

      return {
        id: randomUUID(),
        importId: '',
        month,
        bank: 'Nubank',
        date: parseDate(row[0], month),
        description,
        amount,
        type: amount > 0 ? 'credit' : 'debit',
        balance: null,
        category: '',
        notes: '',
        ignored: false,
        raw: {
          identifier: String(row[2] || '').trim(),
          row,
          importedBy: username,
          headers,
        },
      }
    })
    .filter(Boolean)

  return {
    bank: 'Nubank',
    headers,
    transactions,
  }
}

const normalizeRowsToTransactions = ({ rows, filename, month, username }) => {
  const bank = inferBankFromRows(rows, filename)

  if (bank === 'Bradesco') {
    return parseBradescoRows({ rows, month, username })
  }

  if (bank === 'Nubank') {
    return parseNubankRows({ rows, month, username })
  }

  const firstHeaderIndex = rows.findIndex((row) => isLikelyHeader(row) && !isIgnorableFinanceRow(row))
  const headers = firstHeaderIndex >= 0 ? rows[firstHeaderIndex] : []
  const bodyRows = headers.length ? rows.slice(firstHeaderIndex + 1) : rows
  const columnMap = mapHeaders(headers)

  const transactions = bodyRows
    .filter((row) => !isIgnorableFinanceRow(row))
    .map((row) =>
      buildTransactionFromMappedRow({
        row,
        columnMap,
        month,
        bank,
        username,
        headers,
      }),
    )
    .filter(Boolean)

  return {
    bank,
    headers,
    transactions,
  }
}

export const listFinanceWorkspace = async ({ month = '' } = {}) => {
  const workspace = await getOrCreateWorkspace()
  const resolvedMonth = month || toMonthKey()
  return formatWorkspace(workspace, resolvedMonth)
}

export const removeFinanceImport = async ({ importId, month = '' }) => {
  const workspace = await getOrCreateWorkspace()
  const existingImport = workspace.imports.find((item) => item.id === importId)

  if (!existingImport) {
    return false
  }

  workspace.imports = workspace.imports.filter((item) => item.id !== importId)
  workspace.transactions = workspace.transactions.filter((item) => item.importId !== importId)
  await workspace.save()

  return {
    workspace: formatWorkspace(workspace, month || existingImport.month),
    removed: {
      importId,
      month: existingImport.month,
      bank: existingImport.bank,
      filename: existingImport.filename,
    },
  }
}

export const importFinanceCsv = async ({ filename, csvText, month, auth }) => {
  const safeFilename = String(filename || '').trim()
  const safeCsvText = String(csvText || '').trim()
  const resolvedMonth = String(month || '').trim() || toMonthKey()

  if (!safeFilename || !safeCsvText) {
    const error = new Error('Arquivo CSV invalido.')
    error.statusCode = 400
    throw error
  }

  const rows = parseCsv(safeCsvText)

  if (!rows.length) {
    const error = new Error('Nao foi possivel ler o CSV informado.')
    error.statusCode = 400
    throw error
  }

  const workspace = await getOrCreateWorkspace()
  const normalized = normalizeRowsToTransactions({
    rows,
    filename: safeFilename,
    month: resolvedMonth,
    username: auth.username,
  })

  if (!normalized.transactions.length) {
    const error = new Error('O CSV nao gerou nenhuma transacao valida.')
    error.statusCode = 400
    throw error
  }

  const importId = randomUUID()
  workspace.imports.unshift({
    id: importId,
    month: resolvedMonth,
    bank: normalized.bank,
    filename: safeFilename,
    rowCount: normalized.transactions.length,
    createdBy: auth.username,
    createdAtLabel: formatTimestamp(),
  })

  normalized.transactions.forEach((transaction) => {
    workspace.transactions.push({
      ...transaction,
      importId,
    })
  })

  await workspace.save()

  return {
    workspace: formatWorkspace(workspace, resolvedMonth),
    imported: {
      importId,
      bank: normalized.bank,
      rowCount: normalized.transactions.length,
      headers: normalized.headers,
    },
  }
}

const parseJsonFromContent = (content) => {
  const raw = String(content || '').trim()

  if (!raw) {
    throw new Error('Resposta vazia da IA.')
  }

  try {
    return JSON.parse(raw)
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (match?.[1]) {
      return JSON.parse(match[1].trim())
    }
    throw new Error('Nao foi possivel interpretar o JSON retornado pela IA.')
  }
}

const matchTransactions = (transactions, filters = {}) => {
  const descriptionContains = normalizeText(filters.description_contains)
  const bankEquals = normalizeText(filters.bank)
  const categoryEquals = normalizeText(filters.category)
  const dateEquals = String(filters.date || '').trim()
  const typeEquals = normalizeText(filters.type)
  const amountEquals = filters.amount === undefined || filters.amount === null ? null : Number(filters.amount)
  const ignoredEquals =
    typeof filters.ignored === 'boolean' ? filters.ignored : null

  return transactions.filter((transaction) => {
    if (descriptionContains && !normalizeText(transaction.description).includes(descriptionContains)) {
      return false
    }
    if (bankEquals && normalizeText(transaction.bank) !== bankEquals) {
      return false
    }
    if (categoryEquals && normalizeText(transaction.category) !== categoryEquals) {
      return false
    }
    if (dateEquals && String(transaction.date) !== dateEquals) {
      return false
    }
    if (typeEquals && normalizeText(transaction.type) !== typeEquals) {
      return false
    }
    if (amountEquals !== null && Number(transaction.amount) !== amountEquals) {
      return false
    }
    if (ignoredEquals !== null && Boolean(transaction.ignored) !== ignoredEquals) {
      return false
    }
    return true
  })
}

const buildFinancePrompt = ({ command, month, transactions }) => {
  const sample = transactions.slice(0, 20).map((item) => ({
    id: item.id,
    date: item.date,
    description: item.description,
    amount: item.amount,
    bank: item.bank,
    category: item.category,
    notes: item.notes,
    ignored: item.ignored,
  }))

  return [
    'Voce converte comandos de edicao financeira em JSON.',
    'Responda somente JSON valido.',
    'Formato:',
    '{',
    '  "action": "bulk_update",',
    '  "filters": {',
    '    "description_contains": "",',
    '    "bank": "",',
    '    "category": "",',
    '    "date": "",',
    '    "type": "",',
    '    "ignored": false',
    '  },',
    '  "changes": {',
    '    "category": "",',
    '    "notes": "",',
    '    "type": "credit|debit|transfer|unknown",',
    '    "bank": "",',
    '    "description": "",',
    '    "ignored": true',
    '  }',
    '}',
    'Use apenas filtros e alteracoes necessarios.',
    'Se o comando for ambíguo, seja conservador.',
    `Mes alvo: ${month}`,
    `Comando do usuario: ${command}`,
    `Amostra de lancamentos: ${JSON.stringify(sample)}`,
  ].join('\n')
}

export const previewFinanceCommand = async ({ command, month }) => {
  const safeCommand = String(command || '').trim()
  const resolvedMonth = String(month || '').trim() || toMonthKey()

  if (!safeCommand) {
    const error = new Error('O comando financeiro e obrigatorio.')
    error.statusCode = 400
    throw error
  }

  const workspace = await getOrCreateWorkspace()
  const monthTransactions = workspace.transactions.filter((item) => item.month === resolvedMonth)
  const { apiKey, model } = getGroqConfig()

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Voce retorna somente JSON valido e sem texto extra.',
        },
        {
          role: 'user',
          content: buildFinancePrompt({
            command: safeCommand,
            month: resolvedMonth,
            transactions: monthTransactions,
          }),
        },
      ],
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Falha ao consultar o Groq.'
    const error = new Error(message)
    error.statusCode = response.status
    throw error
  }

  const parsed = parseJsonFromContent(payload?.choices?.[0]?.message?.content || '')
  const filters = typeof parsed?.filters === 'object' && parsed.filters ? parsed.filters : {}
  const changes = typeof parsed?.changes === 'object' && parsed.changes ? parsed.changes : {}
  const matched = matchTransactions(monthTransactions, filters)

  return {
    command: safeCommand,
    month: resolvedMonth,
    provider: 'groq',
    model,
    action: 'bulk_update',
    filters,
    changes,
    matchedCount: matched.length,
    matchedTransactions: matched.slice(0, 20).map(formatTransaction),
  }
}

const applyChanges = (transaction, changes = {}) => {
  if (typeof changes.category === 'string') {
    transaction.category = changes.category.trim()
  }
  if (typeof changes.notes === 'string') {
    transaction.notes = changes.notes.trim()
  }
  if (typeof changes.type === 'string') {
    transaction.type = changes.type.trim()
  }
  if (typeof changes.bank === 'string') {
    transaction.bank = changes.bank.trim()
  }
  if (typeof changes.description === 'string') {
    transaction.description = changes.description.trim()
  }
  if (typeof changes.ignored === 'boolean') {
    transaction.ignored = changes.ignored
  }
}

export const applyFinanceCommand = async ({ preview }) => {
  const month = String(preview?.month || '').trim() || toMonthKey()
  const filters = typeof preview?.filters === 'object' && preview.filters ? preview.filters : {}
  const changes = typeof preview?.changes === 'object' && preview.changes ? preview.changes : {}
  const workspace = await getOrCreateWorkspace()
  const monthTransactions = workspace.transactions.filter((item) => item.month === month)
  const matched = matchTransactions(monthTransactions, filters)

  matched.forEach((transaction) => applyChanges(transaction, changes))
  await workspace.save()

  return {
    workspace: formatWorkspace(workspace, month),
    applied: {
      month,
      matchedCount: matched.length,
      changes,
    },
  }
}
