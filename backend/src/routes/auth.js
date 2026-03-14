/**
 * routes/auth.js
 *
 * WHY: Authentication is the gate for all protected routes.
 * We use JWT (stateless) instead of sessions — better for a REST API
 * that will be consumed by both a web frontend and potentially mobile apps.
 *
 * Password hashing: bcryptjs with saltRounds=12 (secure, ~250ms on modern hardware)
 * WHY 12 rounds: slow enough to make brute-force impractical, fast enough for UX.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const { authenticateJWT } = require('../middleware/auth');
const { validate } = require('../middleware/validateRequest');
const { AppError } = require('../middleware/errorHandler');
const config = require('../config');

const router = express.Router();

// --- Zod schemas for request validation ---

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const preferencesSchema = z.object({
  preferredLanguage: z.enum(['en', 'hi', 'bn', 'ta', 'te', 'mr', 'kn']),
});

// Helper: create and sign a JWT for a user
const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check for existing user (MongoDB unique index will also catch this,
    // but we check early to give a cleaner error message)
    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    // Hash password — never store plain text
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user);

    res.status(201).json({
      success: true,
      user: user.toPublicJSON(),
      token,
      expiresIn: config.jwt.expiresIn,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select passwordHash (hidden by default with select: false)
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.isActive) {
      // Use same error message for "not found" and "wrong password"
      // WHY: Different messages allow attackers to enumerate valid emails
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Update last login time (fire-and-forget — don't block the response)
    User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec();

    const token = signToken(user);

    res.json({
      success: true,
      user: user.toPublicJSON(),
      token,
      expiresIn: config.jwt.expiresIn,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — returns current user from JWT
router.get('/me', authenticateJWT, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('User not found.', 404);
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/preferences — update language preference
router.patch(
  '/preferences',
  authenticateJWT,
  validate(preferencesSchema),
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { preferredLanguage: req.body.preferredLanguage },
        { new: true } // Return the updated document
      );
      res.json({ success: true, user: user.toPublicJSON() });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
