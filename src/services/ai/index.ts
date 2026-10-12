/**
 * The AI service: the one place the app asks an AI for anything.
 *
 * It does not hold a Gemini key and never talks to Gemini. It calls the
 * scan-label Supabase Edge Function, which holds the key as a server secret.
 * To swap provider, change the edge function; this file and every screen
 * stay the same.
 *
 * The AI only interprets: it turns a label into a typed ingredient list.
 * It never decides a verdict. That is src/services/verdict, which caps
 * anything read here at Caution because nobody has verified it.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// These types mirror supabase/functions/scan-label/validate.ts.
// If you change one, change the other.

export type LabelIngredient = {
  name: string;
  /** allergens.slug, e.g. "milk", or null. */
  allergen: string | null;
  /** "E621", or null. */
  eNumber: string | null;
};

export type LabelRead = {
  readable: boolean;
  productName: string | null;
  ingredients: LabelIngredient[];
  mayContain: string[];
  confidence: 'high' | 'medium' | 'low';
  /** When readable is false: what was wrong. */
  problem: string | null;
};

export type LabelInput =
  | { imageBase64: string; mimeType: 'image/jpeg' | 'image/png' }
  | { text: string };

/** Thrown with a sentence that can be shown to the person as it is. */
export class LabelReadError extends Error {}

type FunctionReply =
  | { ok: true; data: LabelRead }
  | { ok: false; error: { code: string; message: string } };

/** Reads a label photo or typed ingredient text into structured data. */
export async function readLabel(input: LabelInput): Promise<LabelRead> {
  const { data, error } = await supabase.functions.invoke<FunctionReply>('scan-label', { body: input });

  if (error) {
    // The function answered with an error status. Its body still carries a
    // message written for people, so use that if we can read it.
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as FunctionReply | null;
      if (body && !body.ok) throw new LabelReadError(body.error.message);
    }
    throw new LabelReadError('We could not reach the label reader. Check your connection and try again.');
  }

  if (!data || !data.ok) {
    throw new LabelReadError(data?.ok === false ? data.error.message : 'The label reader sent back nothing.');
  }

  return data.data;
}
