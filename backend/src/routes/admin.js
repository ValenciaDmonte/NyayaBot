/**
 * routes/admin.js
 *
 * WHY: Admin-only endpoints for managing the system.
 * These are protected by both JWT and role=admin check.
 *
 * POST /api/admin/ingest — manually trigger PDF re-ingestion
 * GET  /api/admin/sync-logs — view ingestion history
 * GET  /api/admin/stats — dashboard numbers
 */

const express = require('express');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const SyncLog = require('../models/SyncLog');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const { getIndexStats } = require('../services/pinecone');
const logger = require('../utils/logger');

const router = express.Router();

// All admin routes require JWT + admin role
router.use(authenticateJWT, requireAdmin);

// POST /api/admin/ingest — trigger manual ingestion
// WHY async with polling: ingestion takes minutes. We kick it off and return
// a log ID immediately. The client can poll GET /sync-logs/:id for status.
router.post('/ingest', async (req, res, next) => {
  try {
    // Create a sync log to track this run
    const syncLog = await SyncLog.create({
      runType: 'manual',
      triggeredBy: req.user.id,
      status: 'running',
    });

    // Run ingestion in background — don't await (would timeout HTTP request)
    // WHY: Ingestion of 5 laws takes 5-15 minutes on free tier rate limits
    setImmediate(async () => {
      try {
        // Dynamically require to avoid circular deps
        const { runFullIngestion } = require('../scripts/ingestAll');
        await runFullIngestion(syncLog._id, req.body.lawCode || null);
      } catch (err) {
        logger.error('Manual ingestion failed:', err);
        await SyncLog.findByIdAndUpdate(syncLog._id, {
          status: 'failed',
          error: err.message,
          completedAt: new Date(),
        });
      }
    });

    res.json({
      success: true,
      message: 'Ingestion started in background.',
      syncLogId: syncLog._id,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/sync-logs — view recent ingestion runs
router.get('/sync-logs', async (req, res, next) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const logs = await SyncLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, logs, total: logs.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats — system dashboard
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, totalSessions, totalMessages, lastSync, indexStats] =
      await Promise.all([
        User.countDocuments(),
        ChatSession.countDocuments(),
        Message.countDocuments(),
        SyncLog.findOne({ status: 'success' }).sort({ completedAt: -1 }).lean(),
        getIndexStats().catch(() => null), // Don't crash if Pinecone is slow
      ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalSessions,
        totalMessages,
        lastSyncAt: lastSync?.completedAt || null,
        pinecone: indexStats
          ? {
              totalVectors: indexStats.totalRecordCount,
              namespaces: indexStats.namespaces,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
