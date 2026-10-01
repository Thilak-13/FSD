import mongoose, { Schema, Document } from 'mongoose';
import { Invoice as InvoiceType, InvoiceLineItem, InvoiceStatus } from '../types';

export interface InvoiceDocument extends Document, Omit<InvoiceType, 'id'> {
  id: string;
}

const InvoiceLineItemSchema = new Schema<InvoiceLineItem>(
  {
    id: { type: String },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
    matchedPoItemId: { type: String },
    priceMismatch: { type: Boolean, default: false },
    quantityMismatch: { type: Boolean, default: false },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<InvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    vendorId: { type: String, required: true, index: true },
    poId: { type: String },
    amount: { type: Number, required: true },
    dueDate: { type: String, required: true },
    submittedDate: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'Submitted',
        'Under Verification',
        'Approved',
        'Flagged',
        'Payment Scheduled',
        'Paid',
      ],
      default: 'Submitted',
      index: true,
    },
    submittedBy: { type: String, required: true },
    attachedDocumentName: { type: String },
    attachedDocumentPath: { type: String },
    flagReason: { type: String },
    scheduledPaymentDate: { type: String },
    paidDate: { type: String },
    notes: { type: String },
    items: { type: [InvoiceLineItemSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Map virtual 'id'
InvoiceSchema.virtual('id').get(function () {
  return this._id.toString();
});

export const InvoiceModel = mongoose.model<InvoiceDocument>('Invoice', InvoiceSchema);
export const Invoice = InvoiceModel;
export default InvoiceModel;
