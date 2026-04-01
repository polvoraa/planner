import mongoose from 'mongoose'

const importSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    month: { type: String, required: true, trim: true },
    bank: { type: String, required: true, trim: true },
    filename: { type: String, required: true, trim: true },
    rowCount: { type: Number, default: 0 },
    createdBy: { type: String, required: true, trim: true },
    createdAtLabel: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const transactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    importId: { type: String, required: true, trim: true },
    month: { type: String, required: true, trim: true },
    bank: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    type: { type: String, default: 'unknown', trim: true },
    balance: { type: Number, default: null },
    category: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    ignored: { type: Boolean, default: false },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
)

const financialWorkspaceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    imports: { type: [importSchema], default: [] },
    transactions: { type: [transactionSchema], default: [] },
  },
  {
    timestamps: true,
  },
)

export const FinancialWorkspace = mongoose.model('FinancialWorkspace', financialWorkspaceSchema)
