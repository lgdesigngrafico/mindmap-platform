"use client";

import { useState } from "react";

type NodeDetailModalProps = {
  nodeId: string;
  label: string;
  subtitle: string | null | undefined;
  notes: string | null | undefined;
  image_suggestion: string | null | undefined;
  onClose: () => void;
  onSave: (nodeId: string, subtitle: string | null, notes: string, image_suggestion: string | null) => Promise<void>;
};

export function NodeDetailModal({ nodeId, label, subtitle, notes, image_suggestion, onClose, onSave }: NodeDetailModalProps) {
  const [subtitleValue, setSubtitleValue] = useState(subtitle ?? "");
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [imageSuggestionValue, setImageSuggestionValue] = useState(image_suggestion ?? "");
  const [isSaving, setIsSaving] = useState(false);

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

          <label className="node-detail-modal__label" htmlFor="node-image-suggestion" style={{ marginTop: "1rem" }}>
            Sugestão de Imagem
          </label>
          <textarea
            id="node-image-suggestion"
            className="node-detail-modal__textarea"
            value={imageSuggestionValue}
            onChange={(e) => setImageSuggestionValue(e.target.value)}
            rows={3}
            placeholder="Descrição da imagem ideal para este card: ex. foto de pessoa sorrindo com laptop, fundo desfocado..."
            disabled={isSaving}
          />
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
