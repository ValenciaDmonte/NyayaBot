/**
 * jobs/lawUpdateCron.js
 *
 * WHY: Indian law changes. The Bharatiya Nyaya Sanhita itself replaced the
 * IPC in 2024. Without a nightly check, NyayaBot could give outdated answers.
 *
 * Schedule: 2:00 AM IST daily (UTC+5:30 → 20:30 UTC previous day)
 *
 * Amendment detection strategy:
 * We download each law PDF and compute its SHA-256 hash. If the hash
 * differs from what we stored in the last successful SyncLog, the law has
 * been updated and we re-ingest it.
 * WHY SHA-256 over HTTP Last-Modified: Indian government sites often don't
 * send accurate Last-Modified headers. Content hashing is more reliable.
 *
 * Mutex: We check for a 'running' SyncLog created within the last 2 hours
 * before starting. This prevents two cron runs from overlapping if the
 * server restarts mid-ingestion.
 */

const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SyncLog = require('../models/SyncLog');
const { ingestDocument } = require('../services/ingestion');
const { deleteByLawCode } = require('../services/pinecone');
const logger = require('../utils/logger');

// Laws to check — source URLs from official government gazette
const LAW_MANIFEST = [
  {
    lawCode: 'BNS',
    lawName: 'Bharatiya Nyaya Sanhita 2023',
    fileName: 'bns_2023.pdf',
    year: 2024,
    isRepealed: false,
    replaces: 'IPC',
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/20062/1/a2023-45.pdf',
    lastAmended: '2023-12-25',
  },
  {
    lawCode: 'BNSS',
    lawName: 'Bharatiya Nagarik Suraksha Sanhita 2023',
    fileName: 'bnss_2023.pdf',
    year: 2024,
    isRepealed: false,
    replaces: 'CRPC',
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/21544/1/the_bharatiya_nagarik_suraksha_sanhita,_2023.pdf',
    lastAmended: '2023-12-25',
  },
  {
    lawCode: 'CONSTITUTION',
    lawName: 'Constitution of India',
    fileName: 'constitution.pdf',
    year: 1950,
    isRepealed: false,
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/19632/1/the_constitution_of_india.pdf',
    lastAmended: '2022-05-01',
  },
  {
    lawCode: 'RTI',
    lawName: 'Right to Information Act 2005',
    fileName: 'rti_2005.pdf',
    year: 2005,
    isRepealed: false,
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/15691/1/rti_act_2005.pdf',
    lastAmended: '2019-07-25',
  },
  {
    lawCode: 'CPA',
    lawName: 'Consumer Protection Act 2019',
    fileName: 'consumer_2019.pdf',
    year: 2019,
    isRepealed: false,
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/15256/1/a2019-35.pdf',
    lastAmended: '2019-08-09',
  },
];

const DATA_DIR = path.join(__dirname, '../../data');

/**
 * Check if a law PDF has changed by comparing SHA-256 hashes.
 * Downloads the PDF from the official source URL, computes its hash,
 * and compares it with the hash stored in the last SyncLog.
 */
async function hasLawChanged(law, lastLog) {
  try {
    // Find the stored hash for this law from the last sync
    const lastDocResult = lastLog?.documents?.find(
      (d) => d.lawCode === law.lawCode && d.status === 'success'
    );

    if (!lastDocResult?.contentHash) return true; // No prior hash = treat as changed

    // Download current PDF
    const response = await axios.get(law.sourceUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'NyayaBot/1.0 (legal data update)' },
    });

    const currentHash = crypto
      .createHash('sha256')
      .update(Buffer.from(response.data))
      .digest('hex');

    if (currentHash !== lastDocResult.contentHash) {
      logger.info(`${law.lawCode}: content changed (hash mismatch) — will re-ingest`);

      // Save the updated PDF to disk for ingestion
      fs.writeFileSync(path.join(DATA_DIR, law.fileName), Buffer.from(response.data));
      return { changed: true, hash: currentHash };
    }

    logger.info(`${law.lawCode}: no change detected (hash match) — skipping`);
    return { changed: false, hash: currentHash };
  } catch (err) {
    logger.error(`Failed to check ${law.lawCode} for changes:`, err.message);
    return { changed: false, error: err.message };
  }
}

/**
 * Main cron job handler — checks for amendments and re-ingests changed laws.
 */
async function runLawUpdateJob() {
  // ── Mutex: prevent overlapping runs ─────────────────────────────────────
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const runningJob = await SyncLog.findOne({
    status: 'running',
    startedAt: { $gte: twoHoursAgo },
  });

  if (runningJob) {
    logger.warn('Cron: Another sync is already running — skipping this run');
    return;
  }

  logger.info('Cron: Starting nightly law update check');

  // Create a new SyncLog for this run
  const syncLog = await SyncLog.create({
    runType: 'scheduled',
    status: 'running',
  });

  // Get the last successful sync to compare hashes
  const lastSuccessLog = await SyncLog.findOne({ status: 'success' }).sort({
    completedAt: -1,
  });

  const summary = {
    documentsProcessed: 0,
    chunksCreated: 0,
    vectorsUpserted: 0,
    vectorsDeleted: 0,
    errorsCount: 0,
  };
  const docResults = [];
  let hasErrors = false;

  for (const law of LAW_MANIFEST) {
    try {
      const filePath = path.join(DATA_DIR, law.fileName);

      // Check if file exists locally
      if (!fs.existsSync(filePath)) {
        logger.warn(`${law.lawCode}: local PDF not found at ${filePath} — skipping`);
        docResults.push({ lawCode: law.lawCode, status: 'skipped', error: 'File not found' });
        continue;
      }

      const { changed, hash, error } = await hasLawChanged(law, lastSuccessLog);

      if (!changed) {
        docResults.push({ ...law, status: 'skipped', contentHash: hash });
        continue;
      }

      summary.documentsProcessed++;

      // Delete old vectors for this law before re-ingesting
      await deleteByLawCode(law.lawCode);

      // Re-ingest the updated document
      const result = await ingestDocument({
        filePath,
        ...law,
        onProgress: (done, total) => {
          if (done % 50 === 0) logger.info(`${law.lawCode}: embedded ${done}/${total} chunks`);
        },
      });

      summary.chunksCreated += result.chunksCreated;
      summary.vectorsUpserted += result.vectorsUpserted;

      docResults.push({
        lawName: law.lawName,
        lawCode: law.lawCode,
        fileName: law.fileName,
        status: 'success',
        chunksCount: result.chunksCreated,
        vectorsUpserted: result.vectorsUpserted,
        contentHash: hash || result.hash,
      });
    } catch (err) {
      logger.error(`Cron: Failed to process ${law.lawCode}:`, err);
      hasErrors = true;
      summary.errorsCount++;
      docResults.push({
        lawCode: law.lawCode,
        fileName: law.fileName,
        status: 'failed',
        error: err.message,
      });
    }
  }

  // Update SyncLog with results
  await SyncLog.findByIdAndUpdate(syncLog._id, {
    status: hasErrors ? 'partial' : 'success',
    completedAt: new Date(),
    summary,
    documents: docResults,
  });

  logger.info(
    `Cron: Completed — ${summary.documentsProcessed} updated, ${summary.errorsCount} errors`
  );
}

/**
 * Register the cron job. Called once from server.js at startup.
 */
function registerCronJobs() {
  // 2:00 AM IST daily. IST = UTC+5:30, so 2:00 AM IST = 8:30 PM UTC
  cron.schedule('30 20 * * *', runLawUpdateJob, {
    timezone: 'Asia/Kolkata',
    runOnInit: false, // Don't run immediately on server start
  });

  logger.info('Cron: Law update job registered — runs nightly at 2:00 AM IST');
}

module.exports = { registerCronJobs, runLawUpdateJob };
