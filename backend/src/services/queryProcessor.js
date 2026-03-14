/**
 * services/queryProcessor.js
 *
 * WHY this exists:
 * The core problem with naive RAG is the vocabulary gap. A user asking
 * "my landlord locked me out what do i do" embeds very differently from
 * the legal text "forcible eviction without due process, tenant rights under
 * Transfer of Property Act". The cosine similarity is low even though
 * the answer is clearly in the database.
 *
 * This module solves that by:
 * 1. Rewriting the casual query into formal Indian legal terminology (bridges gap)
 * 2. Generating 2 alternative phrasings (covers more of the semantic space)
 * 3. Detecting if a specific law was mentioned (enables Pinecone metadata filter)
 * 4. Injecting the last 2 user messages as context (resolves follow-up questions)
 *
 * All of this happens in ONE Groq call (~400ms) before we even embed anything.
 */

const Groq = require('groq-sdk');
const config = require('../config');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: config.groq.apiKey });

/**
 * Map of query keywords → Pinecone law_code values.
 *
 * WHY map IPC→BNS and CrPC→BNSS:
 * IPC was repealed and replaced by BNS in 2023. Users commonly still ask
 * "under IPC section 302" — we redirect them to the correct ingested law.
 * Same for CrPC → BNSS. This is pure regex, instant, no LLM call.
 */
const LAW_CODE_MAP = {
  BNS: 'BNS',
  BNSS: 'BNSS',
  IPC: 'BNS',        // IPC repealed → BNS is the replacement in our index
  CrPC: 'BNSS',      // CrPC repealed → BNSS is the replacement in our index
  CRPC: 'BNSS',
  RTI: 'RTI',
  CPA: 'CPA',
  CONSTITUTION: 'CONSTITUTION',
};

/**
 * Pure regex law code detection — no LLM call, instant.
 *
 * @param {string} query
 * @returns {string|null} Pinecone law_code value, or null if no specific law mentioned
 */
function detectLawCode(query) {
  const upper = query.toUpperCase();

  // Order matters — check longer codes first to avoid partial matches
  const patterns = [
    { pattern: /\bBNSS\b/, code: 'BNSS' },
    { pattern: /\bBNS\b/, code: 'BNS' },
    { pattern: /\bCRPC\b|\bCR\.P\.C\b/, code: 'BNSS' },
    { pattern: /\bIPC\b|\bI\.P\.C\b/, code: 'BNS' },
    { pattern: /\bRTI\b/, code: 'RTI' },
    { pattern: /\bCPA\b|\bCONSUMER PROTECTION\b/, code: 'CPA' },
    { pattern: /\bCONSTITUTION\b/, code: 'CONSTITUTION' },
  ];

  for (const { pattern, code } of patterns) {
    if (pattern.test(upper)) {
      return code;
    }
  }

  return null;
}

/**
 * Use Groq to rewrite the user query into formal legal terminology and
 * generate 2 alternative search phrasings. Also incorporates conversation
 * history so follow-up questions are resolved into self-contained queries.
 *
 * WHY JSON output mode:
 * We need structured data (primaryQuery + array). JSON mode guarantees
 * parseable output without regex heuristics on free-form text.
 *
 * Falls back gracefully: if Groq fails or JSON is malformed, we return
 * the original query unchanged so the pipeline still works — just without
 * the vocabulary bridging benefit.
 *
 * @param {string} query - The user's original question
 * @param {string[]} conversationHistory - Last 2 user messages (oldest first)
 * @returns {Promise<{primaryQuery: string, alternativeQueries: string[], lawCodeHint: string|null}>}
 */
async function expandQuery(query, conversationHistory = []) {
  // First: regex-detect law code from the ORIGINAL query (before rewriting)
  // WHY before rewriting: the LLM might strip the explicit law mention
  const lawCodeHint = detectLawCode(query);

  // Build conversation context string if history exists
  const contextSection =
    conversationHistory.length > 0
      ? `\nPrevious messages in this conversation (for context only, do NOT answer them):\n${conversationHistory.map((m, i) => `[${i + 1}] ${m}`).join('\n')}\n`
      : '';

  const systemPrompt = `You are a legal search query optimizer for Indian law. Your job is to transform casual user questions into formal legal terminology that matches how Indian law is written in official documents.

Output ONLY valid JSON in this exact format, nothing else:
{
  "primaryQuery": "the rewritten formal legal query",
  "alternativeQueries": ["alternative phrasing 1", "alternative phrasing 2"]
}

Rules:
- primaryQuery: Rewrite the question using formal Indian legal language, section references, and legal concepts. Use Indian law terminology (e.g., "cognizable offence", "non-bailable", "FIR", "writ of habeas corpus").
- alternativeQueries: 2 different phrasings covering different angles of the same legal question.
- If the current question is a follow-up (uses "that", "it", "this", "same"), use the conversation context to make it self-contained.
- Keep each query under 50 words.
- Do NOT answer the question. Only rewrite it for search.`;

  const userPrompt = `${contextSection}Current question: ${query}`;

  try {
    const completion = await groq.chat.completions.create({
      model: config.groq.generationModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 200,
      // WHY response_format: Groq supports JSON mode which guarantees parseable output
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    const primaryQuery =
      typeof parsed.primaryQuery === 'string' && parsed.primaryQuery.trim()
        ? parsed.primaryQuery.trim()
        : query; // fallback to original

    const alternativeQueries = Array.isArray(parsed.alternativeQueries)
      ? parsed.alternativeQueries.filter((q) => typeof q === 'string' && q.trim()).slice(0, 2)
      : [];

    logger.debug(`Query expanded: "${query.slice(0, 50)}" → "${primaryQuery.slice(0, 50)}"`);
    if (alternativeQueries.length) {
      logger.debug(`Alternative queries: ${alternativeQueries.length}`);
    }

    return { primaryQuery, alternativeQueries, lawCodeHint };
  } catch (err) {
    // Graceful degradation — the pipeline still works, just without query rewriting
    logger.warn(`Query expansion failed, using original query: ${err.message}`);
    return { primaryQuery: query, alternativeQueries: [], lawCodeHint };
  }
}

module.exports = { expandQuery, detectLawCode };
