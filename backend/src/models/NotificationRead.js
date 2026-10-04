const mongoose = require('mongoose');

const notificationReadSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    notificationKey: {
      type: String,
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring idempotent read states per user and notification key
notificationReadSchema.index({ userId: 1, notificationKey: 1 }, { unique: true });

module.exports =
  mongoose.models.NotificationRead ||
  mongoose.model('NotificationRead', notificationReadSchema);
