const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    id: { type: String },
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const toJSONTransform = {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

const purchaseOrderSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
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
    poNumber: {
      type: String,
      trim: true,
      index: true,
    },
    createdDate: {
      type: mongoose.Schema.Types.Mixed,
      default: () => new Date().toISOString().split('T')[0],
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
    toJSON: toJSONTransform,
    toObject: toJSONTransform,
  }
);

// Virtual id getter
purchaseOrderSchema.virtual('id').get(function () {
  return this._id ? this._id.toString() : undefined;
});

module.exports =
  mongoose.models.PurchaseOrder ||
  mongoose.model('PurchaseOrder', purchaseOrderSchema);
