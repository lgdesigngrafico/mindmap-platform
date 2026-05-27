import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

export async function ensureProfile(user: User) {
  const supabase = (await createClient()) as any;

  await supabase.from("profiles").upsert({
    id: user.id,
    full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    avatar_url: user.user_metadata.avatar_url ?? null
  } satisfies ProfileInsert);
}

export async function getProfile(userId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role_in_company")
    .eq("id", userId)
    .single();
  return data as { full_name: string | null; role_in_company: string | null } | null;
}
