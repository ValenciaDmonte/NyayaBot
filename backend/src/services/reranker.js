/**
 * services/reranker.js
 *
 * WHY re-ranking:
 * Cosine similarity measures embedding closeness, not answer relevance.
 * After multi-query retrieval we might have 10 candidates where:
 * - Rank 1 by cosine: chunk about "punishment for grievous hurt" (shares vocabulary)
 * - Rank 4 by cosine: chunk about "punishment for murder" (the actual answer)
 *
 * A re-ranker asks the LLM to score each chunk by how well it answers the
 * *specific question*. This re-orders the candidates by true relevance
 * before we pass them to the generation step.
 *
 * One Groq call, ~400ms. The fallback ensures re-ranker failures never
 * break the pipeline — we just return the original cosine-ranked order.
 */

const Groq = require('groq-sdk');
const config = require('../config');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: config.groq.apiKey });

/**
 * Re-rank candidate chunks by relevance to the original user question.
 *
 * WHY we pass originalQuery (not expandedQuery):
 * The re-ranker scores chunks against what the USER meant to ask, not the
 * rewritten version. This prevents penalising chunks that are highly
 * relevant to the user's intent but use different vocabulary from the
 * expanded query.
 *
 * WHY we truncate chunk text to 300 chars:
 * We're scoring up to 10 chunks × ~3200 chars each = 32,000 chars of input.
 * Groq 8b has 8192 token context. We only need enough text to judge
 * relevance — the first 300 chars of each chunk captures the main topic.
 *
 * @param {string} originalQuery - The user's original question (not rewritten)
 * @param {Array}  candidates    - Array of Pinecone match objects { id, score, metadata }
 * @param {number} topN          - How many top chunks to return
 * @returns {Promise<Array>}     - Top N chunks sorted by re-rank score (or cosine fallback)
 */
async function rankChunks(originalQuery, candidates, topN = 3) {
  if (candidates.length <= topN) {
    // Nothing to re-rank — return all as-is
    return candidates;
  }

  // Build the scoring prompt — each source is identified by array index
  const sourcesText = candidates
    .map((chunk, i) => {
      const text = chunk.metadata?.text || '';
      const lawName = chunk.metadata?.law_name || 'Unknown';
      const section = chunk.metadata?.section || '';
      // Truncate to 300 chars — we only need enough to judge relevance
      const preview = text.slice(0, 300).replace(/\s+/g, ' ').trim();
      return `Source ${i}: [${lawName}${section ? ` §${section}` : ''}]\n${preview}`;
    })
    .join('\n\n');

  const systemPrompt = `You are a legal relevance scorer. Score each source by how well it helps answer the user's question.
Output ONLY a JSON array of objects with "id" (the source number) and "score" (0-10).
10 = directly answers the question. 0 = completely irrelevant.
Example: [{"id":0,"score":9},{"id":1,"score":3},{"id":2,"score":7}]`;

  const userPrompt = `Question: ${originalQuery}\n\n${sourcesText}`;

  try {
    const completion = await groq.chat.completions.create({
      model: config.groq.generationModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,   // WHY 0: scoring should be deterministic
      max_tokens: 150,  // JSON array of 10 scores is <100 tokens
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '[]';

    // Groq json_object mode wraps arrays in an object — handle both cases
    let scoresRaw;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      scoresRaw = parsed;
    } else if (Array.isArray(parsed.scores)) {
      scoresRaw = parsed.scores;
    } else {
      // Find any array value in the returned object
      const arrVal = Object.values(parsed).find((v) => Array.isArray(v));
      scoresRaw = arrVal || [];
    }

    // Build a score map: { sourceIndex → score }
    const scoreMap = {};
    for (const entry of scoresRaw) {
      if (typeof entry.id === 'number' && typeof entry.score === 'number') {
        scoreMap[entry.id] = entry.score;
      }
    }

    // Sort candidates by re-rank score, fall back to cosine score if missing
    const reranked = candidates
      .map((chunk, i) => ({
        ...chunk,
        rerankScore: scoreMap[i] ?? chunk.score * 10, // normalise cosine to 0-10 scale
      }))
      .sort((a, b) => b.rerankScore - a.rerankScore);

    logger.debug(
      `Re-ranked ${candidates.length} candidates → top scores: ${reranked
        .slice(0, topN)
        .map((c) => c.rerankScore.toFixed(1))
        .join(', ')}`
    );

    return reranked.slice(0, topN);
  } catch (err) {
    // Graceful fallback — return the top N by original cosine score
    logger.warn(`Re-ranking failed, using cosine order: ${err.message}`);
    return candidates.slice(0, topN);
  }
}

module.exports = { rankChunks };
