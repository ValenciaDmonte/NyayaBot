/**
 * server.js — Application entry point
 *
 * WHY separate from app.js:
 * This file handles all side effects: connecting to external services,
 * starting the HTTP server, and registering cron jobs.
 *
 * Startup sequence:
 * 1. Connect MongoDB — if this fails, abort (no point running without DB)
 * 2. Connect Pinecone — warn but continue (queries will fail gracefully)
 * 3. Register cron jobs
 * 4. Start HTTP server
 *
 * Graceful shutdown: On SIGTERM/SIGINT, close DB connections cleanly.
 * WHY: Render sends SIGTERM before stopping the process. Without graceful
 * shutdown, in-flight requests are abruptly killed.
 */

const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config');
const { initPinecone } = require('./services/pinecone');
const { registerCronJobs } = require('./jobs/lawUpdateCron');
const logger = require('./utils/logger');

async function startServer() {
  try {
    // ── 1. Connect MongoDB ───────────────────────────────────────────────
    await mongoose.connect(config.mongodb.uri);
    logger.info('✓  MongoDB connected');

    // ── 2. Connect Pinecone ──────────────────────────────────────────────
    try {
      await initPinecone();
      logger.info('✓  Pinecone connected');
    } catch (err) {
      // Pinecone failure is non-fatal for startup but will break queries
      logger.error('⚠️  Pinecone connection failed — queries will not work:', err.message);
    }

    // ── 3. Register cron jobs ────────────────────────────────────────────
    if (config.isProduction) {
      // Only run cron in production — avoid running nightly updates in dev
      registerCronJobs();
    } else {
      logger.info('Cron jobs skipped (not in production)');
    }

    // ── 4. Start HTTP server ─────────────────────────────────────────────
    const server = app.listen(config.port, () => {
      logger.info(`✓  Server running on port ${config.port} (${config.nodeEnv})`);
      logger.info(`   Health check: http://localhost:${config.port}/api/health`);
    });

    // ── Graceful shutdown ────────────────────────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected. Goodbye.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Catch unhandled promise rejections (bugs we missed)
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason);
      // In production, crash and let the process manager restart
      if (config.isProduction) process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
