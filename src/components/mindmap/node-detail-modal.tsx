"use client";

import { useState } from "react";

type NodeDetailModalProps = {
  nodeId: string;
  label: string;
  notes: string | null | undefined;
  onClose: () => void;
  onSave: (nodeId: string, notes: string) => Promise<void>;
};

export function NodeDetailModal({ nodeId, label, notes, onClose, onSave }: NodeDetailModalProps) {
  const [value, setValue] = useState(notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(nodeId, value);
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
          <label className="node-detail-modal__label" htmlFor="node-notes">
            Conteúdo / Instruções
          </label>
          <textarea
            id="node-notes"
            className="node-detail-modal__textarea"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={10}
            placeholder="Descreva o que fazer, como fazer e métricas de sucesso para este tópico..."
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
