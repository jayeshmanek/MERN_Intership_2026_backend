import mongoose from 'mongoose';
import validator from 'validator';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Invalid email'
      }
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Seller', 'Bidder'], default: 'Bidder', index: true },
    status: { type: String, enum: ['active', 'blocked'], default: 'active', index: true },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 300 },
    blockedAt: Date,
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);