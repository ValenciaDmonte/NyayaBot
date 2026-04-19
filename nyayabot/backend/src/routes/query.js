/**
 * routes/query.js
 *
 * WHY: The POST /api/query endpoint is the core of NyayaBot. It receives a
 * legal question, runs the RAG pipeline, persists the conversation to MongoDB,
 * and returns the grounded answer with citations.
 *
 * We also handle session management here:
 * - If sessionId is provided → add to that session
 * - If not → create a new session, auto-generate a title from the first message
 */

const express = require('express');
const { z } = require('zod');
const { runRAGPipeline } = require('../services/rag');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const { authenticateJWT } = require('../middleware/auth');
const { queryLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validateRequest');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

const querySchema = z.object({
  query: z
    .string()
    .min(3, 'Query must be at least 3 characters')
    .max(2000, 'Query too long — max 2000 characters'),
  sessionId: z.string().optional(), // MongoDB ObjectId string
  languageOverride: z
    .enum(['en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn'])
    .optional(),
});

// POST /api/query — the main RAG endpoint
router.post(
  '/',
  authenticateJWT,
  queryLimiter, // Strict rate limit: 20 queries per 15 minutes
  validate(querySchema),
  async (req, res, next) => {
    try {
      const { query, sessionId, languageOverride } = req.body;
      const userId = req.user.id;

      // ── Resolve or create chat session ──────────────────────────────────
      let session;

      if (sessionId) {
        // Verify the session belongs to this user
        session = await ChatSession.findOne({ _id: sessionId, userId });
        if (!session) throw new AppError('Session not found.', 404);
      } else {
        // Create a new session with a placeholder title
        session = await ChatSession.create({
          userId,
          title: query.slice(0, 60).trim(), // First 60 chars as temporary title
          language: languageOverride || 'en',
        });
      }

      // ── Save user message to DB ──────────────────────────────────────────
      const userMessage = await Message.create({
        sessionId: session._id,
        userId,
        role: 'user',
        content: query,
        detectedLanguage: languageOverride || 'und', // Updated after RAG
      });

      // ── Read notice context for this session ────────────────────────────
      // If the user uploaded a legal notice earlier in this session, its
      // extracted text is stored in session.noticeContext. Passing it to the
      // pipeline lets follow-up questions reference the specific document.
      const noticeContext = session.noticeContext || null;

      // ── Fetch conversation history for context injection ─────────────────
      // WHY: Follow-up questions like "what about for minors?" need the prior
      // turns to be self-contained queries. We fetch the last 2 user messages
      // (excluding the one we just saved) and pass them to the RAG pipeline.
      const recentMessages = await Message.find({
        sessionId: session._id,
        role: 'user',
        _id: { $ne: userMessage._id }, // exclude the message we just saved
      })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean();

      // Reverse so oldest is first (chronological order for context)
      const conversationHistory = recentMessages.reverse().map((m) => m.content);

      // ── Run RAG pipeline ─────────────────────────────────────────────────
      let ragResult;
      try {
        ragResult = await runRAGPipeline(query, { languageOverride, conversationHistory, noticeContext });
      } catch (ragErr) {
        // If the RAG pipeline fails (Gemini/Pinecone unavailable), return 503
        // WHY: Don't let pipeline errors become unhandled 500s in logs
        logger.error('RAG pipeline error:', ragErr);
        throw new AppError(
          'Legal query service is temporarily unavailable. Please try again in a moment.',
          503
        );
      }

      // ── Save assistant message to DB ─────────────────────────────────────
      const assistantMessage = await Message.create({
        sessionId: session._id,
        userId,
        role: 'assistant',
        content: ragResult.answer,
        detectedLanguage: ragResult.detectedLanguage,
        ragMetadata: {
          confidenceScore: ragResult.confidenceScore,
          citations: ragResult.citations,
          timings: ragResult.timings,
        },
        hasRepealedWarning: ragResult.hasRepealedWarning,
      });

      // ── Update session metadata ──────────────────────────────────────────
      // Update language and message count (fire-and-forget)
      ChatSession.findByIdAndUpdate(session._id, {
        language: ragResult.detectedLanguage,
        lastMessageAt: new Date(),
        $inc: { messageCount: 2 }, // user + assistant
      }).exec();

      // Update user message with detected language
      Message.findByIdAndUpdate(userMessage._id, {
        detectedLanguage: ragResult.detectedLanguage,
      }).exec();

      // ── Respond ──────────────────────────────────────────────────────────
      res.json({
        success: true,
        answer: ragResult.answer,
        detectedLanguage: ragResult.detectedLanguage,
        sessionId: session._id,
        messageId: assistantMessage._id,
        citations: ragResult.citations,
        hasRepealedWarning: ragResult.hasRepealedWarning,
        confidenceScore: ragResult.confidenceScore,
        usedNoticeContext: ragResult.usedNoticeContext || false,
        // Always include disclaimer in API response — any client consuming
        // this API must surface this to users, not just our own UI
        disclaimer: 'This is not professional legal advice. Please consult a qualified lawyer for your specific situation.',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
