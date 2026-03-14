/**
 * scripts/ingestAll.js
 *
 * One-time ingestion script. Run manually before launching NyayaBot.
 * Downloads and embeds all 5 Indian law PDFs into Pinecone.
 *
 * Usage:
 *   node scripts/ingestAll.js           — ingest all laws
 *   node scripts/ingestAll.js BNS       — ingest only BNS
 *
 * WHY a separate script (not an API endpoint):
 * - Ingestion is slow (5-15 min on free tier rate limits)
 * - It's a one-time operation, not a user-facing API
 * - Running it as a script gives us clear console output and exit codes
 *
 * BEFORE RUNNING:
 * 1. Place PDF files in nyayabot/backend/data/
 * 2. Ensure Pinecone index 'nyayabot-laws' exists with dimension: 768
 * 3. Set all required environment variables in .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const mongoose = require('mongoose');
const config = require('../src/config');
const { initPinecone } = require('../src/services/pinecone');
const { ingestDocument } = require('../src/services/ingestion');
const SyncLog = require('../src/models/SyncLog');
const logger = require('../src/utils/logger');

const DATA_DIR = path.join(__dirname, '../data');

// Full manifest of all laws to ingest
// Update sourceUrl and lastAmended when you download newer versions
const LAW_MANIFEST = [
  {
    fileName: 'bns_2023.pdf',
    lawCode: 'BNS',
    lawName: 'Bharatiya Nyaya Sanhita 2023',
    year: 2024,
    isRepealed: false,
    replacedBy: "",
    replaces: 'IPC',
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/20062/1/a2023-45.pdf',
    lastAmended: '2023-12-25',
  },
  {
    fileName: 'bnss_2023.pdf',
    lawCode: 'BNSS',
    lawName: 'Bharatiya Nagarik Suraksha Sanhita 2023',
    year: 2024,
    isRepealed: false,
    replacedBy: null,
    replaces: 'CRPC',
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/21544/1/the_bharatiya_nagarik_suraksha_sanhita,_2023.pdf',
    lastAmended: '2023-12-25',
  },
  {
    fileName: 'constitution.pdf',
    lawCode: 'CONSTITUTION',
    lawName: 'Constitution of India',
    year: 1950,
    isRepealed: false,
    replacedBy: null,
    replaces: null,
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/19632/1/the_constitution_of_india.pdf',
    lastAmended: '2022-05-01',
  },
  {
    fileName: 'rti_2005.pdf',
    lawCode: 'RTI',
    lawName: 'Right to Information Act 2005',
    year: 2005,
    isRepealed: false,
    replacedBy: null,
    replaces: null,
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/15691/1/rti_act_2005.pdf',
    lastAmended: '2019-07-25',
  },
  {
    fileName: 'cpa_2019.pdf',
    lawCode: 'CPA',
    lawName: 'Consumer Protection Act 2019',
    year: 2019,
    isRepealed: false,
    replacedBy: null,
    replaces: null,
    sourceUrl: 'https://www.indiacode.nic.in/bitstream/123456789/15256/1/a2019-35.pdf',
    lastAmended: '2019-08-09',
  },
];

/**
 * Run ingestion for all laws (or a specific law by code).
 * This function is also called by the admin /ingest endpoint.
 *
 * @param {string|null} syncLogId - MongoDB SyncLog ID (null when run as standalone script)
 * @param {string|null} specificLawCode - Only ingest this law (null = all)
 */
async function runFullIngestion(syncLogId = null, specificLawCode = null) {
  const manifest = specificLawCode
    ? LAW_MANIFEST.filter((l) => l.lawCode === specificLawCode.toUpperCase())
    : LAW_MANIFEST;

  if (manifest.length === 0) {
    throw new Error(`Unknown law code: ${specificLawCode}. Valid codes: ${LAW_MANIFEST.map((l) => l.lawCode).join(', ')}`);
  }

  const summary = {
    documentsProcessed: 0,
    chunksCreated: 0,
    vectorsUpserted: 0,
    vectorsDeleted: 0,
    errorsCount: 0,
  };
  const docResults = [];

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  NyayaBot — Law Ingestion Script');
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Laws to ingest: ${manifest.map((l) => l.lawCode).join(', ')}`);
  console.log(`${'═'.repeat(60)}\n`);

  for (const law of manifest) {
    const filePath = path.join(DATA_DIR, law.fileName);

    // Check if PDF file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      console.error(`  ❌  ${law.lawCode}: PDF not found at ${filePath}`);
      console.error(`     Download from: ${law.sourceUrl}`);
      console.error(`     Place it in: ${DATA_DIR}/\n`);
      summary.errorsCount++;
      docResults.push({ ...law, status: 'failed', error: 'PDF file not found' });
      continue;
    }

    console.log(`  ⚡  Processing: ${law.lawName}`);
    const startTime = Date.now();

    try {
      const result = await ingestDocument({
        filePath,
        ...law,
        onProgress: (done, total) => {
          // Show progress bar in terminal
          const pct = Math.round((done / total) * 100);
          const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
          process.stdout.write(`\r     [${bar}] ${pct}% (${done}/${total} chunks)`);
        },
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write('\n');
      console.log(`  ✅  ${law.lawCode}: ${result.chunksCreated} chunks, ${result.vectorsUpserted} vectors (${elapsed}s)\n`);

      summary.documentsProcessed++;
      summary.chunksCreated += result.chunksCreated;
      summary.vectorsUpserted += result.vectorsUpserted;

      docResults.push({
        lawName: law.lawName,
        lawCode: law.lawCode,
        fileName: law.fileName,
        status: 'success',
        chunksCount: result.chunksCreated,
        vectorsUpserted: result.vectorsUpserted,
        contentHash: result.hash,
      });
    } catch (err) {
      console.error(`  ❌  ${law.lawCode} failed: ${err.message}\n`);
      summary.errorsCount++;
      docResults.push({
        lawCode: law.lawCode,
        fileName: law.fileName,
        status: 'failed',
        error: err.message,
      });
    }
  }

  // Print summary
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Summary:`);
  console.log(`  Documents processed: ${summary.documentsProcessed}/${manifest.length}`);
  console.log(`  Total chunks created: ${summary.chunksCreated}`);
  console.log(`  Total vectors upserted: ${summary.vectorsUpserted}`);
  if (summary.errorsCount > 0) {
    console.log(`  Errors: ${summary.errorsCount}`);
  }
  console.log(`${'─'.repeat(60)}\n`);

  // Update SyncLog if called from the admin API
  if (syncLogId) {
    const SyncLog = require('../src/models/SyncLog');
    await SyncLog.findByIdAndUpdate(syncLogId, {
      status: summary.errorsCount > 0 ? 'partial' : 'success',
      completedAt: new Date(),
      summary,
      documents: docResults,
    });
  }

  return { summary, documents: docResults };
}

// ── Standalone execution ─────────────────────────────────────────────────────
// Only runs when called directly: node scripts/ingestAll.js
if (require.main === module) {
  const specificLaw = process.argv[2] || null; // e.g. node ingestAll.js BNS

  (async () => {
    try {
      // Connect to MongoDB and Pinecone
      await mongoose.connect(config.mongodb.uri);
      console.log('  ✓  MongoDB connected');

      await initPinecone();
      console.log('  ✓  Pinecone connected\n');

      // Create a SyncLog for this manual run
      const syncLog = await SyncLog.create({ runType: 'manual', status: 'running' });

      await runFullIngestion(syncLog._id, specificLaw);

      console.log('  🎉  Ingestion complete! NyayaBot is ready to answer legal questions.\n');
      console.log('  Next steps:');
      console.log('  1. Start the backend: npm run dev');
      console.log('  2. Test with: POST /api/query {"query": "What is BNS section 103?"}');
    } catch (err) {
      console.error('\n  ❌  Fatal error:', err.message);
      console.error(err.stack);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      process.exit(0);
    }
  })();
}

module.exports = { runFullIngestion };
