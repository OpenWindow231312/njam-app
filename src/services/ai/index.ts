/**
 * The AI service: the one place the app asks an AI for anything.
 *
 * It does not hold a Gemini key and never talks to Gemini. It calls two
 * Supabase Edge Functions, scan-label and ask-njam, which hold the key as a
 * server secret. To swap provider, change the edge functions; this file and
 * every screen stay the same.
 *
 * The AI only interprets: it turns a label into a typed ingredient list,
 * and in Ask Njam it explains and suggests. It never decides a verdict.
 * That is src/services/verdict, which caps anything read here at Caution
 * because nobody has verified it.
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

/* ------------------------------------------------------------------ */
/* Ask Njam                                                            */
/* ------------------------------------------------------------------ */

// These types mirror supabase/functions/ask-njam/validate.ts.
// If you change one, change the other.

export type RecipeIngredient = {
  name: string;
  /** A catalogue product id the function checked exists, or null. */
  productId: string | null;
  /** allergens.slug as the AI tagged it, e.g. "milk", or null. */
  allergen: string | null;
  eNumber: string | null;
};

/**
 * One piece of an Ask Njam answer. The screen draws each type with a
 * design-system component. A product block carries only an id: the app
 * loads that product and the verdict engine decides its chip, never the AI.
 */
export type AskBlock =
  | { type: 'text'; text: string }
  | { type: 'product'; productId: string }
  | { type: 'recipe'; title: string; ingredients: RecipeIngredient[]; steps: string[] }
  | { type: 'suggestions'; prompts: string[] };

export type AskAnswer = {
  /** The conversation this exchange was saved to. New on the first message. */
  conversationId: string;
  blocks: AskBlock[];
};

/** Thrown with a sentence that can be shown to the person as it is. */
export class AskNjamError extends Error {}

type AskReply =
  | { ok: true; data: AskAnswer }
  | { ok: false; error: { code: string; message: string } };

type CompleteReply =
  | { ok: true; data: { completion: string | null } }
  | { ok: false; error: { code: string; message: string } };

/**
 * Sends one message to Ask Njam. Only the message and the conversation id
 * go up: the function reads your rules, scans and earlier messages itself,
 * so nothing the app sends can change what Njam checks against.
 */
export async function askNjam(message: string, conversationId: string | null): Promise<AskAnswer> {
  const { data, error } = await supabase.functions.invoke<AskReply>('ask-njam', {
    body: { message, conversationId },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as AskReply | null;
      if (body && !body.ok) throw new AskNjamError(body.error.message);
    }
    throw new AskNjamError('We could not reach Njam. Check your connection and try again.');
  }

  if (!data || !data.ok) {
    throw new AskNjamError(data?.ok === false ? data.error.message : 'Njam sent back nothing.');
  }
  return data.data;
}

/**
 * Ghost text: the likely rest of what you are typing, or null.
 * Pass an AbortSignal so a request the person has already typed past can be
 * cancelled. Never throws: ghost text is a nicety, so any failure is null.
 */
export async function completeMessage(text: string, signal: AbortSignal): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke<CompleteReply>('ask-njam', {
      body: { mode: 'complete', text },
      signal,
    });
    if (error || !data || !data.ok) return null;
    return data.data.completion;
  } catch {
    return null;
  }
}
