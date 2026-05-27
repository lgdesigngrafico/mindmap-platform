"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type BrandKitRow = Database["public"]["Tables"]["brand_kits"]["Row"];

export async function getBrandKit(
  clientId: string,
  userId: string
): Promise<BrandKitRow | null> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("client_id", clientId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getBrandKitByClientId(clientId: string): Promise<BrandKitRow | null> {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function buildBrandContext(brandKit: BrandKitRow): Promise<string> {
  const lines: string[] = [];
  if (brandKit.brand_voice) lines.push(`Tom de voz: ${brandKit.brand_voice}`);
  if (brandKit.target_audience) lines.push(`Público-alvo: ${brandKit.target_audience}`);
  if (brandKit.primary_color) {
    lines.push(
      `Cores da marca: primária ${brandKit.primary_color}, secundária ${brandKit.secondary_color}, destaque ${brandKit.accent_color}`
    );
  }
  if (brandKit.hashtags) lines.push(`Hashtags padrão: ${brandKit.hashtags}`);
  if (brandKit.dos) lines.push(`O que fazer: ${brandKit.dos}`);
  if (brandKit.donts) lines.push(`O que não fazer: ${brandKit.donts}`);
  if (brandKit.visual_references) lines.push(`Referências visuais: ${brandKit.visual_references}`);
  return lines.join("\n");
}
