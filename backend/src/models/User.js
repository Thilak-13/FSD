const mongoose = require('mongoose');

const toJSONTransform = {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Approver', 'Requester'],
      required: true,
      default: 'Requester',
    },
    department: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: toJSONTransform,
    toObject: toJSONTransform,
  }
);

// Virtual id getter
userSchema.virtual('id').get(function () {
  return this._id ? this._id.toString() : undefined;
});

// Explicit toJSON method to ensure passwordHash, _id, and __v are stripped on serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj._id;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
