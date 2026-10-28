/**
 * What "+" in Ask Njam brings back to the typing bar: a product you scanned,
 * or an ingredient list read from a label photo.
 *
 * The Scanner opens on its own route (/ask-scan) and the chat waits under
 * it. When the Scanner has its result it leaves it here and goes back; the
 * chat takes it as soon as it is on screen again. A route param would also
 * work, but a whole label read is too big to put in a URL, and taking it
 * from here empties it, so it can never be added twice.
 */
import type { LabelRead } from '@/services/ai';

export type Attachment =
  | { kind: 'product'; productId: string }
  | { kind: 'label'; photoUri: string; read: LabelRead };

let waiting: Attachment | null = null;

/** The Scanner calls this with its result, just before it goes back to the chat. */
export function handToAskNjam(attachment: Attachment) {
  waiting = attachment;
}

/** The chat calls this when it comes back on screen. Returns null when nothing is waiting. */
export function takeAttachment(): Attachment | null {
  const attachment = waiting;
  waiting = null;
  return attachment;
}
