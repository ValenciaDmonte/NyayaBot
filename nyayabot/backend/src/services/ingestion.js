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
 * RATE LIMIT HANDLING:
 * - getEmbeddingWithRetry() wraps getEmbedding with exponential backoff on 429
 * - Retry delays: 10s → 30s → 90s → 5min (covers transient quota exhaustion)
 *
 * CHECKPOINT / RESUME:
 * - Progress is saved to backend/data/checkpoints/{LAWCODE}.json every 50 chunks
 * - If the script is interrupted or hits a fatal 429, completed chunks are persisted
 * - On the next run, loadCheckpoint() returns the set of already-done indices and
 *   the loop skips them — so ingestion resumes exactly where it left off
 * - The checkpoint file is deleted on successful completion (clean run = no file)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const { getEmbedding } = require('./gemini');
const { upsertVectors } = require('./pinecone');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Retry config ──────────────────────────────────────────────────────────────
// Four escalating delays (ms) before giving up on a single embedding call.
// Covers short-term RPM bursts (10s) and daily quota resets (300s = 5 min wait,
// after which the API usually allows a few more requests before the next reset).
const RETRY_DELAYS_MS = [10_000, 30_000, 90_000, 300_000];

// ── Checkpoint config ─────────────────────────────────────────────────────────
const CHECKPOINT_DIR = path.join(__dirname, '../../data/checkpoints');
const BATCH_SIZE = 50; // Upsert to Pinecone + save checkpoint every N chunks

// ── Retry wrapper ─────────────────────────────────────────────────────────────
/**
 * Call getEmbedding with exponential backoff on 429 errors.
 * On non-429 errors, or after all retries are exhausted, propagates the error.
 */
async function getEmbeddingWithRetry(text, type) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await getEmbedding(text, type);
    } catch (err) {
      const is429 = err.message?.includes('429') || err.status === 429;
      if (is429 && attempt < RETRY_DELAYS_MS.length) {
        const wait = RETRY_DELAYS_MS[attempt];
        process.stdout.write(
          `\n     ⏳ Gemini 429 — waiting ${wait / 1000}s before retry (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})...\n`
        );
        await sleep(wait);
      } else {
        throw err; // Non-429 or all retries exhausted
      }
    }
  }
}

// ── Checkpoint helpers ────────────────────────────────────────────────────────

/**
 * Load the set of already-processed chunk indices from disk.
 * Returns an empty Set if no checkpoint file exists (fresh run).
 */
function loadCheckpoint(lawCode) {
  const file = path.join(CHECKPOINT_DIR, `${lawCode}.json`);
  if (!fs.existsSync(file)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return new Set(data.done || []);
  } catch {
    return new Set();
  }
}

/**
 * Persist the current set of processed chunk indices to disk.
 * Called after every batch upsert so progress survives crashes.
 */
function saveCheckpoint(lawCode, doneSet) {
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(CHECKPOINT_DIR, `${lawCode}.json`),
    JSON.stringify({ lawCode, done: [...doneSet], savedAt: new Date().toISOString() })
  );
}

/**
 * Delete the checkpoint file on successful completion.
 * A clean run (no failures) leaves no checkpoint behind.
 */
function clearCheckpoint(lawCode) {
  const file = path.join(CHECKPOINT_DIR, `${lawCode}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

// ── PDF parsing ───────────────────────────────────────────────────────────────

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
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    text: data.text,
    numPages: data.numpages,
    hash,
  };
}

// ── Text preprocessing ────────────────────────────────────────────────────────

/**
 * Clean up raw PDF text:
 * - Remove page numbers (patterns like "\n42\n" or "Page 42 of 500")
 * - Normalise whitespace
 * - Remove common OCR artifacts
 */
function preprocessText(rawText) {
  return rawText
    .replace(/\n\s*\d+\s*\n/g, '\n')         // Remove standalone page numbers
    .replace(/Page\s+\d+\s+of\s+\d+/gi, '')   // Remove "Page X of Y"
    .replace(/\r\n/g, '\n')                    // Normalise line endings
    .replace(/[ \t]{2,}/g, ' ')               // Collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n')               // Max 2 consecutive newlines
    .trim();
}

// ── Chunker ───────────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks for embedding.
 *
 * WHY overlap: If a legal concept spans two chunks, overlap ensures it
 * appears fully in at least one chunk.
 */
function chunkText(text, maxChunkSize = 3200, overlap = 400) {
  const chunks = [];

  const sectionRegex = /\n\s*(\d+[A-Z]?)\.\s+/g;
  const parts = text.split(sectionRegex);

  for (let i = 1; i < parts.length; i += 2) {
    const sectionNumber = parts[i];
    const sectionContent = parts[i + 1] || '';
    const sectionText = `Section ${sectionNumber}. ${sectionContent.trim()}`;

    if (sectionText.length <= maxChunkSize) {
      chunks.push(sectionText);
      continue;
    }

    let start = 0;
    while (start < sectionText.length) {
      let end = start + maxChunkSize;
      if (end < sectionText.length) {
        const breakPoint =
          sectionText.lastIndexOf('\n\n', end) ||
          sectionText.lastIndexOf('. ', end);
        if (breakPoint > start + maxChunkSize / 2) end = breakPoint + 1;
      }
      chunks.push(sectionText.slice(start, end).trim());
      start = end - overlap;
    }
  }

  return chunks;
}

// ── Vector ID ─────────────────────────────────────────────────────────────────

/**
 * Build a deterministic, structured vector ID.
 * Format: "{LAW_CODE}_chunk_{index}_{year}"
 *
 * WHY deterministic: Upserting with the same ID replaces existing vectors —
 * no duplicates when re-ingesting amended laws.
 */
function buildVectorId(lawCode, chunkIndex, year) {
  return `${lawCode}_chunk_${chunkIndex}_${year}`;
}

// ── Main ingestion pipeline ───────────────────────────────────────────────────

/**
 * Main ingestion pipeline for one law document.
 * Called by both ingestAll.js (manual) and lawUpdateCron.js (automated).
 *
 * Behaviour on failure:
 *   - 429 errors → retried with exponential backoff (up to 5 min wait)
 *   - Persistent 429 → throws, but already-upserted batches stay in Pinecone
 *     and the checkpoint file preserves which chunks were done, so the next
 *     run resumes without re-embedding completed chunks
 *
 * @param {object} docConfig
 * @param {string}   docConfig.filePath
 * @param {string}   docConfig.lawCode
 * @param {string}   docConfig.lawName
 * @param {number}   docConfig.year
 * @param {boolean}  docConfig.isRepealed
 * @param {string}   docConfig.replacedBy
 * @param {string}   docConfig.replaces
 * @param {string}   docConfig.sourceUrl
 * @param {string}   docConfig.lastAmended
 * @param {function} docConfig.onProgress  Callback(done, total)
 * @returns {Promise<{chunksCreated, vectorsUpserted, hash}>}
 */
async function ingestDocument(docConfig) {
  const {
    filePath,
    lawCode,
    lawName,
    year,
    isRepealed  = false,
    replacedBy  = null,
    replaces    = null,
    sourceUrl   = '',
    lastAmended = '',
    onProgress  = () => {},
  } = docConfig;

  logger.info(`Starting ingestion: ${lawName} (${lawCode})`);

  // Step 1: Parse PDF
  const { text: rawText, numPages, hash } = await parsePDF(filePath);
  logger.info(`Parsed PDF: ${numPages} pages, ${rawText.length} chars`);

  // Step 2: Preprocess
  const cleanText = preprocessText(rawText);

  // Step 3: Chunk
  const chunks = chunkText(cleanText);
  const totalChunks = chunks.length;
  logger.info(`Created ${totalChunks} chunks for ${lawCode}`);

  // Step 4: Load checkpoint (resume support)
  const done = loadCheckpoint(lawCode);
  const skipped = done.size;
  if (skipped > 0) {
    logger.info(`Resuming ${lawCode}: skipping ${skipped} already-embedded chunks`);
    process.stdout.write(`\n     ↩  Checkpoint found — resuming from chunk ${skipped} (${totalChunks - skipped} remaining)\n`);
  }

  // Step 5: Embed + upsert in batches of BATCH_SIZE
  let processedCount = skipped; // Start progress counter from where we left off
  let vectorsUpserted = 0;
  let batch = [];

  for (let i = 0; i < chunks.length; i++) {
    // Skip chunks already processed in a previous run.
    // processedCount already starts at `skipped`, so don't increment here — that would double-count.
    if (done.has(i)) continue;

    // Embed with retry on 429
    const embedding = await getEmbeddingWithRetry(chunks[i], 'document');

    // Throttle: stay well within Gemini free-tier RPM
    await sleep(1200);

    batch.push({
      id: buildVectorId(lawCode, i, year),
      values: embedding,
      metadata: {
        law_name:     lawName,
        law_code:     lawCode,
        last_amended: lastAmended,
        source_url:   sourceUrl,
        is_repealed:  isRepealed,
        replaced_by:  replacedBy,
        replaces:     replaces,
        chunk_index:  i,
        total_chunks: totalChunks,
        text_preview: chunks[i].slice(0, 200),
        text:         chunks[i],
      },
    });

    done.add(i);
    processedCount++;
    onProgress(processedCount, totalChunks);

    // Flush to Pinecone + save checkpoint every BATCH_SIZE chunks
    const isLastChunk = i === chunks.length - 1;
    if (batch.length >= BATCH_SIZE || isLastChunk) {
      await upsertVectors(batch);
      vectorsUpserted += batch.length;
      saveCheckpoint(lawCode, done); // Persist progress after every flush
      batch = [];
    }
  }

  // Step 6: Clean up checkpoint on full success
  clearCheckpoint(lawCode);
  logger.info(`Upserted ${vectorsUpserted} vectors for ${lawCode}`);

  return {
    chunksCreated:   totalChunks,
    vectorsUpserted,
    hash,
  };
}

module.exports = {
  parsePDF,
  preprocessText,
  chunkText,
  buildVectorId,
  ingestDocument,
};
