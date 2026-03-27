import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: false },
)

const daySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    dateKey: { type: String, default: '' },
    label: { type: String, required: true },
    date: { type: String, required: true },
    note: { type: String, required: true },
    tasks: { type: [taskSchema], default: [] },
  },
  { _id: false },
)

const plannerBoardSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    days: { type: [daySchema], default: [] },
  },
  {
    timestamps: true,
  },
)

export const PlannerBoard = mongoose.model('PlannerBoard', plannerBoardSchema)
