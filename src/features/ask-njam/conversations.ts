/**
 * Reads saved Ask Njam conversations.
 *
 * Only reads. The ask-njam edge function writes every message, so a
 * conversation is saved the moment Njam answers and the app never has two
 * versions of it. RLS limits both tables to your own conversations.
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
