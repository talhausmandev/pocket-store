// src/models/Invoice.ts
import mongoose, { Schema, Document, Types } from "mongoose";

interface IInvoiceItem {
    productId: Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    total: number;
}

export interface IInvoice extends Document {
    storeId: Types.ObjectId;
    clientId? : Types.ObjectId;   // reference
    clientName?: string;         // snapshot
    clientPhone?: string;
    items: IInvoiceItem[];
    totalAmount: number;
    paidAmount: number;
    status: "paid" | "overdue" | "pending";
    createdAt: Date;
    updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        name: String,
        price: Number,
        quantity: Number,
        total: Number,
    },
    { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
    {
        storeId: {
            type: Schema.Types.ObjectId,
            ref: "Store",
            required: true,
        },
        clientId : { type: Schema.Types.ObjectId, ref: "Client" },
        clientName : String,
        clientPhone : String,
        items: [invoiceItemSchema],
        totalAmount: { type: Number, required: true },
        status: {
            type: String,
            enum: ["paid", "overdue", "pending"],
            default: "pending",
        },
    },
    { timestamps: true }
);

export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);