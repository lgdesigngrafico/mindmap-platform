"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

type ConversationInsert = Database["public"]["Tables"]["chat_conversations"]["Insert"];
type MessageInsert = Database["public"]["Tables"]["chat_messages"]["Insert"];

export async function createConversationAction(title?: string): Promise<string> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: user.id,
      title: title?.trim() || "Nova conversa"
    } satisfies ConversationInsert)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao criar conversa.");
  }

  revalidatePath("/chat");
  return data.id as string;
}

export async function updateConversationTitleAction(
  conversationId: string,
  title: string
): Promise<void> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  await supabase
    .from("chat_conversations")
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  revalidatePath("/chat");
}

export async function renameConversationAction(
  conversationId: string,
  newTitle: string
): Promise<void> {
  return updateConversationTitleAction(conversationId, newTitle);
}

export async function deleteConversationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id") as string;

  if (!id) redirect("/chat");

  const supabase = (await createClient()) as any;
  await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/chat");
  redirect("/chat");
}

export async function saveMessageAction(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const supabase = (await createClient()) as any;

  const { error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      role,
      content
    } satisfies MessageInsert);

  if (error) throw new Error(error.message);

  await supabase
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
