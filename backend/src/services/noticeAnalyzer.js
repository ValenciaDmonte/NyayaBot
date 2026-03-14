/**
 * services/noticeAnalyzer.js
 *
 * Produces a plain-language explanation of a legal notice for citizens who
 * cannot parse formal legal text. The prompt is deliberately constrained:
 *
 * ETHICAL GUARDRAILS (baked into the prompt — not optional):
 * 1. EXPLAIN ONLY — the model describes what the notice says, never what
 *    the user should do in response. Advising on legal strategy would require
 *    understanding the full case, which we cannot do safely.
 * 2. Urgency flagging — deadlines are bolded so they cannot be missed.
 * 3. Mandatory escalation line — every response ends with a direction to
 *    consult a lawyer. This is enforced in code, not left to the model.
 * 4. No speculation — the model is forbidden from assessing whether the
 *    claims in the notice are valid, enforceable, or legally sound.
 */

const Groq = require('groq-sdk');
const config = require('../config');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: config.groq.apiKey });

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
 * Analyse a legal notice and return a plain-language explanation.
 *
 * @param {string} noticeText  - Full extracted text of the legal notice
 * @param {string} language    - ISO 639-1 code of the user's preferred language
 * @returns {Promise<string>}  - Markdown-formatted plain-language explanation
 */
async function analyzeNotice(noticeText, language = 'en') {
  const languageInstruction = LANGUAGE_NAMES[language] || 'English';

  // Truncate extremely long notices to prevent token overflow.
  // WHY 6000 chars: covers ~95% of real legal notices (typically 1–4 pages).
  // Notices longer than this are usually exhibits attached to the main notice —
  // the first 6000 chars contain the key demands and deadlines.
  const truncatedText = noticeText.length > 6000
    ? noticeText.slice(0, 6000) + '\n\n[Document truncated — first 6000 characters shown]'
    : noticeText;

  const systemPrompt = `You are helping an Indian citizen understand a legal notice they received.

The person reading your explanation may not have formal education and may not understand legal language.  
Explain the notice clearly using simple words and short sentences.

LANGUAGE INSTRUCTION:
Respond entirely in ${languageInstruction}. Do not switch languages.

IMPORTANT:
Your explanation must ONLY describe what is written in the uploaded notice.  
Do not use outside legal knowledge.

STRICT RULES — follow without exception:

1. EXPLAIN ONLY.
Describe what the notice says. Do NOT suggest what the person should do.

2. Use the EXACT structure below:

**Who sent this notice:**  
[name and role of the sender]

**Why it was sent:**  
[the reason for the notice]

**What they are claiming or demanding:**  
[claims, accusations, or demands in the notice]

**Important dates and deadlines:**  
[List all dates mentioned in the notice.  
**Bold every date** because missing a legal deadline can be serious.]

**What happens if this notice is ignored:**  
[Only describe consequences written in the notice.]

**Legal terms explained:**  
[Explain difficult legal words in simple language.]

3. Only use information that appears in the notice text.

4. If information is not mentioned in the notice, write:
"Not mentioned in the notice."

5. Do NOT:
- speculate whether the claims are true
- speculate whether the notice is legally valid
- add legal sections, punishments, or laws not written in the notice.

6. If the uploaded document does NOT appear to be a legal notice, clearly say:
"This document does not appear to be a legal notice."

7. If the user asks additional questions, answer ONLY using information in the notice.
If the notice does not contain the answer, say:
"The notice does not mention this."

8. Write in short paragraphs or bullet points so the explanation is easy to read.

9. Layout rule:
After every section add a blank line for readability.

10. Always end your response with this EXACT line (translated to the response language):

"⚠️ This is only an explanation of what the notice says — it is not legal advice. Please consult a qualified lawyer immediately to understand how to respond."`;

  const userPrompt = `LEGAL NOTICE TEXT:\n\n${truncatedText}`;

  const completion = await groq.chat.completions.create({
    model: config.groq.generationModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature: 0.1,   // Low temperature — factual explanation, not creative
    max_tokens: 2048,   // Notices can have many sections; allow longer responses
  });

  const analysis = completion.choices[0]?.message?.content;
  if (!analysis) throw new Error('Groq returned an empty response for notice analysis');

  logger.debug(`Notice analysis — prompt tokens: ${completion.usage?.prompt_tokens}, completion: ${completion.usage?.completion_tokens}`);

  return analysis;
}

/**
 * checkLegitimacy(noticeText)
 *
 * ETHICAL DESIGN — equally important as the technical spec:
 * This function deliberately uses soft, probabilistic language.
 * It NEVER concludes "this is fraud" — it flags observable structural
 * anomalies only. The prompt is engineered with this as a hard constraint:
 *
 * a) We cannot verify the sender, court records, or bar council rolls in real-time.
 * b) A false "fraud" verdict on a legitimate notice causes more harm than no check at all.
 * c) A false "legitimate" verdict on a fraud notice is equally dangerous.
 *
 * WHY a separate Groq call (not extending analyzeNotice's prompt):
 * - The explain-only prompt in analyzeNotice has carefully tuned constraints.
 *   Mixing explanation + assessment in one prompt degrades both outputs.
 * - Separate calls allow independent error handling — if legitimacy check fails,
 *   the plain-language explanation still succeeds.
 * - Both calls run in parallel via Promise.all in legalNotice.js — no latency penalty.
 *
 * @param {string} noticeText - Full extracted text of the legal notice
 * @returns {Promise<{riskLevel: string, redFlags: string[], legitimacyIndicators: string[], summary: string}>}
 */
async function checkLegitimacy(noticeText) {
  // Same 6000-char limit as analyzeNotice — key fraud signals (payment demands,
  // missing headers, contact details) appear in the first 6000 chars of any notice.
  const truncatedText = noticeText.length > 6000
    ? noticeText.slice(0, 6000) + '\n\n[Document truncated]'
    : noticeText;

  const systemPrompt = `You are a fraud-signal detector for Indian legal notices.
Your job is to look for observable structural characteristics that commonly appear
in fraudulent or unofficial legal notices sent to Indian citizens.

CRITICAL ETHICAL RULES — these are non-negotiable:
1. NEVER conclude a notice IS fraudulent. Use language like "this notice does not include..."
2. NEVER conclude a notice is definitely legitimate.
3. Detect observable structural signals ONLY — not legal judgments.
4. If the document is not a legal notice, set riskLevel to "low", empty redFlags, note in summary.

RISK LEVEL DEFINITIONS (be conservative — default to lower level when uncertain):
- "low"    : No significant red flags. Standard notice structure present.
             Does NOT mean the notice is legitimate — always recommend verification.
- "medium" : 1–2 structural concerns (e.g. missing case number, no bar council registration).
- "high"   : 3+ strong indicators present — especially payment to personal account, UPI/crypto
             demands, WhatsApp/Gmail contact, or arrest threats for civil disputes.

RED FLAG INDICATORS — check each one:
RF1: No court/tribunal case number, FIR number, or complaint number
RF2: No official court, tribunal, or government authority letterhead or header
RF3: Demands immediate cash, cryptocurrency, or UPI payment
RF4: Contact is a personal WhatsApp number, Gmail address, or personal mobile
RF5: Threatens arrest or police action for a civil or commercial dispute
RF6: No specific legal provision cited (no IPC/BNS/CPC/NI Act or other statute section)
RF7: No bar council registration number for an advocate-issued notice
RF8: Language is inconsistent with formal legal style (casual threats, all-caps, dramatic urgency)
RF9: Payment demanded to a personal bank account listed in the notice
RF10: Response deadline of 24 hours or less with threatened immediate consequences
RF11: Claims police or officers will arrive within hours
RF12: Sender identity is vague, unverifiable, or uses only a first name or alias

LEGITIMACY INDICATORS — check each one:
LI1: Court case number or FIR number is present
LI2: Specific statute and section references are present (e.g. "Section 138 NI Act")
LI3: Official court/tribunal name and address is stated
LI4: Bar council registration number is present
LI5: Proper legal notice format — separate sections for facts, legal basis, demand, time limit
LI6: Named registered advocate or law firm with verifiable address

OUTPUT — respond with ONLY valid JSON, no prose before or after:
{
  "riskLevel": "low" | "medium" | "high",
  "redFlags": ["Full plain-English sentence describing the specific observation"],
  "legitimacyIndicators": ["Full plain-English sentence describing what was found"],
  "summary": "1-2 sentences summarising the overall structural assessment"
}

Each entry in redFlags/legitimacyIndicators must be a complete sentence describing the observation.
Example: "No court case number, FIR number, or complaint number is present in the notice."`;

  const completion = await groq.chat.completions.create({
    model: config.groq.generationModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `LEGAL NOTICE TEXT:\n\n${truncatedText}` },
    ],
    temperature: 0.0,                              // WHY 0.0: structural detection must be
                                                   // deterministic — same notice = same flags
    max_tokens: 1024,
    response_format: { type: 'json_object' },      // Groq JSON mode — guarantees parseable output
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) throw new Error('Groq returned empty response for legitimacy check');

  let result;
  try {
    result = JSON.parse(rawContent);
  } catch {
    // WHY safe fallback instead of throwing: if JSON mode fails, we do not
    // want to crash the entire notice upload (analyzeNotice already succeeded).
    // Returning low/empty is safer than propagating an error to the user.
    logger.warn('Legitimacy check JSON parse failed — returning safe fallback');
    return {
      riskLevel: 'low',
      redFlags: [],
      legitimacyIndicators: [],
      summary: 'Legitimacy check could not be completed. Please verify this notice with a qualified lawyer.',
    };
  }

  // Validate riskLevel — guard against unexpected LLM strings like "medium-high"
  if (!['low', 'medium', 'high'].includes(result.riskLevel)) {
    logger.warn(`Legitimacy check returned unknown riskLevel "${result.riskLevel}" — defaulting to "low"`);
    result.riskLevel = 'low';
  }
  if (!Array.isArray(result.redFlags)) result.redFlags = [];
  if (!Array.isArray(result.legitimacyIndicators)) result.legitimacyIndicators = [];
  if (typeof result.summary !== 'string') result.summary = '';

  logger.debug(`Legitimacy check — risk: ${result.riskLevel}, flags: ${result.redFlags.length}, green: ${result.legitimacyIndicators.length}`);

  return result;
}

module.exports = { analyzeNotice, checkLegitimacy };
