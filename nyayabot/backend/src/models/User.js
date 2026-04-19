/**
 * models/User.js
 *
 * WHY: Stores user accounts. We keep it minimal — email, hashed password,
 * preferred language, and role. Passwords are NEVER stored in plain text;
 * bcryptjs handles hashing in the auth route before saving.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be under 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never return password hash in queries by default
    },
    // Preferred language for responses — syncs with the UI language selector
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'kn'],
      default: 'en',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: Date,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Index email for fast login lookups
userSchema.index({ email: 1 });

// Helper to get a safe public representation (no password hash)
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    preferredLanguage: this.preferredLanguage,
    role: this.role,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
