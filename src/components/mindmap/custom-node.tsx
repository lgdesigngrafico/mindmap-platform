"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Handle, Position } from "@xyflow/react";
import type { MindMapNodeProps, MediaRecord } from "@/types/mindmap";
import { MediaUpload } from "@/components/media/media-upload";
import { MediaPreviewModal } from "@/components/media/media-preview-modal";
import { NodeDetailModal } from "@/components/mindmap/node-detail-modal";
import { getSignedUrl } from "@/lib/storage/media";
import { generateImageFromPrompt } from "@/lib/ai/generate-image";

function CustomNodeComponent({ id, data, selected }: MindMapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(data.label);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaRecord | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGeneratingNodeImage, setIsGeneratingNodeImage] = useState(false);

  const mediaItems = data.mediaItems ?? [];
  const hasImages = mediaItems.some((m) => m.media_type === "image");

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

  async function handleExpandNode(e: React.MouseEvent) {
    e.stopPropagation();
    if (isExpanding || !data.onExpandNode) return;
    setIsExpanding(true);
    try {
      await data.onExpandNode(id, data.label);
    } finally {
      setIsExpanding(false);
    }
  }

  async function handleGenerateNodeImage(e: React.MouseEvent) {
    e.stopPropagation();
    if (isGeneratingNodeImage || !data.image_suggestion || !data.onAttachMedia) return;
    setIsGeneratingNodeImage(true);
    try {
      const blob = await generateImageFromPrompt(data.image_suggestion);
      const file = new File([blob], "ai-generated.webp", { type: "image/webp" });
      await handleAttachMedia(file, () => {});
    } catch {
      // silently ignore individual node generation errors
    } finally {
      setIsGeneratingNodeImage(false);
    }
  }

  const notesPreview = data.notes?.trim() ?? "";

  return (
    <div
      className={`mindmap-node${selected ? " mindmap-node--selected" : ""}${data.isRoot ? " mindmap-node--root" : ""}${hasImages ? " mindmap-node--has-media" : ""}`}
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

      {data.subtitle && (
        <p className="mindmap-node__subtitle">{data.subtitle}</p>
      )}

      {notesPreview && (
        <p className="mindmap-node__notes-preview">
          {notesPreview}
        </p>
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

      <div className="mindmap-node__actions" onMouseDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="mindmap-node__detail-btn"
          onClick={(e) => { e.stopPropagation(); setIsDetailOpen(true); }}
          title="Ver / editar detalhes"
        >
          ✏
        </button>
        {data.onExpandNode && (
          <button
            type="button"
            className={`mindmap-node__expand-btn${isExpanding ? " mindmap-node__expand-btn--loading" : ""}`}
            onClick={handleExpandNode}
            disabled={isExpanding}
            title="Expandir com IA"
          >
            {isExpanding ? <span className="ai-spinner ai-spinner--small" /> : "✨"}
          </button>
        )}
        {data.image_suggestion && data.onAttachMedia && (
          <button
            type="button"
            className={`mindmap-node__expand-btn${isGeneratingNodeImage ? " mindmap-node__expand-btn--loading" : ""}`}
            onClick={handleGenerateNodeImage}
            disabled={isGeneratingNodeImage}
            title="Gerar imagem com IA para este nó"
          >
            {isGeneratingNodeImage ? <span className="ai-spinner ai-spinner--small" /> : "🎨"}
          </button>
        )}
        {data.onAttachMedia && (
          <button
            type="button"
            className="mindmap-node__media-btn"
            onClick={(e) => { e.stopPropagation(); setIsMediaOpen(true); }}
            title="Anexar mídia"
          >
            📎
          </button>
        )}
      </div>

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

      {mounted && isDetailOpen && createPortal(
        <NodeDetailModal
          nodeId={id}
          label={data.label}
          subtitle={data.subtitle}
          notes={data.notes}
          image_suggestion={data.image_suggestion}
          mindMapId={data.mindMapId}
          onAttachMedia={data.onAttachMedia ? handleAttachMedia : undefined}
          onClose={() => setIsDetailOpen(false)}
          onSave={async (nodeId, subtitle, notes, image_suggestion) => {
            if (data.onSaveNodeDetail) {
              await data.onSaveNodeDetail(nodeId, subtitle, notes, image_suggestion);
            } else if (data.onSaveNotes) {
              await data.onSaveNotes(nodeId, notes);
            }
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

  if (media.media_type === "image") {
    return (
      <button
        type="button"
        className="mindmap-node__media-img-btn"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        title="Ver imagem"
      >
        {url ? (
          <img src={url} alt="" className="mindmap-node__media-img" />
        ) : (
          <span className="mindmap-node__media-img-placeholder">🖼</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="mindmap-node__media-thumb"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Ver vídeo"
    >
      <span className="mindmap-node__media-thumb-icon mindmap-node__media-thumb-icon--video">▶</span>
    </button>
  );
}
