"use client";

import { useEffect, useRef, useState } from "react";
import { generateImageFromPrompt } from "@/lib/ai/generate-image";
import { formatForInstagram, formatForLinkedIn, formatForTikTok } from "@/lib/formatters/social-media";
import type { MediaRecord } from "@/types/mindmap";

type NodeDetailModalProps = {
  nodeId: string;
  label: string;
  subtitle: string | null | undefined;
  notes: string | null | undefined;
  image_suggestion: string | null | undefined;
  onClose: () => void;
  onSave: (nodeId: string, subtitle: string | null, notes: string, image_suggestion: string | null) => Promise<void>;
  mindMapId?: string;
  onAttachMedia?: (file: File, onProgress: (pct: number) => void) => Promise<MediaRecord>;
};

export function NodeDetailModal({
  nodeId,
  label,
  subtitle,
  notes,
  image_suggestion,
  onClose,
  onSave,
  onAttachMedia
}: NodeDetailModalProps) {
  const [subtitleValue, setSubtitleValue] = useState(subtitle ?? "");
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [imageSuggestionValue, setImageSuggestionValue] = useState(image_suggestion ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Feature 1: AI image generation state
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Feature 3: Copy to platform state
  const [showCopyDropdown, setShowCopyDropdown] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(
        nodeId,
        subtitleValue.trim() || null,
        notesValue,
        imageSuggestionValue.trim() || null
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateImage() {
    if (!imageSuggestionValue.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);
    setImagePreviewUrl(null);
    setGeneratedBlob(null);
    try {
      const blob = await generateImageFromPrompt(imageSuggestionValue.trim());
      const url = URL.createObjectURL(blob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setGeneratedBlob(blob);
      setImagePreviewUrl(url);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Falha ao gerar imagem.");
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function handleConfirmImage() {
    if (!generatedBlob || !onAttachMedia) return;
    setIsUploadingImage(true);
    setImageError(null);
    try {
      const file = new File([generatedBlob], "ai-generated.webp", { type: "image/webp" });
      await onAttachMedia(file, () => {});
      setImagePreviewUrl(null);
      setGeneratedBlob(null);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Falha ao salvar imagem.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleCopyTo(platform: "instagram" | "linkedin" | "tiktok") {
    let text = "";
    if (platform === "instagram") {
      text = formatForInstagram(label, subtitleValue, notesValue);
    } else if (platform === "linkedin") {
      text = formatForLinkedIn(label, subtitleValue, notesValue);
    } else {
      text = formatForTikTok(label, subtitleValue, notesValue);
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("Copiado!");
      setShowCopyDropdown(false);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Erro ao copiar");
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="node-detail-overlay" onMouseDown={handleOverlayClick}>
      <div className="node-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="node-detail-modal__header">
          <h2 className="node-detail-modal__title">{label}</h2>
          <button
            type="button"
            className="node-detail-modal__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="node-detail-modal__body">
          <label className="node-detail-modal__label" htmlFor="node-subtitle">
            Subtítulo
          </label>
          <input
            id="node-subtitle"
            className="node-detail-modal__input"
            value={subtitleValue}
            onChange={(e) => setSubtitleValue(e.target.value)}
            placeholder="Frase de apoio ou contexto do slide..."
            disabled={isSaving}
          />

          <label className="node-detail-modal__label" htmlFor="node-notes" style={{ marginTop: "1rem" }}>
            Texto Corpo
          </label>
          <textarea
            id="node-notes"
            className="node-detail-modal__textarea"
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
            rows={7}
            placeholder="Conteúdo completo do slide: o que fazer, como fazer, exemplos e métricas..."
            disabled={isSaving}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
            <label className="node-detail-modal__label" htmlFor="node-image-suggestion">
              Criativo Referência
            </label>
            {/* Feature 3: Copy to platform dropdown */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="button button--secondary button--sm"
                onClick={() => setShowCopyDropdown((v) => !v)}
                disabled={isSaving}
                title="Copiar conteúdo formatado para uma plataforma"
              >
                {copyFeedback ?? "📋 Copiar para..."}
              </button>
              {showCopyDropdown && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 4px)",
                    background: "var(--color-surface, #1e293b)",
                    border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    zIndex: 100,
                    minWidth: "180px",
                    overflow: "hidden"
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {(["instagram", "linkedin", "tiktok"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.6rem 1rem",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "var(--color-text, #f1f5f9)",
                        fontSize: "0.875rem"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      onClick={() => handleCopyTo(p)}
                    >
                      {p === "instagram" && "📸 Instagram"}
                      {p === "linkedin" && "💼 LinkedIn"}
                      {p === "tiktok" && "🎵 TikTok"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <textarea
            id="node-image-suggestion"
            className="node-detail-modal__textarea"
            value={imageSuggestionValue}
            onChange={(e) => setImageSuggestionValue(e.target.value)}
            rows={3}
            placeholder="Descrição da imagem ideal para este card: ex. foto de pessoa sorrindo com laptop, fundo desfocado..."
            disabled={isSaving}
          />

          {/* Feature 1: AI image generation */}
          {onAttachMedia && (
            <div style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                className="button button--secondary button--sm"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imageSuggestionValue.trim() || isUploadingImage}
                title="Gerar imagem com Pollinations.ai (gratuito)"
              >
                {isGeneratingImage ? (
                  <><span className="ai-spinner ai-spinner--small" /> Gerando imagem...</>
                ) : (
                  "🎨 Gerar Imagem com IA"
                )}
              </button>

              {imageError && (
                <p className="message message--error" style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                  {imageError}
                </p>
              )}

              {imagePreviewUrl && (
                <div style={{ marginTop: "0.75rem" }}>
                  <p style={{ fontSize: "0.8rem", marginBottom: "0.5rem", color: "var(--color-text-muted, #9ca3af)" }}>
                    Preview da imagem gerada:
                  </p>
                  <img
                    src={imagePreviewUrl}
                    alt="Imagem gerada pela IA"
                    style={{ width: "100%", maxWidth: 320, borderRadius: 8, display: "block" }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="button button--primary button--sm"
                      onClick={handleConfirmImage}
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? (
                        <><span className="ai-spinner ai-spinner--small" /> Salvando...</>
                      ) : (
                        "Usar esta imagem"
                      )}
                    </button>
                    <button
                      type="button"
                      className="button button--secondary button--sm"
                      onClick={() => {
                        setImagePreviewUrl(null);
                        setGeneratedBlob(null);
                        if (previewUrlRef.current) {
                          URL.revokeObjectURL(previewUrlRef.current);
                          previewUrlRef.current = null;
                        }
                      }}
                      disabled={isUploadingImage}
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="node-detail-modal__footer">
          <button
            type="button"
            className="button button--secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <span className="ai-spinner ai-spinner--small" /> : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
