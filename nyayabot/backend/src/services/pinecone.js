/**
 * services/pinecone.js
 *
 * WHY: Abstracts all Pinecone operations behind a clean interface.
 * Routes and the RAG service never touch the Pinecone SDK directly —
 * they call these functions. This makes testing easy (mock this module)
 * and lets us swap vector DBs without touching the RAG pipeline.
 *
 * Namespace strategy:
 * dev namespace in development, prod in production.
 * WHY: Pinecone free tier gives 1 index. Namespaces act as logical
 * partitions — dev ingestion never overwrites production vectors.
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const config = require('../config');
const logger = require('../utils/logger');

let pineconeIndex = null; // Singleton — initialised once

/**
 * Initialise Pinecone client and connect to the index.
 * Called once at server startup (server.js).
 * Subsequent calls return the cached index.
 */
async function initPinecone() {
  if (pineconeIndex) return pineconeIndex;

  const pc = new Pinecone({ apiKey: config.pinecone.apiKey });
  pineconeIndex = pc.index(config.pinecone.index).namespace(config.pinecone.namespace);

  logger.info(`Pinecone connected — index: ${config.pinecone.index}, namespace: ${config.pinecone.namespace}`);
  return pineconeIndex;
}

/**
 * Get the initialised index (throws if not yet initialised).
 * Internal helper — not exported.
 */
function getIndex() {
  if (!pineconeIndex) throw new Error('Pinecone not initialised. Call initPinecone() first.');
  return pineconeIndex;
}

/**
 * Upsert vectors into Pinecone.
 * Used during ingestion. Upsert = insert OR update by ID.
 * WHY upsert not insert: running ingestion twice won't create duplicates.
 *
 * @param {Array<{id: string, values: number[], metadata: object}>} vectors
 */
async function upsertVectors(vectors) {
  const index = getIndex();

  // Pinecone free tier recommends batches of ≤100 vectors per request
  const BATCH_SIZE = 100;
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await index.upsert(batch);
    logger.debug(`Upserted vectors ${i + 1}–${Math.min(i + BATCH_SIZE, vectors.length)} of ${vectors.length}`);
  }
}

/**
 * Query Pinecone for the top-k most similar vectors.
 * Used at query time in the RAG pipeline.
 *
 * @param {number[]} embedding - 768-dim query vector
 * @param {number} topK - Number of results to return
 * @param {object} filter - Optional metadata filter (e.g. {is_repealed: false})
 * @returns {Promise<Array>} Array of matches with id, score, metadata
 */
async function querySimilar(embedding, topK = 5, filter = null) {
  const index = getIndex();

  const queryRequest = {
    vector: embedding,
    topK,
    includeMetadata: true, // We need metadata for citations
    includeValues: false, // Don't return the raw vectors (saves bandwidth)
  };

  if (filter) queryRequest.filter = filter;

  const result = await index.query(queryRequest);
  return result.matches || [];
}

/**
 * Delete all vectors matching a given law code.
 * Used by the cron job before re-ingesting an amended law.
 * WHY: We must delete old vectors before upserting new ones to prevent
 * stale section text from remaining in the index.
 *
 * @param {string} lawCode - e.g. 'BNS', 'RTI'
 */
async function deleteByLawCode(lawCode) {
  const index = getIndex();

  // Pinecone supports metadata-based deletion via deleteMany
  await index.deleteMany({ law_code: { $eq: lawCode } });
  logger.info(`Deleted all vectors for law_code: ${lawCode}`);
}

/**
 * Run multiple Pinecone queries in parallel and fuse their results.
 *
 * WHY multi-query:
 * For a complex question like "Can I get bail AND what is the theft punishment?",
 * a single embedding only retrieves chunks most similar to the dominant topic.
 * Running 3 parallel searches (primary + 2 alternatives from queryProcessor)
 * covers different semantic angles and unions the result set.
 *
 * Fusion strategy: deduplicate by vectorId, keep the BEST score per unique chunk.
 * This ensures a chunk found by multiple queries isn't counted twice, but its
 * highest relevance score is preserved.
 *
 * @param {number[][]} embeddings - Array of 768-dim query vectors
 * @param {number}     topK       - How many results per individual query
 * @param {object}     filter     - Optional metadata filter applied to all queries
 * @returns {Promise<Array>}      - Deduplicated, score-sorted matches
 */
async function querySimilarMulti(embeddings, topK = 5, filter = null) {
  if (embeddings.length === 0) return [];
  if (embeddings.length === 1) return querySimilar(embeddings[0], topK, filter);

  // Run all searches in parallel — no serial waiting
  const allResults = await Promise.all(
    embeddings.map((embedding) => querySimilar(embedding, topK, filter))
  );

  // Flatten and deduplicate: keep the highest score per unique vector ID
  const bestByIdMap = new Map();
  for (const matches of allResults) {
    for (const match of matches) {
      const existing = bestByIdMap.get(match.id);
      if (!existing || match.score > existing.score) {
        bestByIdMap.set(match.id, match);
      }
    }
  }

  // Return sorted by score descending
  return Array.from(bestByIdMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * Get index statistics (total vector count, dimensions).
 * Used by the admin /stats endpoint.
 */
async function getIndexStats() {
  const pc = new Pinecone({ apiKey: config.pinecone.apiKey });
  const index = pc.index(config.pinecone.index);
  return await index.describeIndexStats();
}

module.exports = {
  initPinecone,
  upsertVectors,
  querySimilar,
  querySimilarMulti,
  deleteByLawCode,
  getIndexStats,
};
