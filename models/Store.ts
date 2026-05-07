// src/models/Store.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IStore extends Document {
  UserId: string;
  name: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const storeSchema = new Schema<IStore>(
  {
    UserId : { type: String, required: true },
    name: { type: String, required: true },
    address: String,
  },
  { timestamps: true }
);

export const Store = mongoose.model<IStore>("Store", storeSchema);