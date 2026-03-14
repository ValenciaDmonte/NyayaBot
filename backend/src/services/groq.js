/**
 * services/groq.js
 *
 * WHY Groq for generation (not Gemini):
 * Groq's free tier runs on dedicated LPU hardware — 500 tokens/min on Gemini free
 * tier exhausts in a single conversation, while Groq free tier supports much higher
 * throughput. We still use Gemini for embeddings (text-embedding-004/gemini-embedding-001)
 * because Groq has no embedding API.
 *
 * Model choice — llama-3.1-8b-instant:
 * Fast enough for real-time chat, sufficient quality for structured RAG answers,
 * and stays within Groq free tier limits. Upgrade to llama-3.3-70b-versatile
 * in production for significantly better legal reasoning quality.
 */

const Groq = require('groq-sdk');
const config = require('../config');
const logger = require('../utils/logger');

// Singleton — instantiate once, reuse across all requests
const groq = new Groq({ apiKey: config.groq.apiKey });

/**
 * Language display names used to instruct the LLM.
 * WHY explicit instruction: without it LLMs default to English even when the
 * query is in Hindi/Tamil — unacceptable for a multilingual legal assistant.
 */
const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi (use Devanagari script: हिंदी)',
  ta: 'Tamil (use Tamil script: தமிழ்)',
  te: 'Telugu (use Telugu script: తెలుగు)',
  bn: 'Bengali (use Bengali script: বাংলা)',
  mr: 'Marathi (use Devanagari script: मराठी)',
  kn: 'Kannada (use Kannada script: ಕನ್ನಡ)',
};

/**
 * Generate a grounded legal answer from retrieved law chunks.
 *
 * Mirrors the strict RAG prompt from gemini.js — all the same safety rules apply.
 * The prompt is intentionally constraining to prevent hallucination in a legal context
 * where wrong information can cause real harm.
 *
 * @param {string}      query         - The user's legal question
 * @param {Array}       chunks        - Top-k matched Pinecone chunks (objects with .metadata and .text/.score)
 * @param {string}      language      - Detected language ISO code ('en', 'hi', 'ta', etc.)
 * @param {string|null} noticeContext - Extracted text of an uploaded legal notice (optional).
 *                                      When present, prepended to the prompt so the model can
 *                                      answer follow-up questions about the specific document.
 * @returns {Promise<string>} Groq's grounded legal answer
 */
async function generateAnswer(query, chunks, language = 'en', noticeContext = null) {
  const languageInstruction = LANGUAGE_NAMES[language] || 'English';

  // Format each chunk with full source metadata.
  const contextBlocks = chunks
    .map((chunk, i) => {
      const m = chunk.metadata || {};
      const repealedNote = m.is_repealed ? ' ⚠️ THIS LAW HAS BEEN REPEALED' : '';
      const sourceLabel = `--- Source ${i + 1}${repealedNote} ---`;

      return (
        `${sourceLabel}\n` +
        `Law: ${m.law_name || 'Unknown'}\n` +
        `Section: ${m.section || ''}${m.section_title ? ` — ${m.section_title}` : ''}\n` +
        `Last Amended: ${m.last_amended || 'Not specified'}\n` +
        `${m.replaces ? `Replaces: ${m.replaces}\n` : ''}` +
        `${m.replaced_by ? `Replaced By: ${m.replaced_by}\n` : ''}` +
        `Text:\n${m.text || ''}\n`
      );
    })
    .join('\n');

  // When a notice was uploaded, prepend its text so the model can answer
  // questions like "what is the deadline in my notice?" directly.
  const noticeBlock = noticeContext
    ? `--- USER'S UPLOADED LEGAL NOTICE ---\n${noticeContext}\n--- END OF NOTICE ---\n\n`
    : '';

  const userPrompt = `${noticeBlock}VERIFIED LEGAL CONTEXT (answer ONLY from this):
${contextBlocks}

USER'S QUESTION: ${query}`;

  const systemPrompt = `You are NyayaBot, a legal assistant that helps Indian citizens understand their rights using verified legal text.

LANGUAGE INSTRUCTION:
You MUST respond in ${languageInstruction}. Do not switch languages mid-response.

You are NOT a lawyer. Your role is to explain laws clearly using only the provided verified legal context.

---

## STRICT RULES — follow these without exception

1. Use ONLY the verified legal context provided above.
2. Do NOT rely on your training knowledge of law.
3. Do NOT invent section numbers, legal provisions, or interpretations not supported by the context.
4. If the question cannot be answered from the context, respond with exactly:
"I don't have sufficient verified legal information to answer this question accurately. Please consult a qualified lawyer."
5. If a source is marked as REPEALED, clearly inform the user that the law no longer applies and name the replacement law if provided.
6. Do NOT cite case law, court judgments, or legal doctrines unless they appear in the context.
7. Explain the law in simple terms suitable for an ordinary Indian citizen.${noticeContext ? '\n8. You also have access to the USER\'S UPLOADED LEGAL NOTICE above. You may answer questions about this specific document using both the notice text and the verified legal context provided.' : ''}
## LEGAL ANALYSIS PROCESS — follow these steps
Step 1 — Identify relevant provisions
List the section numbers that appear in the retrieved legal context.
Step 2 — Extract legal text
Quote or summarize the relevant parts of those sections.
Step 3 — Explain the rule
Explain what each section means in simple language.
Step 4 — Apply the rule
Apply the sections to the user's situation.
Step 5 — Resolve conflicts
If multiple sections apply, explain how they interact before concluding.
Step 6 — Provide the conclusion
State the likely legal position based strictly on the provided context.
do not output this steps in answer generated it is only for your refference.
If the context does not clearly determine the answer, explain that the outcome may depend on interpretation by a court.
## CITATION RULE
You may ONLY cite sections that appear in the retrieved context.
If a section number is not present in the retrieved text, you are not allowed to cite it.
Only explain sections that are directly relevant to the user's situation.
Ignore sections that do not affect the legal outcome.
## SELF-VERIFICATION (MANDATORY)
Before finalizing your answer, verify:
• Every cited section exists in the retrieved context
• The explanation matches the quoted text
• The conclusion logically follows from the sections
If verification fails, say the information is insufficient.
Always end your response with this exact line:
 Note: This is not professional legal advice. Please consult a qualified lawyer for your specific situation.
 Give final answer in like a professional and supportive and friendly lawyer 
`;

  const completion = await groq.chat.completions.create({
    model: config.groq.generationModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1, // WHY low temperature: legal answers must be consistent and factual
    max_tokens: 1024,
  });

  const answer = completion.choices[0]?.message?.content;

  if (!answer) {
    throw new Error('Groq returned an empty response');
  }

  logger.debug(`Groq tokens used — prompt: ${completion.usage?.prompt_tokens}, completion: ${completion.usage?.completion_tokens}`);

  return answer;
}

module.exports = { generateAnswer };
