"use client";

import { createClient } from "@/lib/supabase/client";
import { saveMediaRecord } from "@/lib/actions/media";
import type { MediaRecord } from "@/types/mindmap";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4"];
const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const VIDEO_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const IMAGE_MAX_SIDE = 1600;
const IMAGE_QUALITY = 0.8;

export function validateMediaFile(file: File): string | null {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return "Tipo não suportado. Use JPG, PNG, WebP ou MP4.";
  }
  if (isImage && file.size > IMAGE_MAX_BYTES) {
    return `Imagem muito grande: ${(file.size / 1024 / 1024).toFixed(1)} MB. Máx: 2 MB.`;
  }
  if (isVideo && file.size > VIDEO_MAX_BYTES) {
    return `Vídeo muito grande: ${(file.size / 1024 / 1024).toFixed(1)} MB. Máx: 15 MB.`;
  }
  return null;
}

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > IMAGE_MAX_SIDE || height > IMAGE_MAX_SIDE) {
        if (width >= height) {
          height = Math.round((height * IMAGE_MAX_SIDE) / width);
          width = IMAGE_MAX_SIDE;
        } else {
          width = Math.round((width * IMAGE_MAX_SIDE) / height);
          height = IMAGE_MAX_SIDE;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Contexto de canvas indisponível"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Falha ao comprimir imagem"));
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        IMAGE_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Falha ao carregar imagem para compressão"));
    };

    img.src = objectUrl;
  });
}

function buildStoragePath(userId: string, mindMapId: string, nodeId: string, file: File): string {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${mindMapId}/${nodeId}/${timestamp}-${safeName}`;
}

export async function uploadMedia(
  params: { nodeId: string; mindMapId: string; file: File },
  onProgress?: (pct: number) => void
): Promise<MediaRecord> {
  const { nodeId, mindMapId, file } = params;

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

  let fileToUpload = file;
  if (isImage) {
    onProgress?.(5);
    fileToUpload = await compressImage(file);
  }

  onProgress?.(15);

  const storagePath = buildStoragePath(user.id, mindMapId, nodeId, fileToUpload);

  // Simula progresso durante o upload
  let simPct = 15;
  const interval = setInterval(() => {
    simPct = Math.min(simPct + 7, 80);
    onProgress?.(simPct);
  }, 350);

  let uploadedPath: string;
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("mindmap-media")
      .upload(storagePath, fileToUpload, {
        contentType: fileToUpload.type,
        upsert: false
      });

    clearInterval(interval);

    if (uploadError || !uploadData) {
      throw new Error(uploadError?.message ?? "Falha no upload do arquivo.");
    }

    uploadedPath = uploadData.path;
  } catch (err) {
    clearInterval(interval);
    throw err;
  }

  onProgress?.(90);

  let record: MediaRecord;
  try {
    record = await saveMediaRecord({
      nodeId,
      mindMapId,
      storagePath: uploadedPath,
      mediaType: isImage ? "image" : "video",
      mimeType: fileToUpload.type,
      fileSizeBytes: fileToUpload.size
    });
  } catch (err) {
    // Limpa o arquivo do storage se falhar ao salvar metadados
    await supabase.storage.from("mindmap-media").remove([uploadedPath]);
    throw err;
  }

  onProgress?.(100);
  return record;
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("mindmap-media")
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Falha ao gerar URL de acesso.");
  }

  return data.signedUrl;
}
