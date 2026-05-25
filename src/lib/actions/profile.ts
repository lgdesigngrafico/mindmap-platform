"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export async function updateProfileAction(data: {
  full_name?: string;
  role_in_company?: string;
}): Promise<void> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const update: ProfileUpdate = {
    updated_at: new Date().toISOString()
  };

  if (data.full_name !== undefined) update.full_name = data.full_name.trim() || null;
  if (data.role_in_company !== undefined) update.role_in_company = data.role_in_company.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/profile");
  revalidatePath("/");
}

export async function getProfileAction(): Promise<{
  full_name: string | null;
  role_in_company: string | null;
  email: string;
} | null> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { data } = await supabase
    .from("profiles")
    .select("full_name, role_in_company")
    .eq("id", user.id)
    .maybeSingle();

  return {
    full_name: data?.full_name ?? null,
    role_in_company: data?.role_in_company ?? null,
    email: user.email ?? ""
  };
}
