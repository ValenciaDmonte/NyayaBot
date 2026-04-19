/**
 * middleware/auth.js
 *
 * WHY: Every protected route needs JWT verification. Centralising it here
 * means one change fixes auth everywhere — no copy-paste across routes.
 *
 * On success: attaches req.user = { id, email, role } for downstream handlers.
 * On failure: returns 401 immediately — never calls next() with bad auth.
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('./errorHandler');

const authenticateJWT = (req, res, next) => {
  // Expect header: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Please log in.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify throws if token is invalid or expired
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    // Let the central error handler format the JWT error response
    next(err);
  }
};

// Admin-only middleware — use AFTER authenticateJWT
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(new AppError('Admin access required.', 403));
  }
  next();
};

module.exports = { authenticateJWT, requireAdmin };
