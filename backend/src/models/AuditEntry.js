const mongoose = require('mongoose');

const toJSONTransform = {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    if (ret.invoiceId && ret.invoiceId._id) {
      ret.invoiceId = ret.invoiceId._id.toString();
    } else if (ret.invoiceId && typeof ret.invoiceId === 'object' && ret.invoiceId.toString) {
      ret.invoiceId = ret.invoiceId.toString();
    }
    if (ret.performedBy && ret.performedBy._id) {
      ret.performedBy = ret.performedBy.name || ret.performedBy._id.toString();
    } else if (ret.performedBy && typeof ret.performedBy === 'object' && ret.performedBy.toString) {
      ret.performedBy = ret.performedBy.toString();
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

const auditEntrySchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: toJSONTransform,
    toObject: toJSONTransform,
  }
);

// Virtual id getter
auditEntrySchema.virtual('id').get(function () {
  return this._id ? this._id.toString() : undefined;
});

module.exports =
  mongoose.models.AuditEntry || mongoose.model('AuditEntry', auditEntrySchema);
