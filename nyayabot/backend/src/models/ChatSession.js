/**
 * models/ChatSession.js
 *
 * WHY: Groups messages into conversations. A user can have many sessions.
 * The title is auto-generated from the first message so the sidebar shows
 * meaningful names instead of "New Consultation #47".
 *
 * We use soft-delete (isArchived) instead of hard DELETE — this preserves
 * history and lets users restore accidentally deleted sessions.
 */

const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Auto-generated from first user message (first 60 chars, trimmed at word boundary)
    title: {
      type: String,
      default: 'New Consultation',
      maxlength: 100,
    },
    // Language detected from the first message in this session
    language: {
      type: String,
      enum: ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'kn', 'und'], // 'und' = undetermined
      default: 'en',
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    // Soft delete — archived sessions are hidden in sidebar but not destroyed
    isArchived: {
      type: Boolean,
      default: false,
    },
    // Extracted text from an uploaded legal notice in this session.
    // Stored to enable follow-up Q&A without re-uploading the document.
    // Max 8000 chars — covers ~95% of legal notices. Null if no notice uploaded.
    noticeContext: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast "get all sessions for user, sorted by recent" queries
chatSessionSchema.index({ userId: 1, lastMessageAt: -1 });
chatSessionSchema.index({ userId: 1, isArchived: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
