import { createMindMapAction } from "@/lib/actions/mind-maps";
import { SubmitButton } from "@/components/ui/submit-button";

export function MapCreateForm() {
  return (
    <form action={createMindMapAction} className="card stack">
      <div className="card__header">
        <h2>Novo mapa mental</h2>
        <p>Crie um mapa com título e descrição opcional.</p>
      </div>
      <label className="field">
        <span>Título</span>
        <input name="title" type="text" placeholder="Ex.: Planejamento do produto" required />
      </label>
      <label className="field">
        <span>Descrição</span>
        <textarea name="description" rows={3} placeholder="Resumo do objetivo deste mapa" />
      </label>
      <SubmitButton className="button button--primary" pendingLabel="Criando mapa...">
        Criar mapa
      </SubmitButton>
    </form>
  );
}
