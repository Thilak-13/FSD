const mongoose = require('mongoose');

const invoiceLineItemSchema = new mongoose.Schema(
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

const toJSONTransform = {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    if (ret.vendorId && ret.vendorId._id) {
      ret.vendorId = ret.vendorId._id.toString();
    } else if (ret.vendorId && typeof ret.vendorId === 'object' && ret.vendorId.toString) {
      ret.vendorId = ret.vendorId.toString();
    }
    if (ret.poId && ret.poId._id) {
      ret.poId = ret.poId._id.toString();
    } else if (ret.poId && typeof ret.poId === 'object' && ret.poId.toString) {
      ret.poId = ret.poId.toString();
    }
    if (ret.submittedBy && ret.submittedBy._id) {
      ret.submittedBy = ret.submittedBy._id.toString();
    } else if (ret.submittedBy && typeof ret.submittedBy === 'object' && ret.submittedBy.toString) {
      ret.submittedBy = ret.submittedBy.toString();
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

const invoiceSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: false,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    dueDate: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    submittedDate: {
      type: mongoose.Schema.Types.Mixed,
      default: () => new Date().toISOString().split('T')[0],
    },
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
      required: true,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attachedDocumentPath: {
      type: String,
    },
    attachedDocumentName: {
      type: String,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      index: true,
    },
    flagReason: {
      type: String,
    },
    scheduledPaymentDate: {
      type: mongoose.Schema.Types.Mixed,
    },
    paidDate: {
      type: mongoose.Schema.Types.Mixed,
    },
    notes: {
      type: String,
    },
    items: {
      type: [invoiceLineItemSchema],
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
invoiceSchema.virtual('id').get(function () {
  return this._id ? this._id.toString() : undefined;
});

module.exports =
  mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
