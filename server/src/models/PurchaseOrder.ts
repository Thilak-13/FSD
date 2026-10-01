import mongoose, { Schema, Document } from 'mongoose';
import { PurchaseOrderItem } from '../types';

export interface IPurchaseOrderDocument extends Document {
  id: string;
  poNumber: string;
  vendorId: string;
  amount: number;
  description: string;
  createdDate: string;
  status: 'Open' | 'Partially Invoiced' | 'Fulfilled' | 'Closed';
  items: PurchaseOrderItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

const purchaseOrderItemSchema = new Schema(
  {
    id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    poNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    vendorId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    createdDate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Partially Invoiced', 'Fulfilled', 'Closed'],
      default: 'Open',
    },
    items: {
      type: [purchaseOrderItemSchema],
      default: [],
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
purchaseOrderSchema
  .virtual('id')
  .get(function (this: any) {
    return this._id?.toString();
  })
  .set(function (this: any, v: string) {
    this._id = v;
  });

export const PurchaseOrder =
  mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrderDocument>('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;
