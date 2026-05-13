// src/models/Product.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProduct extends Document {
  storeId: Types.ObjectId;
  name: string;
  price: number;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const NAME_COLLATION = { locale: "en", strength: 2 } as const;
productSchema.index({ storeId: 1, name: 1 }, { unique: true, collation: NAME_COLLATION });

export const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);
