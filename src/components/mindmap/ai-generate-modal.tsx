"use client";

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";

type AiGenerateModalProps = {
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
};

const TEMPLATES = [
  { label: "Funil de Vendas", prompt: "Funil de vendas para curso online" },
  { label: "Plano de Negócio", prompt: "Plano de negócio para startup" },
  { label: "Brainstorm de Produto", prompt: "Brainstorm de produto digital inovador" },
  { label: "Análise SWOT", prompt: "Análise SWOT de uma empresa de tecnologia" },
  { label: "Planejamento de Conteúdo", prompt: "Planejamento de conteúdo para redes sociais" },
  { label: "Mapa de Estudo", prompt: "Mapa de estudo para aprender programação" }
];

export function AiGenerateModal({ onClose, onGenerate, isGenerating, error }: AiGenerateModalProps) {
  const [prompt, setPrompt] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && !isGenerating) {
      onClose();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    await onGenerate(prompt.trim());
  }

  if (!mounted) return null;

  return createPortal(
    <div className="ai-modal-overlay" onClick={handleOverlayClick}>
      <div className="ai-modal">
        <div className="ai-modal__header">
          <span className="ai-modal__title">✨ Gerar mapa com IA</span>
          <button
            type="button"
            className="media-dialog__close"
            onClick={onClose}
            disabled={isGenerating}
          >
            Fechar
          </button>
        </div>

        <div className="ai-modal__templates">
          <span className="ai-modal__templates-label">Templates rápidos</span>
          <div className="ai-modal__templates-list">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                className={`ai-modal__template-btn${prompt === t.prompt ? " ai-modal__template-btn--active" : ""}`}
                onClick={() => setPrompt(t.prompt)}
                disabled={isGenerating}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <form className="ai-modal__form" onSubmit={handleSubmit}>
          <textarea
            className="ai-modal__textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={"Descreva o tema do seu mapa mental...\nEx: Funil de vendas para curso online, Plano de marketing digital, Estrutura de startup SaaS"}
            rows={4}
            disabled={isGenerating}
            autoFocus
          />
          {error && <p className="message message--error">{error}</p>}
          <button
            type="submit"
            className="button button--ai button--full"
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="ai-spinner" />
                Gerando mapa...
              </>
            ) : (
              <>✨ Gerar mapa</>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
