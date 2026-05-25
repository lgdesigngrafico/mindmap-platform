"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ChatConversation = Database["public"]["Tables"]["chat_conversations"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export async function getConversations(userId: string): Promise<ChatConversation[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, user_id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getConversationById(
  id: string,
  userId: string
): Promise<ChatConversation | null> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, user_id, title, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getMessagesByConversationId(
  conversationId: string
): Promise<ChatMessage[]> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
