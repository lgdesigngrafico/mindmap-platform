"use client";

type NodeToolbarProps = {
  onCreateNode: () => void;
  onDeleteSelection: () => void;
  isDeletingDisabled: boolean;
  onGenerateWithAI: () => void;
  onExportToTasks?: () => void;
};

export function NodeToolbar({
  onCreateNode,
  onDeleteSelection,
  isDeletingDisabled,
  onGenerateWithAI,
  onExportToTasks
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
      <div className="mindmap-toolbar__hint">
        <span>Duplo clique edita</span>
        <span>Delete remove</span>
      </div>
    </div>
  );
}
