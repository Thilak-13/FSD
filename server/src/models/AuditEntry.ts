import mongoose, { Schema, Document } from 'mongoose';
import { AuditEntry as AuditEntryType, AuditAction } from '../types';

export interface AuditEntryDocument extends Document, Omit<AuditEntryType, 'id'> {
  id: string;
}

const AuditEntrySchema = new Schema<AuditEntryDocument>(
  {
    invoiceId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: [
        'SUBMISSION',
        'VERIFICATION',
        'APPROVAL',
        'FLAGGED',
        'PAYMENT_SCHEDULED',
        'PAYMENT_COMPLETED',
      ],
      required: true,
      index: true,
    },
    performedBy: { type: String, required: true, index: true },
    timestamp: { type: String, required: true },
    details: { type: String },
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
AuditEntrySchema.virtual('id').get(function () {
  return this._id.toString();
});

export const AuditEntryModel = mongoose.model<AuditEntryDocument>('AuditEntry', AuditEntrySchema);
export const AuditEntry = AuditEntryModel;
export default AuditEntryModel;
