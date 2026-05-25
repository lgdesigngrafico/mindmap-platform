"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

type MindMapInsert = Database["public"]["Tables"]["mind_maps"]["Insert"];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createMindMapAction(formData: FormData) {
  const user = await requireUser();
  const title = getString(formData, "title");
  const description = getString(formData, "description");

  if (!title) {
    redirect("/maps?error=Informe%20um%20t%C3%ADtulo%20para%20o%20mapa.");
  }

  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("mind_maps")
    .insert({
      user_id: user.id,
      title,
      description: description || null
    } satisfies MindMapInsert)
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/maps?error=${encodeURIComponent(error?.message ?? "Falha ao criar o mapa.")}`);
  }

  revalidatePath("/maps");
  redirect(`/maps/${data.id}`);
}

export async function deleteMindMapAction(formData: FormData) {
  const user = await requireUser();
  const id = getString(formData, "id");

  if (!id) {
    redirect("/maps?error=Mapa%20inv%C3%A1lido.");
  }

  const supabase = (await createClient()) as any;
  const { error } = await supabase
    .from("mind_maps")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    redirect(`/maps?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/maps");
  redirect("/maps?message=Mapa%20removido%20com%20sucesso.");
}
