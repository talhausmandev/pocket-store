// src/models/Invoice.ts
import mongoose, { Schema, Document, Types } from "mongoose";

interface IInvoiceItem {
    productId: Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    total: number;
    discountEnabled?: boolean;
    discountType?: "percent" | "amount";
    discountValue?: number;
}

export interface IInvoice extends Document {
    storeId: Types.ObjectId;
    invoiceNumber: string;
    issueDate: Date;
    dueDate?: Date;
    isEstimate: boolean;
    clientId? : Types.ObjectId;   // reference
    clientName?: string;         // snapshot
    clientContact?: string;
    items: IInvoiceItem[];
    subtotalAmount: number;
    taxRate?: number;
    taxAmount: number;
    discountAmount: number;
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
        discountEnabled: Boolean,
        discountType: { type: String, enum: ["percent", "amount"] },
        discountValue: Number,
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
        invoiceNumber: { type: String, required: true, index: true },
        issueDate: { type: Date, required: true, index: true },
        dueDate: { type: Date },
        isEstimate: { type: Boolean, default: true },
        clientId : { type: Schema.Types.ObjectId, ref: "Client" },
        clientName : String,
        clientContact : String,
        items: [invoiceItemSchema],
        subtotalAmount: { type: Number, required: true },
        taxRate: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        paidAmount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["paid", "overdue", "pending"],
            default: "pending",
        },
    },
    { timestamps: true }
);

export const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", invoiceSchema);
