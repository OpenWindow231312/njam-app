/**
 * Reads saved Ask Njam conversations, and takes back a question you edit.
 *
 * The ask-njam edge function writes every message, so a conversation is
 * saved the moment Njam answers and the app never has two versions of it.
 * The one write here is a delete: editing a question (or asking it again)
 * removes it and everything said after it, then the screen asks again and
 * the function saves the new exchange. Messages are never updated in place
 * (there is no update policy). RLS limits both tables to your own
 * conversations.
 */
import { supabase } from '@/lib/supabase';
import type { AskBlock } from '@/services/ai';

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
};

export type ChatMessage = {
  /** A database id, or a temporary one for a message still on its way. */
  id: string;
  role: 'user' | 'assistant';
  blocks: AskBlock[];
};

/** How many past conversations the menu lists. */
const MENU_LIMIT = 20;

/** Your conversations, the one you used last first. */
export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(MENU_LIMIT);
  if (error) throw error;
  return data.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updated_at }));
}

/** Every message in one conversation, oldest first. */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, blocks')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as ChatMessage[];
}

/**
 * Deletes one of your questions and everything said after it.
 *
 * `questionIndex` counts your saved questions from the first, 0 up. The
 * screen counts them the same way (leaving out any that did not go
 * through), so it never needs the saved ids. The edge function stamps each
 * question before its answer, so "from this question's time on" takes the
 * question, its answer and the rest of the conversation.
 */
export async function deleteFromQuestion(conversationId: string, questionIndex: number): Promise<void> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('created_at')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .order('created_at', { ascending: true });
  if (error) throw error;
  const question = data[questionIndex];
  // Not saved yet (its answer never came back): there is nothing to take back.
  if (!question) return;

  const { error: deleteError } = await supabase
    .from('chat_messages')
    .delete()
    .eq('conversation_id', conversationId)
    .gte('created_at', question.created_at);
  if (deleteError) throw deleteError;
}
