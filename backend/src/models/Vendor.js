const mongoose = require('mongoose');

const toJSONTransform = {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
    },
    paymentTerms: {
      type: String,
      enum: ['Net 15', 'Net 30', 'Net 45', 'Net 60'],
      default: 'Net 30',
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    taxId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Under Review', 'Inactive'],
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
    toJSON: toJSONTransform,
    toObject: toJSONTransform,
  }
);

// Virtual id getter
vendorSchema.virtual('id').get(function () {
  return this._id ? this._id.toString() : undefined;
});

module.exports = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
