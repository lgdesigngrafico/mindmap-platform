"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { MediaRecord } from "@/types/mindmap";

type SaveMediaRecordInput = {
  nodeId: string;
  mindMapId: string;
  storagePath: string;
  mediaType: "image" | "video";
  mimeType: string;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
};

export async function saveMediaRecord(input: SaveMediaRecordInput): Promise<MediaRecord> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("media")
    .insert({
      node_id: input.nodeId,
      mind_map_id: input.mindMapId,
      user_id: user.id,
      storage_bucket: "mindmap-media",
      storage_path: input.storagePath,
      media_type: input.mediaType,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      duration_seconds: input.durationSeconds ?? null,
    })
    .select(
      "id, node_id, mind_map_id, user_id, storage_bucket, storage_path, media_type, mime_type, file_size_bytes, width, height, duration_seconds, preview_image_path, created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Falha ao salvar metadados da mídia.");
  }

  return data;
}

export async function deleteMedia(mediaId: string): Promise<void> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { data: record, error: fetchError } = await supabase
    .from("media")
    .select("id, storage_path, storage_bucket")
    .eq("id", mediaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!record) {
    throw new Error("Mídia não encontrada.");
  }

  // Remove do Storage (ignora erros de storage para não bloquear a deleção do registro)
  await supabase.storage.from(record.storage_bucket).remove([record.storage_path]);

  const { error: dbError } = await supabase
    .from("media")
    .delete()
    .eq("id", mediaId)
    .eq("user_id", user.id);

  if (dbError) {
    throw new Error(dbError.message);
  }
}

export async function getMediaForNode(nodeId: string): Promise<MediaRecord[]> {
  const user = await requireUser();
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("media")
    .select(
      "id, node_id, mind_map_id, user_id, storage_bucket, storage_path, media_type, mime_type, file_size_bytes, width, height, duration_seconds, preview_image_path, created_at"
    )
    .eq("node_id", nodeId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
