import { createClient } from "@/lib/supabase/server";
import type { MediaRecord } from "@/types/mindmap";

export async function getMediaByMindMapId(mindMapId: string): Promise<MediaRecord[]> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("media")
    .select(
      "id, node_id, mind_map_id, user_id, storage_bucket, storage_path, media_type, mime_type, file_size_bytes, width, height, duration_seconds, preview_image_path, created_at"
    )
    .eq("mind_map_id", mindMapId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
