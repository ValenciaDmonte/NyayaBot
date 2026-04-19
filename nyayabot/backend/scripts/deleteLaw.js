require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pinecone } = require('@pinecone-database/pinecone');

async function deleteLawVectors(lawCode) {
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    const index = pc.index('nyayabot-laws').namespace('dev');

    console.log(`Deleting vectors for law_code = ${lawCode}...`);

    await index.deleteMany({
      filter: {
        law_code: { $eq: lawCode }
      }
    });

    console.log(`✅ Successfully deleted vectors for ${lawCode}`);
  } catch (err) {
    console.error("❌ Error deleting vectors:", err);
  }
}

const lawCode = process.argv[2];

if (!lawCode) {
  console.log("Usage: node scripts/deleteLaw.js LAW_CODE");
  process.exit(1);
}

deleteLawVectors(lawCode);