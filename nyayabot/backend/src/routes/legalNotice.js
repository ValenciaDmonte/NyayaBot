/**
 * routes/legalNotice.js
 *
 * POST /api/legal-notice/analyze
 *
 * Accepts a legal notice (PDF or image), extracts text, and returns a
 * plain-language explanation in the user's preferred language.
 *
 * PRIVACY DESIGN:
 * - multer memoryStorage: file bytes live only in RAM, never written to disk
 * - Only the generated analysis is saved to MongoDB; the raw document bytes
 *   and extracted text are discarded when the request completes
 * - No filename, file hash, or document content is stored in the Message record
 */

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { parsePDF } = require('../services/ingestion');
const { extractTextFromImage } = require('../services/gemini');
const { analyzeNotice, checkLegitimacy } = require('../services/noticeAnalyzer');
const { detectLanguage } = require('../services/languageDetector');
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const { authenticateJWT } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// ── Multer: memory storage only — no disk writes ────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max

  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF and image files (JPEG, PNG, WEBP) are accepted.', 400));
    }
  },
});

// ── Separate rate limiter — tighter than the general query limit ─────────────
// WHY 5/15min: PDF parsing + OCR + Groq generation is expensive per request.
const noticeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator: (req) => req.user?.id || req.ip, // per-user limit (not just IP)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Notice upload limit reached. You can upload up to 5 notices per 15 minutes.',
  },
});

// ── POST /api/legal-notice/analyze ──────────────────────────────────────────
router.post(
  '/analyze',
  authenticateJWT,
  (req, res, next) => {
    // Run multer before rate limiter so file validation errors return 400
    // (not 429 which would be misleading for invalid file types)
    upload.single('notice')(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large. Maximum size is 5 MB.', 413));
      }
      if (err) return next(err);
      next();
    });
  },
  noticeLimiter,
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded. Please attach a PDF or image of the notice.', 400);
      }

      const { buffer, mimetype, originalname } = req.file;
      const { sessionId, languageOverride } = req.body;
      const userId = req.user.id;

      logger.info(`Notice upload: ${mimetype}, ${(buffer.length / 1024).toFixed(0)} KB, user ${userId}`);

      // ── Step 1: Extract text from the uploaded file ──────────────────────
      let extractedText;
      if (mimetype === 'application/pdf') {
        const { text } = await parsePDF(buffer);
        extractedText = text;
      } else {
        // Image — use Gemini Vision OCR
        extractedText = await extractTextFromImage(buffer, mimetype);
      }

      if (!extractedText || extractedText.trim().length < 20) {
        throw new AppError(
          'Could not extract readable text from the uploaded file. Please ensure the document is clear and not handwritten.',
          422
        );
      }

      // ── Step 2: Detect language ──────────────────────────────────────────
      // Detect from extracted text (the notice's language), then use the user's
      // override if they've explicitly selected one in the UI.
      const detectedLanguage = await detectLanguage(extractedText.slice(0, 300), languageOverride || null);

      // ── Step 3: Resolve or create chat session ───────────────────────────
      let session;
      if (sessionId) {
        session = await ChatSession.findOne({ _id: sessionId, userId });
        if (!session) throw new AppError('Session not found.', 404);
      } else {
        session = await ChatSession.create({
          userId,
          title: `Legal Notice — ${new Date().toLocaleDateString('en-IN')}`,
          language: detectedLanguage,
        });
      }

      // ── Step 4: Save user message (filename only — no document bytes) ────
      // WHY filename not content: preserves context in the conversation history
      // without storing any sensitive document text in the database.
      const userMessage = await Message.create({
        sessionId: session._id,
        userId,
        role: 'user',
        content: `📄 Uploaded legal notice for explanation.`,
        detectedLanguage,
      });

      // ── Step 5: Run analysis + legitimacy check in parallel ─────────────
      // WHY Promise.all: both calls use the same extracted text and are fully
      // independent. Total wait = max(t_analysis, t_legitimacy), not the sum.
      // The legitimacy check (JSON mode, shorter prompt) typically finishes
      // before the full analysis — so there is no latency cost.
      let analysis, legitimacyCheck;
      try {
        [analysis, legitimacyCheck] = await Promise.all([
          analyzeNotice(extractedText, detectedLanguage),
          checkLegitimacy(extractedText),
        ]);
      } catch (analysisErr) {
        logger.error('Notice analysis or legitimacy check error:', analysisErr);
        throw new AppError('Notice analysis service is temporarily unavailable. Please try again.', 503);
      }

      // ── Step 6: Save assistant message ───────────────────────────────────
      // legitimacyCheck is stored in ragMetadata so it can be retrieved when
      // loading chat history — without re-running the LLM check.
      const assistantMessage = await Message.create({
        sessionId: session._id,
        userId,
        role: 'assistant',
        content: analysis,
        detectedLanguage,
        ragMetadata: {
          isNoticeAnalysis: true,
          citations: [],
          confidenceScore: null,
          legitimacyCheck,
        },
        hasRepealedWarning: false,
      });

      // ── Step 7: Update session metadata + persist notice text for Q&A ──────
      ChatSession.findByIdAndUpdate(session._id, {
        language: detectedLanguage,
        lastMessageAt: new Date(),
        $inc: { messageCount: 2 },
        noticeContext: extractedText.slice(0, 8000),
      }).exec();

      // ── Step 8: Respond ──────────────────────────────────────────────────
      res.json({
        success: true,
        answer: analysis,
        detectedLanguage,
        sessionId: session._id,
        messageId: assistantMessage._id,
        isNoticeAnalysis: true,
        legitimacyCheck,
        disclaimer: 'This is an explanation of the notice only, not legal advice. Please consult a qualified lawyer.',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
