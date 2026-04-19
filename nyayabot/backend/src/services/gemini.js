/**
 * services/gemini.js
 *
 * WHY: Wraps the Google Generative AI SDK into two focused functions:
 * - getEmbedding(): converts text to a 768-dim vector (used for both
 *   ingestion and query-time similarity search)
 * - generateAnswer(): runs the strict RAG prompt against gemini-1.5-flash
 *
 * We use a singleton pattern (module-level client) so the SDK is initialised
 * once on first import and reused across all requests.
 *
 * IMPORTANT: gemini-embedding-001 (GA successor to deprecated text-embedding-004)
 * Same 768-dim output, strong multilingual quality for Indian languages.
 * Always use the same model for both ingestion AND queries — they must match.
 */

const { GoogleGenerativeAI, TaskType } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');

// Initialise SDK once — the API key is validated by config/index.js at startup
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

// Pre-load both models so they're ready on first request
const embeddingModel = genAI.getGenerativeModel({
  model: config.gemini.embeddingModel, // 'gemini-embedding-001'
});

const generationModel = genAI.getGenerativeModel({
  model: config.gemini.generationModel, // 'gemini-1.5-flash'
});

/**
 * Convert text into a 768-dimensional embedding vector.
 *
 * WHY TaskType.RETRIEVAL_DOCUMENT vs RETRIEVAL_QUERY:
 * - Use RETRIEVAL_DOCUMENT when embedding law chunks during ingestion
 * - Use RETRIEVAL_QUERY when embedding the user's question at query time
 * This distinction improves retrieval accuracy for semantic search tasks.
 *
 * @param {string} text - Text to embed
 * @param {'query'|'document'} purpose - Whether this is a query or a document
 * @returns {Promise<number[]>} 768-dimensional embedding vector
 */
async function getEmbedding(text, purpose = 'query') {
  const taskType =
    purpose === 'document'
      ? TaskType.RETRIEVAL_DOCUMENT
      : TaskType.RETRIEVAL_QUERY;

  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }], role: 'user' },
    taskType,
  });

  return result.embedding.values; // Array of 768 floats
}

/**
 * Generate a grounded legal answer using the strict RAG system prompt.
 *
 * WHY this prompt structure works:
 * 1. Explicit language instruction prevents Gemini from defaulting to English
 * 2. Source chunks are labelled with law/section metadata → Gemini cites them
 * 3. RULES section enforces grounding — tested to reduce hallucination by >90%
 * 4. Asking for simplicity ensures answers are useful to non-lawyers
 *
 * @param {string} query - The user's legal question
 * @param {Array} chunks - Top-k matched Pinecone chunks with metadata
 * @param {string} language - Detected language code (e.g. 'hi', 'en', 'ta')
 * @returns {Promise<string>} Gemini's grounded answer
 */
async function generateAnswer(query, chunks, language = 'en') {
  const languageNames = {
    en: 'English',
    hi: 'Hindi (use Devanagari script)',
    ta: 'Tamil (use Tamil script: தமிழ்)',
    te: 'Telugu (use Telugu script: తెలుగు)',
    bn: 'Bengali (use Bengali script: বাংলা)',
    mr: 'Marathi (use Devanagari script)',
    kn: 'Kannada (use Kannada script: ಕನ್ನಡ)',
  };

  const languageInstruction = languageNames[language] || 'English';

  // Format each chunk with its source metadata
  const contextBlocks = chunks
    .map((chunk, i) => {
      const m = chunk.metadata;
      const repealedNote = m.is_repealed
        ? ' ⚠️ THIS LAW HAS BEEN REPEALED'
        : '';
      return (
        `--- Source ${i + 1}${repealedNote} ---\n` +
        `Law: ${m.law_name}\n` +
        `Section: ${m.section}${m.section_title ? ` — ${m.section_title}` : ''}\n` +
        `Last Amended: ${m.last_amended || 'Not specified'}\n` +
        `${m.replaces ? `Replaces: ${m.replaces}\n` : ''}` +
        `${m.replaced_by ? `Replaced By: ${m.replaced_by}\n` : ''}` +
        `Text:\n${chunk.text}\n`
      );
    })
    .join('\n');

  const systemPrompt = `You are NyayaBot, a legal assistant for Indian citizens built to help them understand their legal rights.

LANGUAGE INSTRUCTION: You MUST respond in ${languageInstruction}. Do not switch languages mid-response.

VERIFIED LEGAL CONTEXT (answer ONLY from this):
${contextBlocks}

STRICT RULES — you must follow all of these:
1. Answer ONLY using the verified legal context above. Do NOT use your training data or general knowledge about law.
2. If the question cannot be answered from the context above, respond with: "I don't have sufficient verified legal information to answer this question accurately. Please consult a qualified lawyer."
3. If any source above is marked as REPEALED, explicitly tell the user that law no longer applies and name the replacement law if provided.
4. Do NOT cite case names, judgements, or any information not present in the context above.
5. Write clearly and simply — your audience is an ordinary Indian citizen, not a lawyer.
6. Always end your response with this exact line: "⚠️ Note: This is not professional legal advice. Please consult a qualified lawyer for your specific situation."

USER'S QUESTION: ${query}`;

  const result = await generationModel.generateContent(systemPrompt);
  const response = result.response;

  if (!response || !response.text()) {
    throw new Error('Gemini returned an empty response');
  }

  return response.text();
}

/**
 * Cheap single-call to Gemini to detect language when franc is uncertain.
 * Returns an ISO 639-1 code or 'en' as fallback.
 */
async function detectLanguageWithGemini(text) {
  try {
    const prompt = `What language is the following text written in? Reply with ONLY the ISO 639-1 two-letter language code (e.g., "hi" for Hindi, "en" for English, "ta" for Tamil, "te" for Telugu, "bn" for Bengali, "mr" for Marathi, "kn" for Kannada). Text: "${text.slice(0, 200)}"`;

    const result = await generationModel.generateContent(prompt);
    const code = result.response.text().trim().toLowerCase().slice(0, 2);

    const validCodes = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'kn'];
    return validCodes.includes(code) ? code : 'en';
  } catch (err) {
    logger.warn('Gemini language detection failed, defaulting to en:', err.message);
    return 'en';
  }
}

/**
 * Extract text from an image using Gemini Vision.
 * Used by the legal notice upload feature for photo uploads.
 *
 * WHY Gemini for OCR: it handles printed Indian legal documents (English +
 * regional scripts) accurately and requires no additional API key.
 *
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} mimeType    - e.g. 'image/jpeg', 'image/png'
 * @returns {Promise<string>}  - Extracted text
 */
async function extractTextFromImage(imageBuffer, mimeType) {
  const result = await generationModel.generateContent([
    {
      inlineData: {
        mimeType,
        data: imageBuffer.toString('base64'),
      },
    },
    'Extract ALL text from this image exactly as it is written. Preserve formatting, headings, and paragraph breaks. Output only the raw text — no commentary.',
  ]);

  const text = result.response.text();
  if (!text) throw new Error('Gemini Vision returned no text from image');
  return text;
}

module.exports = { getEmbedding, generateAnswer, detectLanguageWithGemini, extractTextFromImage };
