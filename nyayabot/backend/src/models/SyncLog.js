/**
 * models/SyncLog.js
 *
 * WHY: Every ingestion run (manual or scheduled) is logged here.
 * This gives admins a full audit trail: what changed, when, which documents
 * succeeded/failed, and how many vectors were upserted.
 *
 * The cron job also uses this as a mutex — it checks for a 'running' log
 * less than 2 hours old before starting, preventing overlapping runs.
 */

const mongoose = require('mongoose');

const documentResultSchema = new mongoose.Schema(
  {
    lawName: String,
    lawCode: String,
    fileName: String,
    status: {
      type: String,
      enum: ['success', 'skipped', 'failed'],
    },
    chunksCount: Number,
    vectorsUpserted: Number,
    // SHA-256 hash of the source PDF — used by cron to detect amendments
    contentHash: String,
    error: String, // Error message if status === 'failed'
  },
  { _id: false }
);

const syncLogSchema = new mongoose.Schema(
  {
    runType: {
      type: String,
      enum: ['manual', 'scheduled'],
      required: true,
    },
    // Who triggered it (userId if manual, null if cron)
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    status: {
      type: String,
      enum: ['running', 'success', 'partial', 'failed'],
      default: 'running',
    },
    summary: {
      documentsProcessed: { type: Number, default: 0 },
      chunksCreated: { type: Number, default: 0 },
      vectorsUpserted: { type: Number, default: 0 },
      vectorsDeleted: { type: Number, default: 0 },
      errorsCount: { type: Number, default: 0 },
    },
    documents: [documentResultSchema],
    // Top-level error message if the entire run failed
    error: String,
  },
  {
    timestamps: true,
  }
);

// Index for cron mutex check: find 'running' logs quickly
syncLogSchema.index({ status: 1, startedAt: -1 });
syncLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SyncLog', syncLogSchema);
