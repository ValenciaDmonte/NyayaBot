/**
 * app.js — Express application factory
 *
 * WHY separate from server.js:
 * app.js creates the Express app and registers all middleware and routes.
 * server.js handles connecting to external services (MongoDB, Pinecone)
 * and starting the HTTP server.
 *
 * This separation makes the app testable with supertest (tests can import
 * the app without starting a real server or connecting to real databases).
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Routes
const authRouter = require('./routes/auth');
const queryRouter = require('./routes/query');
const historyRouter = require('./routes/history');
const adminRouter = require('./routes/admin');
const legalNoticeRouter = require('./routes/legalNotice');

const app = express();

// ── Security middleware ───────────────────────────────────────────────────────
// helmet: sets secure HTTP headers (X-XSS-Protection, HSTS, etc.)
app.use(helmet());

// CORS: only allow requests from our frontend URL
// WHY: prevents other websites from making API calls on behalf of our users
app.use(
  cors({
    origin: config.frontend.url,
    credentials: true, // Allow cookies (for future refresh token implementation)
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// ── Performance middleware ────────────────────────────────────────────────────
// Gzip responses — legal answers can be 1-3KB; compression saves ~70%
app.use(compression());

// ── Logging ───────────────────────────────────────────────────────────────────
// Morgan logs HTTP requests; we pipe to Winston so logs stay unified
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.path === '/api/health', // Don't log health checks
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' })); // 10MB for future document upload feature
app.use(express.urlencoded({ extended: true }));

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use('/api', generalLimiter);

// ── Health check (before auth — must be publicly accessible for Render) ───────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/query', queryRouter);
app.use('/api/history', historyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/legal-notice', legalNoticeRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ── Centralised error handler (MUST be last middleware) ───────────────────────
app.use(errorHandler);

module.exports = app;
