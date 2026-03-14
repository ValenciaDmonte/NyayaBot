/**
 * middleware/errorHandler.js
 *
 * WHY: A centralised error handler prevents duplicate try/catch blocks in
 * every route and ensures all errors are formatted consistently.
 *
 * We distinguish two error categories:
 * - Operational (4xx): Expected errors — bad input, not found, unauthorised.
 *   These are safe to send to the client.
 * - Programmer (5xx): Unexpected bugs. Log the stack trace, send a generic
 *   message to the client (never leak stack traces to users).
 */

const logger = require('../utils/logger');

// Attach this property to Error instances to mark them as "safe to expose"
// Usage: const err = new Error('Email already taken'); err.isOperational = true; err.status = 409;
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Mark as safe to send to client
    Error.captureStackTrace(this, this.constructor);
  }
}

// Express error handler — MUST have 4 parameters (err, req, res, next)
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code was set
  const statusCode = err.statusCode || err.status || 500;
  const isOperational = err.isOperational === true;

  // Log 5xx errors with full stack — these are bugs we need to fix
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} → ${statusCode}`, {
      error: err.message,
      stack: err.stack,
      userId: req.user?.id,
    });
  }

  // Handle Zod validation errors (thrown by validateRequest middleware)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token expired' });
  }

  // Handle MongoDB duplicate key error (e.g., email already registered)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: `${field} already exists`,
    });
  }

  // Send operational errors as-is; hide programmer errors behind generic message
  res.status(statusCode).json({
    success: false,
    error: isOperational ? err.message : 'Something went wrong. Please try again.',
  });
};

module.exports = { errorHandler, AppError };
