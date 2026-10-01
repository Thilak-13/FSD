import mongoose, { Schema, Document } from 'mongoose';
import { Role } from '../types';

export interface IUserDocument extends Document {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  department?: string;
  avatarUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema(
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
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
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
userSchema
  .virtual('id')
  .get(function (this: any) {
    return this._id?.toString();
  })
  .set(function (this: any, v: string) {
    this._id = v;
  });

export const User =
  mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);

export default User;
