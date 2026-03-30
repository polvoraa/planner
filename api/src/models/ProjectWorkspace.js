import mongoose from 'mongoose'

const projectTaskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: false },
)

const projectNoteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const projectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    slug: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    tasks: { type: [projectTaskSchema], default: [] },
    notes: { type: [projectNoteSchema], default: [] },
  },
  { _id: false },
)

const projectWorkspaceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    projects: { type: [projectSchema], default: [] },
  },
  {
    timestamps: true,
  },
)

export const ProjectWorkspace = mongoose.model('ProjectWorkspace', projectWorkspaceSchema)
