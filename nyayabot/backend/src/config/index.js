/**
 * config/index.js
 *
 * WHY: Centralise all environment variables into one validated object.
 * If a required var is missing, the app crashes loudly at startup — much
 * better than a mysterious "undefined" error deep inside a service at runtime.
 *
 * We use Zod to parse and validate the env object. Any missing or malformed
 * variable will throw a descriptive error with the variable name.
 */

require('dotenv').config();
const { z } = require('zod');

// Define the shape and rules for every environment variable we need
const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),

  PINECONE_API_KEY: z.string().min(1, 'PINECONE_API_KEY is required'),
  PINECONE_INDEX: z.string().default('nyayabot-laws'),

  FRONTEND_URL: z.string().default('http://localhost:5173'),

  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  QUERY_RATE_LIMIT_MAX: z.string().default('20'),
});

// Parse process.env — throws ZodError with details if validation fails
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1); // Hard stop — do not start with bad config
}

const env = parsed.data;

module.exports = {
  port: parseInt(env.PORT, 10),
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',

  mongodb: {
    uri: env.MONGODB_URI,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  groq: {
    apiKey: env.GROQ_API_KEY,
    // llama-3.1-8b-instant: fast, free-tier friendly. Upgrade to llama-3.3-70b-versatile
    // in production for better legal reasoning quality.
    generationModel: 'llama-3.3-70b-versatile',
  },

  gemini: {
    apiKey: env.GEMINI_API_KEY,
    // gemini-embedding-001 is the GA successor to the deprecated text-embedding-004.
    // It also outputs 768-dim vectors with strong multilingual support for Indian languages.
    // gemini-embedding-2-preview is also available but still in preview — use GA for stability.
    embeddingModel: 'gemini-embedding-001',
    generationModel: 'gemini-1.5-pro',
  },

  pinecone: {
    apiKey: env.PINECONE_API_KEY,
    index: env.PINECONE_INDEX,
    // Namespace separates dev/prod vectors in the same free-tier index
    // WHY: prevents dev ingestion from overwriting production vectors
    namespace: env.NODE_ENV === 'production' ? 'prod' : 'dev',
    dimension: 768,           // Must match gemini-embedding-001 output dimension (768)
    // WHY 0.65 (was 0.72): Re-ranking is now the quality gate. Lowering the
    // threshold lets more candidates reach the re-ranker, recovering ~15% of
    // valid queries that cosine similarity alone was rejecting.
    similarityThreshold: 0.65,
    topK: 5,             // Results per individual Pinecone query (3 queries × 5 = up to 15 raw)
    expandedTopK: 10,    // Max candidates passed to the re-ranker after dedup + threshold filter
    rerankerTopN: 4,     // Final chunks passed to the LLM prompt after re-ranking
  },

  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(env.RATE_LIMIT_MAX, 10),
    queryMax: parseInt(env.QUERY_RATE_LIMIT_MAX, 10),
  },

  frontend: {
    url: env.FRONTEND_URL,
  },
};
