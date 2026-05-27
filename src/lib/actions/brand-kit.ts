"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

type BrandKitInput = {
  clientId: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  brand_voice?: string;
  target_audience?: string;
  visual_references?: string;
  hashtags?: string;
  dos?: string;
  donts?: string;
};

export async function saveBrandKitAction(input: BrandKitInput): Promise<void> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { data: existing } = await supabase
    .from("brand_kits")
    .select("id")
    .eq("client_id", input.clientId)
    .eq("user_id", user.id)
    .maybeSingle();

  const payload = {
    primary_color: input.primary_color ?? "#7c3aed",
    secondary_color: input.secondary_color ?? "#3b82f6",
    accent_color: input.accent_color ?? "#10b981",
    brand_voice: input.brand_voice?.trim() || null,
    target_audience: input.target_audience?.trim() || null,
    visual_references: input.visual_references?.trim() || null,
    hashtags: input.hashtags?.trim() || null,
    dos: input.dos?.trim() || null,
    donts: input.donts?.trim() || null,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    const { error } = await supabase
      .from("brand_kits")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("brand_kits").insert({
      client_id: input.clientId,
      user_id: user.id,
      ...payload
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/clients/${input.clientId}`);
}
