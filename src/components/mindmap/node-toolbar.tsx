"use client";

type NodeToolbarProps = {
  onCreateNode: () => void;
  onDeleteSelection: () => void;
  isDeletingDisabled: boolean;
  onGenerateWithAI: () => void;
  onExportToTasks?: () => void;
  onCopyCarousel?: () => void;
  carouselCopied?: boolean;
};

export function NodeToolbar({
  onCreateNode,
  onDeleteSelection,
  isDeletingDisabled,
  onGenerateWithAI,
  onExportToTasks,
  onCopyCarousel,
  carouselCopied
}: NodeToolbarProps) {
  return (
    <div className="mindmap-toolbar">
      <button type="button" className="button button--ai-toolbar" onClick={onGenerateWithAI}>
        ✨ Gerar com IA
      </button>
      <button type="button" className="button button--primary" onClick={onCreateNode}>
        Novo nó
      </button>
      <button
        type="button"
        className="button button--secondary"
        onClick={onDeleteSelection}
        disabled={isDeletingDisabled}
      >
        Deletar seleção
      </button>
      {onExportToTasks && (
        <button type="button" className="button button--secondary" onClick={onExportToTasks}>
          Enviar para Gestão
        </button>
      )}
      {onCopyCarousel && (
        <button
          type="button"
          className="button button--secondary"
          onClick={onCopyCarousel}
          title="Copiar todos os slides formatados para Instagram"
        >
          {carouselCopied ? "✅ Copiado!" : "📋 Copiar carrossel"}
        </button>
      )}
      <div className="mindmap-toolbar__hint">
        <span>Duplo clique edita</span>
        <span>Delete remove</span>
      </div>
    </div>
  );
}
