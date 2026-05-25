import Link from "next/link";
import { deleteMindMapAction } from "@/lib/actions/mind-maps";
import { SubmitButton } from "@/components/ui/submit-button";

type MindMapListItem = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type MapListProps = {
  maps: MindMapListItem[];
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(date));
}

export function MapList({ maps }: MapListProps) {
  if (!maps.length) {
    return (
      <section className="card empty-state">
        <h2>Você ainda não tem mapas</h2>
        <p>Crie o primeiro mapa para começar a estruturar ideias, projetos ou estudos.</p>
      </section>
    );
  }

  return (
    <section className="card stack">
      <div className="card__header">
        <h2>Seus mapas</h2>
        <p>Abra ou remova mapas mentais já criados.</p>
      </div>
      <ul className="map-list">
        {maps.map((map) => (
          <li key={map.id} className="map-list__item">
            <div className="map-list__content">
              <Link href={`/maps/${map.id}`} className="map-list__title">
                {map.title}
              </Link>
              <p>{map.description || "Sem descrição"}</p>
              <small>Atualizado em {formatDate(map.updated_at)}</small>
            </div>
            <form action={deleteMindMapAction} className="map-list__actions">
              <input type="hidden" name="id" value={map.id} />
              <SubmitButton className="button button--danger" pendingLabel="Removendo...">
                Deletar
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
