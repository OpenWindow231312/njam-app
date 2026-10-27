/**
 * scan-label: reads an ingredient list with Gemini and returns structured data.
 *
 * Request (POST, JSON, signed-in users only because verify_jwt is on):
 *   { "imageBase64": "...", "mimeType": "image/jpeg" }   a label photo
 *   { "text": "Ingredients: wheat flour, sugar, ..." }   typed ingredient text
 *   { "mode": "front", "imageBase64": "...", "mimeType": "image/jpeg" }
 *                                     a photo of the front of the pack
 *
 * Response:
 *   200 { "ok": true,  "data": LabelRead }   or FrontRead in front mode
 *   4xx/5xx { "ok": false, "error": { "code": "...", "message": "..." } }
 *
 * The Gemini key is read from the GEMINI_API_KEY function secret and never
 * leaves this function. The AI only interprets the label here. It does not
 * decide a verdict: the app's rules engine does that, and it caps anything
 * read by this function at Caution because nobody has verified it.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { ALLERGEN_SLUGS, validateFrontRead, validateLabelRead } from './validate.ts';

// A named version, not the "-latest" alias: an alias can move to a new model
// without warning, which would change how labels are read overnight, and the
// verdicts with them. Upgrading is a decision, made here. Same model as Ask
// Njam's ghost text.
const MODEL = 'gemini-3.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/** Gemini must answer inside this, or the person waits too long at the shelf. */
const TIMEOUT_MS = 20_000;
/** About 4 MB of photo once decoded. The app sends a compressed photo well under this. */
const MAX_IMAGE_BASE64_LENGTH = 5_500_000;
const MAX_TEXT_LENGTH = 5_000;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// Lets the Expo web preview call the function from the browser.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROMPT = `You read South African food labels for a food allergy app.
Read the ingredient list from the label and return it as JSON.

Rules:
- List every ingredient in label order, in lower case, as printed. Split compound
  ingredients into their parts when the label lists them in brackets.
- allergen: one of ${ALLERGEN_SLUGS.join(', ')}, or null. Use "gluten" for wheat,
  rye, barley, oats, spelt and their derivatives. Use "milk" for milk, whey,
  casein, lactose, butter, cream and cheese. Use "soy" for soya and soy lecithin.
- eNumber: the E-number if the ingredient is an additive ("E621"), otherwise null.
  If the label names an additive without its number, give the number only if you
  are certain.
- mayContain: allergens named in a "may contain" or "made in a factory that also
  handles" line.
- Never guess ingredients that are not visible. If the list is cut off, blurred
  or missing, set readable to false and say what was wrong in problem.
- confidence: "high" only if every word of the list was clearly legible.`;

// Gemini's structured-output schema. It is a subset of OpenAPI, which is why
// nullable is a flag rather than a union type.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    readable: { type: 'BOOLEAN' },
    productName: { type: 'STRING', nullable: true },
    ingredients: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          allergen: { type: 'STRING', enum: [...ALLERGEN_SLUGS], nullable: true },
          eNumber: { type: 'STRING', nullable: true },
        },
        required: ['name', 'allergen', 'eNumber'],
      },
    },
    mayContain: { type: 'ARRAY', items: { type: 'STRING', enum: [...ALLERGEN_SLUGS] } },
    confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
    problem: { type: 'STRING', nullable: true },
  },
  required: ['readable', 'ingredients', 'mayContain', 'confidence'],
};

// The front of the pack: only the name and brand, so a product someone adds
// has a name people recognise in History and Search.
const FRONT_PROMPT = `You read the front of South African food packs for a grocery app.
Return the product's brand and name as printed on the pack, as JSON.

Rules:
- brand: the brand as printed ("Clover", "Ouma", "Jungle"), keeping its own
  casing, or null if no brand is printed.
- name: the product name without the brand, in sentence case, with its variety
  and pack size if printed ("Fresh full cream milk 2 l").
- Never guess. If the name is cut off, blurred or not on the photo, set readable
  to false and say what was wrong in problem.`;

const FRONT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    readable: { type: 'BOOLEAN' },
    name: { type: 'STRING', nullable: true },
    brand: { type: 'STRING', nullable: true },
    problem: { type: 'STRING', nullable: true },
  },
  required: ['readable', 'name', 'brand'],
};

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, code: string, message: string): Response {
  return reply(status, { ok: false, error: { code, message } });
}

type LabelInput = { kind: 'image'; base64: string; mimeType: string } | { kind: 'text'; text: string };

/** Checks the request body. Returns the input, or an error message to send back. */
function readInput(body: unknown): LabelInput | string {
  if (typeof body !== 'object' || body === null) return 'Send a JSON object.';
  const { imageBase64, mimeType, text } = body as Record<string, unknown>;

  if (typeof imageBase64 === 'string' && imageBase64.length > 0) {
    if (typeof mimeType !== 'string' || !IMAGE_TYPES.includes(mimeType)) {
      return `mimeType must be one of ${IMAGE_TYPES.join(', ')}.`;
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return 'The photo is too large. Send one under 4 MB.';
    }
    return { kind: 'image', base64: imageBase64, mimeType };
  }

  if (typeof text === 'string' && text.trim().length > 0) {
    if (text.length > MAX_TEXT_LENGTH) return `Send at most ${MAX_TEXT_LENGTH} characters of text.`;
    return { kind: 'text', text: text.trim() };
  }

  return 'Send either imageBase64 with mimeType, or text.';
}

async function askGemini(prompt: string, schema: unknown, input: LabelInput, apiKey: string): Promise<unknown> {
  const labelPart =
    input.kind === 'image'
      ? { inline_data: { mime_type: input.mimeType, data: input.base64 } }
      : { text: `The ingredient text, typed from the label:\n${input.text}` };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }, labelPart] }],
      generationConfig: {
        // Low temperature: we want the label as printed, not a creative reading.
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  });

  if (!response.ok) {
    // Log the detail for us; the app only gets a plain message.
    console.error('Gemini error', response.status, await response.text());
    throw new GeminiError(response.status);
  }

  const result = await response.json();
  const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof jsonText !== 'string') {
    console.error('Gemini returned no text', JSON.stringify(result).slice(0, 500));
    throw new Error('The AI returned no answer.');
  }
  return JSON.parse(jsonText);
}

class GeminiError extends Error {
  constructor(public status: number) {
    super(`Gemini answered ${status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('GEMINI_API_KEY secret is not set');
    return fail(500, 'not_configured', 'Label reading is not set up yet.');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'bad_request', 'Send a JSON body.');
  }

  const input = readInput(body);
  if (typeof input === 'string') return fail(400, 'bad_request', input);

  const isFront = (body as Record<string, unknown>).mode === 'front';
  if (isFront && input.kind !== 'image') {
    return fail(400, 'bad_request', 'Send a photo of the front of the pack.');
  }

  try {
    const raw = isFront
      ? await askGemini(FRONT_PROMPT, FRONT_SCHEMA, input, apiKey)
      : await askGemini(PROMPT, RESPONSE_SCHEMA, input, apiKey);
    const data = isFront ? validateFrontRead(raw) : validateLabelRead(raw);
    return reply(200, { ok: true, data });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return fail(504, 'timeout', 'Reading the label took too long. Try again.');
    }
    if (error instanceof GeminiError && error.status === 429) {
      return fail(503, 'busy', 'Label reading is busy right now. Try again in a minute.');
    }
    console.error('scan-label failed', error);
    return isFront
      ? fail(502, 'ai_failed', 'We could not read the front of the pack. Try again.')
      : fail(502, 'ai_failed', 'We could not read this label. Try again or type the ingredients.');
  }
});
