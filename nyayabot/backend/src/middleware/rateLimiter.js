/**
 * middleware/rateLimiter.js
 *
 * WHY: The Gemini API has free-tier limits (1500 req/day, 60 req/min).
 * Without rate limiting, a single user — or a bot — could exhaust the quota
 * and break the service for everyone.
 *
 * Two limiters:
 * - generalLimiter: Applied to all routes. Prevents API abuse.
 * - queryLimiter: Stricter, applied only to POST /api/query.
 *   Legal answers take multiple Gemini calls — we protect those costs.
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');

// General API limiter — 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.max, // 100 requests
  standardHeaders: true, // Return rate limit info in headers (RateLimit-*)
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait before trying again.',
  },
});

// Strict limiter for the RAG query endpoint — 20 queries per 15 minutes per IP
// WHY: Each query costs 2 Gemini API calls (embedding + generation).
// 20 queries/15min = safe for free tier while allowing normal usage.
const queryLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.queryMax, // 20 queries
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Query limit reached. Please wait 15 minutes before asking another question.',
  },
});

module.exports = { generalLimiter, queryLimiter };
