"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Handle, Position } from "@xyflow/react";
import type { MindMapNodeProps, MediaRecord } from "@/types/mindmap";
import { MediaUpload } from "@/components/media/media-upload";
import { MediaPreviewModal } from "@/components/media/media-preview-modal";
import { getSignedUrl } from "@/lib/storage/media";

function CustomNodeComponent({ id, data, selected }: MindMapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(data.label);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaRecord | null>(null);
  const [mounted, setMounted] = useState(false);

  const mediaItems = data.mediaItems ?? [];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setValue(data.label);
  }, [data.label]);

  function submit() {
    setIsEditing(false);
    data.onChangeLabel(id, value);
  }

  function handleAttachMedia(file: File, onProgress: (pct: number) => void) {
    return data.onAttachMedia!(id, data.mindMapId!, file, onProgress);
  }

  function handleDeleteMedia(media: MediaRecord) {
    return data.onDeleteMedia!(media);
  }

  return (
    <div
      className={`mindmap-node${selected ? " mindmap-node--selected" : ""}${data.isRoot ? " mindmap-node--root" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="mindmap-node__handle" />

      {isEditing ? (
        <input
          autoFocus
          className="mindmap-node__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); submit(); }
            if (e.key === "Escape") { setValue(data.label); setIsEditing(false); }
          }}
        />
      ) : (
        <button
          type="button"
          className="mindmap-node__label"
          onDoubleClick={() => setIsEditing(true)}
          onClick={() => setIsEditing(true)}
        >
          {data.label || "Novo nó"}
        </button>
      )}

      {mediaItems.length > 0 && (
        <div
          className="mindmap-node__media-strip"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {mediaItems.map((media) => (
            <MediaThumb
              key={media.id}
              media={media}
              onClick={() => setPreviewMedia(media)}
            />
          ))}
        </div>
      )}

      {data.onAttachMedia && (
        <div className="mindmap-node__media-bar" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="mindmap-node__media-btn"
            onClick={(e) => { e.stopPropagation(); setIsMediaOpen(true); }}
            title="Anexar mídia"
          >
            📎
          </button>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="mindmap-node__handle" />

      {mounted && isMediaOpen && createPortal(
        <MediaUpload
          nodeId={id}
          mindMapId={data.mindMapId ?? ""}
          mediaItems={mediaItems}
          onClose={() => setIsMediaOpen(false)}
          onAttach={handleAttachMedia}
          onDelete={handleDeleteMedia}
        />,
        document.body
      )}

      {mounted && previewMedia && createPortal(
        <MediaPreviewModal
          media={previewMedia}
          onClose={() => setPreviewMedia(null)}
          onDelete={async () => {
            await handleDeleteMedia(previewMedia);
            setPreviewMedia(null);
          }}
        />,
        document.body
      )}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);

// ── Thumbnail shown inside the node ──────────────────────────────────────────

type MediaThumbProps = {
  media: MediaRecord;
  onClick: () => void;
};

function MediaThumb({ media, onClick }: MediaThumbProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedUrl(media.storage_path)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [media.storage_path]);

  return (
    <button
      type="button"
      className="mindmap-node__media-thumb"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={media.media_type === "image" ? "Ver imagem" : "Ver vídeo"}
    >
      {media.media_type === "image" && url ? (
        <img src={url} alt="" className="mindmap-node__media-thumb-img" />
      ) : media.media_type === "image" ? (
        <span className="mindmap-node__media-thumb-icon">🖼</span>
      ) : (
        <span className="mindmap-node__media-thumb-icon mindmap-node__media-thumb-icon--video">▶</span>
      )}
    </button>
  );
}
