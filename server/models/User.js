const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

// Authorization roles. `user` is the safe default for ordinary accounts.
// `student`/`faculty` are retained for backward compatibility as legacy
// eligibility values, not as privilege levels.
const ALLOWED_ROLES = ['user', 'operator', 'security', 'admin', 'student', 'faculty'];
const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must contain at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    password: {
      type: String,
      // Required only for local (email/password) accounts. Google accounts
      // authenticate via the provider and have no local password.
      required: [function requirePassword() { return this.authProvider === 'local'; }, 'Password is required'],
      minlength: [8, 'Password must contain at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      // Optional for Google accounts (collected later if a facility needs it).
      required: [function requirePhone() { return this.authProvider === 'local'; }, 'Phone number is required'],
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, 'Enter a valid phone number'],
    },
    role: {
      type: String,
      enum: ALLOWED_ROLES,
      default: 'user',
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
    },
    avatar: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: (_document, result) => {
        delete result.password;
        delete result.__v;
        return result;
      },
    },
  },
);

// Unique only among accounts that actually have a Google id (local accounts
// omit the field entirely and are not indexed).
userSchema.index(
  { googleId: 1 },
  { name: 'googleId_unique', unique: true, partialFilterExpression: { googleId: { $type: 'string' } } },
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ALLOWED_ROLES = ALLOWED_ROLES;
