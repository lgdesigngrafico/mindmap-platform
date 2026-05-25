"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getSignedUrl } from "@/lib/storage/media";
import type { MediaRecord } from "@/types/mindmap";

type MediaPreviewModalProps = {
  media: MediaRecord;
  onClose: () => void;
  onDelete: () => Promise<void>;
};

export function MediaPreviewModal({ media, onClose, onDelete }: MediaPreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSignedUrl(media.storage_path)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [media.storage_path]);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete();
    } catch {
      setIsDeleting(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return createPortal(
    <div className="media-preview-overlay" onClick={handleOverlayClick}>
      <div className="media-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="media-preview-modal__header">
          <button
            type="button"
            className="button button--danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Removendo…" : "Remover"}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={onClose}
          >
            ✕ Fechar
          </button>
        </div>
        <div className="media-preview-modal__body">
          {!url && <p className="media-preview-modal__loading">Carregando…</p>}
          {url && media.media_type === "image" && (
            <img src={url} alt="Preview" className="media-preview-modal__image" />
          )}
          {url && media.media_type === "video" && (
            <video
              src={url}
              controls
              className="media-preview-modal__video"
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
