import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    tasks: { type: [String], default: [] },
    notes: { type: [String], default: [] },
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
