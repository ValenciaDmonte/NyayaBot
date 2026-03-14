/**
 * services/rag.js
 *
 * WHY: This is the heart of NyayaBot. The RAG (Retrieval Augmented Generation)
 * pipeline ensures the LLM answers ONLY from verified Indian law — never from
 * its training data.
 *
 * OPTIMIZED PIPELINE (5 improvements over naive RAG):
 *
 * OLD pipeline:  query → embed → pinecone(topK=5) → filter(≥0.72) → top3 → generate
 *
 * NEW pipeline:
 *   1. Detect language (unchanged)
 *   2. Query expansion: Groq rewrites casual query → formal legal language
 *      + generates 2 alternatives + detects explicit law mention
 *   3. Parallel embedding: embed primary + 2 alternatives simultaneously
 *   4. Multi-query retrieval: 3 parallel Pinecone searches, results fused
 *      (deduplicate by vectorId, keep best score per chunk)
 *      + metadata filter applied if law code detected
 *   5. Threshold filter: lowered 0.72 → 0.65 (re-ranker is now quality gate)
 *   6. LLM re-ranking: Groq scores each candidate 0-10 for true answer relevance
 *      → takes top 3 by re-rank score (not cosine similarity)
 *   7. Generate answer (unchanged)
 *   8. Format citations (unchanged)
 *
 * WHY these specific optimizations:
 * - Query expansion: closes the vocabulary gap between casual language and legal text
 * - Multi-query: covers multiple semantic angles of complex questions
 * - Metadata filter: when user says "under BNS", search only BNS vectors
 * - Lower threshold: re-ranking compensates for the extra candidates that pass at 0.65
 * - Re-ranking: cosine similarity ≠ answer relevance; re-ranker fixes this
 */

const { getEmbedding } = require('./gemini');
const { generateAnswer } = require('./groq');
const { querySimilarMulti } = require('./pinecone');
const { detectLanguage } = require('./languageDetector');
const { expandQuery } = require('./queryProcessor');
const { rankChunks } = require('./reranker');
const config = require('../config');
const logger = require('../utils/logger');

// Canned response when no relevant law is found above the threshold.
// WHY a canned response and not passing "no results" to the LLM:
// If we told the LLM "no context found, but answer anyway", it would answer
// from its training data — exactly what we're trying to prevent.
// Instead, we bypass the LLM entirely and return a pre-written honest response.
const NO_CONTEXT_RESPONSE = (language) => {
  const messages = {
    en: "I don't have verified legal information to answer this question. This may be because:\n1. The relevant law isn't in my database yet\n2. Your question may be outside Indian law scope\n\nPlease consult a qualified lawyer for guidance.\n\n⚠️ Note: This is not professional legal advice. Please consult a qualified lawyer for your specific situation.",
    hi: "मुझे इस प्रश्न का उत्तर देने के लिए सत्यापित कानूनी जानकारी नहीं है। कृपया एक योग्य वकील से परामर्श करें।\n\n⚠️ नोट: यह पेशेवर कानूनी सलाह नहीं है।",
    ta: "இந்த கேள்விக்கு சரிபார்க்கப்பட்ட சட்ட தகவல் என்னிடம் இல்லை. தயவுசெய்து ஒரு தகுதிவாய்ந்த வழக்கறிஞரை அணுகுங்கள்.\n\n⚠️ குறிப்பு: இது தொழில்முறை சட்ட ஆலோசனை அல்ல.",
    te: "ఈ ప్రశ్నకు సమాధానమివ్వడానికి నా వద్ద ధృవీకరించిన చట్టపరమైన సమాచారం లేదు. దయచేసి అర్హులైన న్యాయవాది సంప్రదించండి.\n\n⚠️ గమనిక: ఇది వృత్తిపరమైన న్యాయ సలహా కాదు.",
    bn: "এই প্রশ্নের উত্তর দেওয়ার জন্য আমার কাছে যাচাইকৃত আইনগত তথ্য নেই। একজন যোগ্য আইনজীবীর সাথে পরামর্শ করুন।\n\n⚠️ নোট: এটি পেশাদার আইনি পরামর্শ নয়।",
    mr: "या प्रश्नाचे उत्तर देण्यासाठी माझ्याकडे सत्यापित कायदेशीर माहिती नाही. कृपया एका पात्र वकिलाचा सल्ला घ्या.\n\n⚠️ टीप: हे व्यावसायिक कायदेशीर सल्ला नाही.",
    kn: "ಈ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸಲು ನನ್ನ ಬಳಿ ಪರಿಶೀಲಿಸಿದ ಕಾನೂನು ಮಾಹಿತಿ ಇಲ್ಲ. ದಯವಿಟ್ಟು ಅರ್ಹ ವಕೀಲರನ್ನು ಸಂಪರ್ಕಿಸಿ.\n\n⚠️ ಟಿಪ್ಪಣಿ: ಇದು ವೃತ್ತಿಪರ ಕಾನೂನು ಸಲಹೆ ಅಲ್ಲ.",
  };
  return messages[language] || messages.en;
};

/**
 * Run the full optimized RAG pipeline for a legal query.
 *
 * @param {string}   query                        - The user's legal question
 * @param {object}   options
 * @param {string}   options.userId               - MongoDB User ID
 * @param {string|null} options.languageOverride  - Manual language from UI
 * @param {string[]} options.conversationHistory  - Last 2 user messages (oldest first)
 * @returns {Promise<RAGResult>}
 */
async function runRAGPipeline(query, { languageOverride = null, conversationHistory = [], noticeContext = null } = {}) {
  const pipelineStart = Date.now();

  // ── Step 1: Language Detection ───────────────────────────────────────────
  const detectedLanguage = await detectLanguage(query, languageOverride);
  logger.debug(`Language detected: ${detectedLanguage}`);

  // ── Step 2: Query Expansion ──────────────────────────────────────────────
  // WHY here and not after embedding: we expand BEFORE embedding so the
  // vector space search operates on formal legal language, not casual text.
  const expansionStart = Date.now();
  const { primaryQuery, alternativeQueries, lawCodeHint } = await expandQuery(
    query,
    conversationHistory
  );
  logger.debug(`Query expansion: ${Date.now() - expansionStart}ms | lawHint: ${lawCodeHint || 'none'}`);

  // Build the Pinecone metadata filter if a specific law was detected
  // WHY: "under BNS what is section 103?" should search BNS vectors only —
  // otherwise Constitution's "103rd Amendment" chunks rank higher.
  const pineconeFilter = lawCodeHint ? { law_code: { $eq: lawCodeHint } } : null;

  // ── Step 3: Parallel Embedding ───────────────────────────────────────────
  // Embed the primary query + alternatives at the same time.
  // WHY Promise.all: three sequential Gemini calls would take ~900ms;
  // three parallel calls take only ~300ms (longest single call).
  const embedStart = Date.now();
  const allQueries = [primaryQuery, ...alternativeQueries];
  const embeddings = await Promise.all(
    allQueries.map((q) => getEmbedding(q, 'query'))
  );
  const queryEmbeddingMs = Date.now() - embedStart;

  // ── Step 4: Multi-Query Pinecone Search + Score Fusion ───────────────────
  // querySimilarMulti runs all searches in parallel and deduplicates results.
  // We request topK per query so that after deduplication we have enough
  // candidates to pass meaningful ones through the threshold filter.
  const pineconeStart = Date.now();
  const rawMatches = await querySimilarMulti(
    embeddings,
    config.pinecone.topK,
    pineconeFilter
  );
  const pineconeQueryMs = Date.now() - pineconeStart;

  logger.debug(
    `Multi-query Pinecone: ${rawMatches.length} unique candidates after fusion. ` +
    `Top score: ${rawMatches[0]?.score?.toFixed(3) || 'n/a'}`
  );

  // ── Step 5: Threshold Filter ─────────────────────────────────────────────
  // WHY 0.65 (not 0.72 like before):
  // The re-ranker in step 6 is now the quality gate. Lowering the threshold
  // lets more candidates through for re-ranking to evaluate, recovering
  // ~15% of valid queries that were previously rejected as "no match".
  const qualifiedMatches = rawMatches.filter(
    (m) => m.score >= config.pinecone.similarityThreshold
  );

  if (qualifiedMatches.length === 0) {
    logger.info(
      `No chunks above threshold (${config.pinecone.similarityThreshold}) ` +
      `for query: "${query.slice(0, 50)}..." — best score was ${rawMatches[0]?.score?.toFixed(3) || 'n/a'}`
    );
    return {
      answer: NO_CONTEXT_RESPONSE(detectedLanguage),
      detectedLanguage,
      citations: [],
      hasRepealedWarning: false,
      confidenceScore: rawMatches[0]?.score || 0,
      usedNoticeContext: !!noticeContext,
      timings: {
        queryEmbeddingMs,
        pineconeQueryMs,
        generationMs: 0,
        totalMs: Date.now() - pipelineStart,
      },
    };
  }

  // ── Step 6: LLM Re-Ranking ───────────────────────────────────────────────
  // Take up to expandedTopK candidates and let Groq score them by true
  // answer relevance (not just embedding closeness).
  // WHY pass originalQuery not primaryQuery: scoring against user's actual intent
  const rerankStart = Date.now();
  const candidates = qualifiedMatches.slice(0, config.pinecone.expandedTopK);
  const topChunks = await rankChunks(query, candidates, config.pinecone.rerankerTopN);
  logger.debug(`Re-ranking: ${Date.now() - rerankStart}ms | ${candidates.length} → ${topChunks.length} chunks`);

  // ── Step 7: Repealed Law Detection ───────────────────────────────────────
  const hasRepealedWarning = topChunks.some((m) => m.metadata?.is_repealed === true);
  if (hasRepealedWarning) {
    logger.info('Repealed law detected in matched chunks — warning will be shown');
  }

  // ── Step 8: Generate Answer ──────────────────────────────────────────────
  const generationStart = Date.now();
  const answer = await generateAnswer(query, topChunks, detectedLanguage, noticeContext);
  const generationMs = Date.now() - generationStart;

  const totalMs = Date.now() - pipelineStart;
  logger.info(
    `RAG pipeline complete in ${totalMs}ms ` +
    `(embed:${queryEmbeddingMs}ms, pinecone:${pineconeQueryMs}ms, gen:${generationMs}ms)`
  );

  // ── Step 9: Format Citations ──────────────────────────────────────────────
  const citations = topChunks.map((match) => ({
    vectorId: match.id,
    lawName: match.metadata?.law_name || 'Unknown',
    lawCode: match.metadata?.law_code || '',
    section: match.metadata?.section || '',
    sectionTitle: match.metadata?.section_title || '',
    lastAmended: match.metadata?.last_amended || '',
    sourceUrl: match.metadata?.source_url || '',
    isRepealed: match.metadata?.is_repealed || false,
    replacedBy: match.metadata?.replaced_by || null,
    replaces: match.metadata?.replaces || null,
    similarityScore: Math.round((match.score || 0) * 100) / 100,
  }));

  return {
    answer,
    detectedLanguage,
    citations,
    hasRepealedWarning,
    confidenceScore: topChunks[0]?.score || 0,
    usedNoticeContext: !!noticeContext,
    timings: {
      queryEmbeddingMs,
      pineconeQueryMs,
      generationMs,
      totalMs,
    },
  };
}

module.exports = { runRAGPipeline };
