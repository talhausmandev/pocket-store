// src/models/Client.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IClient extends Document {
  storeId: Types.ObjectId;
  name: string;
  contact?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    name: { type: String, required: true },
    contact: String,
  },
  { timestamps: true }
);

export const Client = mongoose.models.Client || mongoose.model<IClient>("Client", clientSchema);
