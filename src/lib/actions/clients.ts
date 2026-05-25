"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export async function createClientAction(data: {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
  color?: string;
}): Promise<string> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name: data.name.trim(),
      company: data.company?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
      color: data.color || "#6366f1"
    } satisfies ClientInsert)
    .select("id")
    .single();

  if (error || !client) throw new Error(error?.message ?? "Falha ao criar cliente.");

  revalidatePath("/clients");
  return client.id as string;
}

export async function updateClientAction(
  id: string,
  data: Partial<{
    name: string;
    company: string;
    email: string;
    phone: string;
    notes: string;
    color: string;
  }>
): Promise<void> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const update: ClientUpdate = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.company !== undefined) update.company = data.company || null;
  if (data.email !== undefined) update.email = data.email || null;
  if (data.phone !== undefined) update.phone = data.phone || null;
  if (data.notes !== undefined) update.notes = data.notes || null;
  if (data.color !== undefined) update.color = data.color;

  const { error } = await supabase
    .from("clients")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) redirect("/clients");

  const supabase = (await createClient()) as any;
  await supabase.from("clients").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/clients");
  redirect("/clients");
}
