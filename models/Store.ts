import mongoose, { Schema, Document } from "mongoose"

export interface IStore extends Document {
  clerkUserId: string
  name: string
  address?: string
  contact?: string
  createdAt: Date
  updatedAt: Date
}

const storeSchema = new Schema<IStore>(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    contact: { type: String, default: "" },
  },
  { timestamps: true }
)

export const Store = mongoose.models.Store || mongoose.model<IStore>("Store", storeSchema)
