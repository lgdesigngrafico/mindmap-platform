"use client";

import { useRef, useState } from "react";
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, validateMediaFile } from "@/lib/storage/media";
import type { MediaRecord } from "@/types/mindmap";

const IMAGE_LIMIT = 3;
const VIDEO_LIMIT = 1;

type MediaUploadProps = {
  nodeId: string;
  mindMapId: string;
  mediaItems: MediaRecord[];
  onClose: () => void;
  onAttach: (file: File, onProgress: (pct: number) => void) => Promise<MediaRecord>;
  onDelete: (media: MediaRecord) => Promise<void>;
};

export function MediaUpload({
  mediaItems,
  onClose,
  onAttach,
  onDelete
}: MediaUploadProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const images = mediaItems.filter((m) => m.media_type === "image");
  const videos = mediaItems.filter((m) => m.media_type === "video");
  const canAddImage = images.length < IMAGE_LIMIT;
  const canAddVideo = videos.length < VIDEO_LIMIT;
  const canAdd = canAddImage || canAddVideo;
  const isUploading = progress !== null;

  const acceptTypes = [
    ...(canAddImage ? ALLOWED_IMAGE_TYPES : []),
    ...(canAddVideo ? ALLOWED_VIDEO_TYPES : [])
  ].join(",");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setError(null);

    const validationError = validateMediaFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (isImage && !canAddImage) {
      setError(`Limite de ${IMAGE_LIMIT} imagens por nó atingido.`);
      return;
    }
    if (isVideo && !canAddVideo) {
      setError(`Limite de ${VIDEO_LIMIT} vídeo por nó atingido.`);
      return;
    }

    setProgress(0);
    try {
      await onAttach(file, (pct) => setProgress(pct));
      setProgress(null);
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "Falha no upload.");
    }
  }

  async function handleDelete(media: MediaRecord) {
    setDeletingId(media.id);
    try {
      await onDelete(media);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !isUploading) onClose();
  }

  return (
    <div className="media-dialog-overlay" onClick={handleOverlayClick}>
      <div className="media-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="media-dialog__header">
          <span className="media-dialog__title">Mídias do nó</span>
          <button
            type="button"
            className="media-dialog__close"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {mediaItems.length > 0 && (
          <div className="media-dialog__items">
            {mediaItems.map((media) => (
              <div
                key={media.id}
                className={`media-dialog__item${deletingId === media.id ? " media-dialog__item--deleting" : ""}`}
              >
                <span className="media-dialog__item-icon">
                  {media.media_type === "image" ? "🖼" : "▶"}
                </span>
                <span className="media-dialog__item-type">
                  {media.media_type === "image" ? "Imagem" : "Vídeo"}
                </span>
                <span className="media-dialog__item-size">
                  {(media.file_size_bytes / 1024).toFixed(0)} KB
                </span>
                <button
                  type="button"
                  className="media-dialog__item-delete"
                  onClick={() => handleDelete(media)}
                  disabled={deletingId === media.id || isUploading}
                  aria-label="Remover"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {canAdd && !isUploading && (
          <label className="media-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              onChange={handleFileChange}
              className="media-upload-area__input"
            />
            <div className="media-upload-area__content">
              <span className="media-upload-area__icon">📎</span>
              <span className="media-upload-area__text">Clique para selecionar arquivo</span>
              <span className="media-upload-area__hint">
                {canAddImage && `Imagens: JPG, PNG, WebP — máx. 2 MB`}
                {canAddImage && canAddVideo && " · "}
                {canAddVideo && `Vídeo: MP4 — máx. 15 MB`}
              </span>
            </div>
          </label>
        )}

        {!canAdd && !isUploading && (
          <p className="media-dialog__limit-msg">
            Limite atingido: {IMAGE_LIMIT} imagens + {VIDEO_LIMIT} vídeo por nó.
          </p>
        )}

        {isUploading && (
          <div className="media-upload-progress">
            <div className="media-upload-progress__track">
              <div
                className="media-upload-progress__fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="media-upload-progress__label">
              {(progress ?? 0) < 100 ? `Enviando… ${progress}%` : "Concluído!"}
            </span>
          </div>
        )}

        {error && (
          <p className="message message--error media-dialog__error">{error}</p>
        )}
      </div>
    </div>
  );
}
