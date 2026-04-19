/**
 * routes/history.js
 *
 * WHY: Users need to revisit past consultations. These routes expose the
 * session and message history stored in MongoDB.
 *
 * Pagination is built in from the start — a power user could have hundreds
 * of sessions and thousands of messages. Returning them all at once would
 * be slow and waste bandwidth.
 */

const express = require('express');
const { z } = require('zod');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const { authenticateJWT } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/history/sessions — list all sessions for current user
router.get('/sessions', authenticateJWT, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const showArchived = req.query.archived === 'true';
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user.id,
      isArchived: showArchived,
    };

    const [sessions, total] = await Promise.all([
      ChatSession.find(filter)
        .sort({ lastMessageAt: -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .lean(), // .lean() returns plain JS objects — faster for read-only
      ChatSession.countDocuments(filter),
    ]);

    res.json({
      success: true,
      sessions,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + sessions.length < total,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/history/sessions/:id — get a session with its messages
router.get('/sessions/:id', authenticateJWT, async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!session) throw new AppError('Session not found.', 404);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ sessionId: req.params.id })
        .sort({ createdAt: 1 }) // Chronological order
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ sessionId: req.params.id }),
    ]);

    res.json({
      success: true,
      session,
      messages,
      pagination: { page, limit, total, hasMore: skip + messages.length < total },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/history/sessions/:id — update title or archive
router.patch('/sessions/:id', authenticateJWT, async (req, res, next) => {
  try {
    const allowed = {};
    if (typeof req.body.title === 'string') allowed.title = req.body.title.slice(0, 100);
    if (typeof req.body.isArchived === 'boolean') allowed.isArchived = req.body.isArchived;

    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      allowed,
      { new: true }
    );

    if (!session) throw new AppError('Session not found.', 404);
    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/history/sessions/:id — soft delete (archive)
// WHY soft delete: users often regret hard deletes. Archive is reversible.
router.delete('/sessions/:id', authenticateJWT, async (req, res, next) => {
  try {
    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isArchived: true },
      { new: true }
    );

    if (!session) throw new AppError('Session not found.', 404);
    res.json({ success: true, message: 'Session archived.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
