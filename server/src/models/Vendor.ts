import mongoose, { Schema, Document } from 'mongoose';
import { PaymentTerms, VendorStatus } from '../types';

export interface IVendorDocument extends Document {
  id: string;
  name: string;
  contactEmail: string;
  paymentTerms: PaymentTerms;
  address: string;
  taxId: string;
  status: VendorStatus;
  phone?: string;
  totalInvoices: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const vendorSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    paymentTerms: {
      type: String,
      enum: ['Net 15', 'Net 30', 'Net 45', 'Net 60'],
      required: true,
      default: 'Net 30',
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    taxId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Under Review', 'Inactive'],
      required: true,
      default: 'Active',
    },
    phone: {
      type: String,
      trim: true,
    },
    totalInvoices: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual id getter and setter
vendorSchema
  .virtual('id')
  .get(function (this: any) {
    return this._id?.toString();
  })
  .set(function (this: any, v: string) {
    this._id = v;
  });

export const Vendor =
  mongoose.models.Vendor || mongoose.model<IVendorDocument>('Vendor', vendorSchema);

export default Vendor;
