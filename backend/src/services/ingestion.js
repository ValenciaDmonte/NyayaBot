/**
 * services/ingestion.js
 *
 * WHY: This module is shared between the one-time ingestAll.js script AND the
 * nightly cron job. Keeping the core logic here avoids code duplication and
 * means improvements (e.g., better chunking) automatically apply everywhere.
 *
 * Pipeline:
 * 1. parsePDF() — extract raw text from PDF using pdf-parse
 * 2. preprocessText() — clean OCR artifacts, normalise whitespace
 * 3. chunkText() — sliding window chunker with overlap
 * 4. buildVectorId() — deterministic, structured ID for each chunk
 * 5. ingestDocument() — orchestrates the full pipeline for one law document
 *
 * Concurrency: We use p-limit to cap Gemini embedding calls at 5 concurrent
 * requests. WHY: Gemini free tier = 60 requests/minute. Without throttling,
 * embedding 500 chunks in parallel would hit rate limits and fail.
 */

const fs = require('fs');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const pLimit = require('p-limit');
const { getEmbedding } = require('./gemini');
const { upsertVectors } = require('./pinecone');
const logger = require('../utils/logger');

// Max 5 concurrent Gemini embedding calls during ingestion
const embeddingLimit = pLimit(1);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/**
 * Parse a PDF file and return the raw text content.
 *
 * @param {string|Buffer} source - Absolute path to the PDF, or a raw Buffer
 *   (Buffer path is used by the legal-notice upload route which holds the file
 *   in memory via multer memoryStorage — never written to disk).
 * @returns {Promise<{text: string, numPages: number, hash: string}>}
 */
async function parsePDF(source) {
  const buffer = Buffer.isBuffer(source) ? source : fs.readFileSync(source);
  const data = await pdfParse(buffer, {
    // Preserve paragraph breaks — important for section detection
    pagerender: null,
  });

  // Compute SHA-256 hash of the raw PDF bytes
  // WHY: Used by the cron job to detect if a law has been amended
  // (compare hash vs stored hash from last SyncLog)
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    text: data.text,
    numPages: data.numpages,
    hash,
  };
}

/**
 * Clean up raw PDF text:
 * - Remove page numbers (patterns like "\n42\n" or "Page 42 of 500")
 * - Normalise whitespace
 * - Remove common OCR artifacts
 *
 * WHY: Government PDF OCR often has extra spaces, garbled characters,
 * and page number interruptions that confuse the chunker.
 */
function preprocessText(rawText) {
  return rawText
    .replace(/\n\s*\d+\s*\n/g, '\n') // Remove standalone page numbers
    .replace(/Page\s+\d+\s+of\s+\d+/gi, '') // Remove "Page X of Y"
    .replace(/\r\n/g, '\n') // Normalise line endings
    .replace(/[ \t]{2,}/g, ' ') // Collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();
}

/**
 * Split text into overlapping chunks for embedding.
 *
 * WHY overlap: If a legal concept spans two chunks, overlap ensures it
 * appears fully in at least one chunk. Without overlap, questions about
 * content near chunk boundaries might miss the relevant text.
 *
 * @param {string} text - Preprocessed document text
 * @param {number} chunkSize - Target characters per chunk (~800 tokens ≈ 3200 chars)
 * @param {number} overlap - Overlap characters between consecutive chunks
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, chunkSize = 3200, overlap = 600) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      // Try to break at a sentence boundary (period + newline or double newline)
      // WHY: Cutting mid-sentence makes chunks harder to understand
      const sentenceBreak = text.lastIndexOf('\n\n', end);
      const periodBreak = text.lastIndexOf('. ', end);
      const breakPoint = Math.max(sentenceBreak, periodBreak);

      if (breakPoint > start + chunkSize / 2) {
        end = breakPoint + 1; // Include the break character
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 100) { // Skip very short chunks (likely page headers)
      chunks.push(chunk);
    }

    start = end - overlap; // Overlap with previous chunk
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Build a deterministic, structured vector ID.
 *
 * Format: "{LAW_CODE}_chunk_{index}_{year}"
 * e.g. "BNS_chunk_42_2024"
 *
 * WHY deterministic IDs: When we re-ingest an amended law, upserting with
 * the same IDs REPLACES existing vectors — no duplicates, clean updates.
 * WHY include year: distinguishes BNS 2024 from any future amendment.
 *
 * @param {string} lawCode - e.g. 'BNS', 'RTI'
 * @param {number} chunkIndex - 0-based index of this chunk
 * @param {number} year - Year of the law
 * @returns {string} Vector ID
 */
function buildVectorId(lawCode, chunkIndex, year) {
  return `${lawCode}_chunk_${chunkIndex}_${year}`;
}

/**
 * Main ingestion pipeline for one law document.
 * Called by both ingestAll.js (manual) and lawUpdateCron.js (automated).
 *
 * @param {object} docConfig - Configuration for this document
 * @param {string} docConfig.filePath - Path to the PDF
 * @param {string} docConfig.lawCode - Short code e.g. 'BNS'
 * @param {string} docConfig.lawName - Full name e.g. 'Bharatiya Nyaya Sanhita 2023'
 * @param {number} docConfig.year - Year of the law
 * @param {boolean} docConfig.isRepealed - Whether this law is repealed
 * @param {string|null} docConfig.replacedBy - What replaced this law (if repealed)
 * @param {string|null} docConfig.replaces - What this law replaces
 * @param {string} docConfig.sourceUrl - Official source URL
 * @param {string} docConfig.lastAmended - ISO date of last amendment
 * @param {function} docConfig.onProgress - Callback(done, total) for progress reporting
 * @returns {Promise<{chunksCreated, vectorsUpserted, hash}>}
 */
async function ingestDocument(docConfig) {
  const {
    filePath,
    lawCode,
    lawName,
    year,
    isRepealed = false,
    replacedBy = null,
    replaces = null,
    sourceUrl = '',
    lastAmended = '',
    onProgress = () => {},
  } = docConfig;

  logger.info(`Starting ingestion: ${lawName} (${lawCode})`);

  // Step 1: Parse PDF
  const { text: rawText, numPages, hash } = await parsePDF(filePath);
  logger.info(`Parsed PDF: ${numPages} pages, ${rawText.length} characters`);

  // Step 2: Preprocess
  const cleanText = preprocessText(rawText);

  // Step 3: Chunk
  const chunks = chunkText(cleanText);
  logger.info(`Created ${chunks.length} chunks for ${lawCode}`);

  // Step 4: Embed + prepare vectors (with concurrency limit)
  const totalChunks = chunks.length;
  let processedCount = 0;

  const vectorPromises = chunks.map((chunkText, i) =>
    embeddingLimit(async () => {
      const embedding = await getEmbedding(chunkText, 'document');
      await sleep(1200); // avoid Gemini rate limits

      const vector = {
        id: buildVectorId(lawCode, i, year),
        values: embedding,
        metadata: {
          law_name: lawName,
          law_code: lawCode,
          last_amended: lastAmended,
          source_url: sourceUrl,
          is_repealed: isRepealed,
          replaced_by: replacedBy,
          replaces: replaces,
          chunk_index: i,
          total_chunks: totalChunks,
          // First 200 chars as preview for debugging
          text_preview: chunkText.slice(0, 200),
          // Store the full chunk text so we can pass it to the LLM as context
          text: chunkText,
        },
      };

      processedCount++;
      onProgress(processedCount, totalChunks);
      return vector;
    })
  );

  const vectors = await Promise.all(vectorPromises);

  // Step 5: Upsert to Pinecone in batches
  await upsertVectors(vectors);
  logger.info(`Upserted ${vectors.length} vectors for ${lawCode}`);

  return {
    chunksCreated: chunks.length,
    vectorsUpserted: vectors.length,
    hash, // Return hash so SyncLog can store it for amendment detection
  };
}

module.exports = {
  parsePDF,
  preprocessText,
  chunkText,
  buildVectorId,
  ingestDocument,
};
