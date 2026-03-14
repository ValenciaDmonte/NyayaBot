# ⚖️ NyayaBot — AI Legal Assistant for Indian Citizens

> Ask legal questions in **Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, or English**.
> Get cited, grounded answers from verified Indian law — not AI guesses.

**⚠️ Disclaimer: NyayaBot provides legal information, not legal advice. Always consult a qualified lawyer for your specific situation.**

---

## What It Does

NyayaBot uses **RAG (Retrieval Augmented Generation)** to ensure every answer is grounded in official Indian law documents stored in a vector database. Gemini never answers from its general training — only from the verified legal chunks we've ingested.

```
User question (any Indian language)
        │
        ▼
Gemini text-embedding-004 → 768-dim vector
        │
        ▼
Pinecone semantic search → top 3 most relevant law chunks
        │
        ▼
Gemini gemini-1.5-flash (strict RAG prompt, no outside knowledge)
        │
        ▼
Grounded answer + citations (law name, section, amendment date, source URL)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Vector DB | Pinecone (free tier) |
| LLM + Embeddings | Google Gemini API (gemini-1.5-flash + text-embedding-004) |
| Database | MongoDB Atlas (free M0) |
| Frontend | React + Vite + TailwindCSS |
| Deployment | Render (backend) + Vercel (frontend) |

---

## Laws in the Database

| Code | Law | Notes |
|------|-----|-------|
| BNS | Bharatiya Nyaya Sanhita 2023 | Replaced IPC |
| BNSS | Bharatiya Nagarik Suraksha Sanhita 2023 | Replaced CrPC |
| CONSTITUTION | Constitution of India | Articles 14–22 (Fundamental Rights) |
| RTI | Right to Information Act 2005 | |
| CPA | Consumer Protection Act 2019 | |

All PDFs sourced from [legislative.gov.in](https://legislative.gov.in) and [egazette.gov.in](https://egazette.gov.in) (public domain).

---

## Prerequisites

Before running NyayaBot, you need free accounts and API keys from:

| Service | What For | Free Tier |
|---------|---------|-----------|
| [Google AI Studio](https://aistudio.google.com/app/apikey) | Gemini API key | 1500 req/day |
| [Pinecone](https://app.pinecone.io) | Vector DB | 100K vectors, 1 index |
| [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | Chat history + auth | 512MB M0 cluster |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/yourusername/nyayabot.git
cd nyayabot

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure environment variables

**Backend** — edit `backend/.env`:
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/nyayabot
JWT_SECRET=<generate with: openssl rand -hex 64>
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=<from Google AI Studio>
PINECONE_API_KEY=<from Pinecone console>
PINECONE_INDEX=nyayabot-laws
FRONTEND_URL=http://localhost:5173
```

**Frontend** — edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

### 3. Create Pinecone index

In the Pinecone console, create an index with these exact settings:
- **Name**: `nyayabot-laws`
- **Dimensions**: `768` (matches `text-embedding-004`)
- **Metric**: `cosine`
- **Type**: Serverless (AWS, us-east-1)

### 4. Download law PDFs

Download these PDFs and place them in `backend/data/`:

| Filename | Direct PDF Download | Browse Page |
|----------|---------------------|-------------|
| `bns_2023.pdf` | [BNS 2023 PDF](https://www.indiacode.nic.in/bitstream/123456789/20062/1/a2023-45.pdf) | [India Code](https://www.indiacode.nic.in/handle/123456789/20062) |
| `bnss_2023.pdf` | [BNSS 2023 PDF](https://www.indiacode.nic.in/bitstream/123456789/21544/1/the_bharatiya_nagarik_suraksha_sanhita,_2023.pdf) | [India Code](https://www.indiacode.nic.in/handle/123456789/20099) |
| `constitution.pdf` | [Constitution PDF (May 2022)](https://www.indiacode.nic.in/bitstream/123456789/19632/1/the_constitution_of_india.pdf) | [India Code](https://www.indiacode.nic.in/handle/123456789/16124) |
| `rti_2005.pdf` | [RTI Act 2005 PDF](https://www.indiacode.nic.in/bitstream/123456789/15691/1/rti_act_2005.pdf) | [India Code](https://www.indiacode.nic.in/handle/123456789/2065) |
| `consumer_2019.pdf` | [Consumer Protection Act 2019 PDF](https://www.indiacode.nic.in/bitstream/123456789/15256/1/a2019-35.pdf) | [India Code](https://www.indiacode.nic.in/handle/123456789/15256) |

### 5. Run ingestion

This step parses PDFs → chunks text → embeds with Gemini → stores in Pinecone.
**Takes 5–15 minutes** (free tier rate limits). Run once before starting the server.

```bash
cd backend
node scripts/ingestAll.js          # Ingest all 5 laws
node scripts/ingestAll.js BNS      # Ingest only BNS (for testing)
```

### 6. Start the app

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/health` | — | Health check |
| `POST` | `/api/auth/register` | — | Create account |
| `POST` | `/api/auth/login` | — | Get JWT token |
| `GET` | `/api/auth/me` | JWT | Current user |
| `PATCH` | `/api/auth/preferences` | JWT | Update language |
| `POST` | `/api/query` | JWT | **RAG legal query** |
| `GET` | `/api/history/sessions` | JWT | Chat sessions list |
| `GET` | `/api/history/sessions/:id` | JWT | Session messages |
| `DELETE` | `/api/history/sessions/:id` | JWT | Archive session |
| `POST` | `/api/admin/ingest` | Admin | Trigger ingestion |
| `GET` | `/api/admin/sync-logs` | Admin | Ingestion history |
| `GET` | `/api/admin/stats` | Admin | System stats |

### Example: POST /api/query

```bash
curl -X POST http://localhost:3001/api/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the punishment for murder under BNS 2023?"}'
```

Response:
```json
{
  "success": true,
  "answer": "Under Section 103 of the Bharatiya Nyaya Sanhita 2023...",
  "detectedLanguage": "en",
  "citations": [
    {
      "lawName": "Bharatiya Nyaya Sanhita 2023",
      "section": "103",
      "lastAmended": "2023-12-25",
      "sourceUrl": "https://egazette.gov.in/...",
      "isRepealed": false,
      "similarityScore": 0.91
    }
  ],
  "hasRepealedWarning": false,
  "disclaimer": "This is not professional legal advice."
}
```

---

## Architecture

```
nyayabot/
├── backend/
│   ├── src/
│   │   ├── config/index.js         ← Zod-validated env config
│   │   ├── services/
│   │   │   ├── gemini.js           ← Embeddings + generation
│   │   │   ├── pinecone.js         ← Vector DB operations
│   │   │   ├── rag.js              ← RAG pipeline orchestrator ⭐
│   │   │   ├── ingestion.js        ← PDF → chunks → vectors
│   │   │   └── languageDetector.js ← franc + Gemini fallback
│   │   ├── routes/
│   │   │   ├── auth.js             ← JWT auth
│   │   │   ├── query.js            ← POST /api/query
│   │   │   ├── history.js          ← Chat history
│   │   │   └── admin.js            ← Admin ops
│   │   ├── models/                 ← MongoDB schemas
│   │   ├── jobs/
│   │   │   └── lawUpdateCron.js    ← Nightly amendment check
│   │   └── middleware/             ← Auth, errors, rate limiting
│   └── scripts/
│       └── ingestAll.js            ← One-time PDF ingestion
├── frontend/
│   └── src/
│       ├── hooks/
│       │   ├── useChat.js          ← Chat state + API
│       │   ├── useSpeech.js        ← Voice I/O (Web Speech API) ⭐
│       │   └── useLanguage.js      ← Language selection
│       ├── components/
│       │   ├── chat/               ← ChatWindow, MessageBubble, etc.
│       │   ├── citations/          ← CitationCard, CitationPanel
│       │   └── ui/                 ← Voice buttons, language selector
│       └── pages/                  ← Home, Login, Chat
└── README.md
```

---

## Key Design Decisions

### Why RAG + Strict Grounding
Gemini's training data includes outdated and non-Indian legal content. By forcing it to answer ONLY from our Pinecone corpus, we eliminate hallucinations about Indian law. The `score >= 0.72` threshold means Gemini refuses to answer (says "I don't have information") when the query has no relevant law in our database — better than a confident wrong answer.

### Why `text-embedding-004`
Better multilingual quality for Indian languages vs `embedding-001`. The 768-dimension vectors support Hindi, Tamil, Telugu, Bengali, Marathi, and Kannada more accurately.

### Why Web Speech API for Voice
Free, zero new API keys, Chrome/Edge support all major Indian languages with the `-IN` locale suffix (e.g., `hi-IN`, `ta-IN`). The `-IN` suffix is critical — without it, Chrome uses US-English accent models.

### Why Soft-Delete Sessions
`isArchived: true` instead of hard DELETE. Users often regret deleting chat history — soft delete is always recoverable.

---

## Voice I/O Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Voice Input (mic) | ✅ | ✅ | ❌ | ❌ |
| Voice Output (speak) | ✅ | ✅ | ✅ | ✅ |

Indian language support in Chrome voice input: Hindi (hi-IN), Tamil (ta-IN), Telugu (te-IN), Bengali (bn-IN), Marathi (mr-IN), Kannada (kn-IN).

---

## Deployment

### Backend → Render

1. Create a new **Web Service** on Render
2. Connect your GitHub repo
3. Settings:
   - Build command: `cd backend && npm install`
   - Start command: `node src/server.js`
   - Runtime: Node 22
   - Region: Singapore (closest to India)
4. Add all `.env` variables in Render's Environment tab
5. Set `NODE_ENV=production`

### Frontend → Vercel

1. Import your GitHub repo on Vercel
2. Settings:
   - Framework: Vite
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add environment variable:
   - `VITE_API_URL` = your Render backend URL

---

## Nightly Law Updates

The cron job runs at **2:00 AM IST** daily. It:
1. Downloads each law PDF from the official source
2. Computes SHA-256 hash and compares with stored hash
3. Re-ingests only laws that have changed
4. Logs results to MongoDB SyncLog collection

To check logs: `GET /api/admin/sync-logs` (admin JWT required).

---

## Roadmap

- [x] Phase 1: MVP — RAG query, auth, basic chat UI
- [x] Phase 2: Multilingual, citation cards, voice I/O, cron updates
- [ ] Phase 3: Legal Notice Generator (PDF download)
- [ ] Phase 3: Legal document upload + analysis
- [ ] Phase 4: Nearest lawyer on Google Maps

---

## License

MIT — Law data from legislative.gov.in is in the public domain under Section 52 of the Indian Copyright Act.
