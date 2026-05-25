import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getClientById, getClientStats } from "@/lib/data/clients";
import { getTasks } from "@/lib/data/tasks";
import { getMindMapsForUser } from "@/lib/data/mind-maps";
import { ClientDashboard } from "@/components/clients/client-dashboard";

type Props = { params: { id: string } };

export default async function ClientDetailPage({ params }: Props) {
  const user = await requireUser();
  const [client, stats] = await Promise.all([
    getClientById(params.id, user.id),
    getClientStats(params.id, user.id)
  ]);

  if (!client) notFound();

  const [tasks, allMaps] = await Promise.all([
    getTasks(user.id, params.id),
    getMindMapsForUser(user.id)
  ]);

  const clientMaps = (allMaps as Array<{ id: string; title: string; updated_at: string; client_id?: string | null }>)
    .filter((m) => m.client_id === params.id);

  const statusLabel: Record<string, string> = { todo: "A Fazer", in_progress: "Em Andamento", done: "Concluído" };
  const priorityLabel: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta" };

  return (
    <div className="page">
      <header className="page-header">
        <div className="client-detail__hero" style={{ borderLeftColor: client.color }}>
          <div className="client-card__avatar" style={{ background: client.color }}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1>{client.name}</h1>
            {client.company && <p className="client-detail__company">{client.company}</p>}
            <div className="client-detail__meta">
              {client.email && <span>{client.email}</span>}
              {client.phone && <span>{client.phone}</span>}
            </div>
          </div>
        </div>
        <Link href="/clients" className="button button--secondary button--sm">
          ← Voltar
        </Link>
      </header>

      <ClientDashboard stats={stats} clientColor={client.color} />

      {client.notes && (
        <section className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 className="card__section-title">Notas</h2>
          <p>{client.notes}</p>
        </section>
      )}

      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="card__section-title">Mapas Mentais ({clientMaps.length})</h2>
        {clientMaps.length === 0 ? (
          <p className="text-muted">Nenhum mapa associado a este cliente.</p>
        ) : (
          <ul className="map-list">
            {clientMaps.map((m) => (
              <li key={m.id} className="map-list__item">
                <div className="map-list__content">
                  <Link href={`/maps/${m.id}`} className="map-list__title">{m.title}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="card__header">
          <h2 className="card__section-title">Tarefas ({tasks.length})</h2>
          <Link href={`/projects?clientId=${client.id}`} className="button button--secondary button--sm">
            Ver no Kanban
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="text-muted">Nenhuma tarefa associada a este cliente.</p>
        ) : (
          <ul className="task-list">
            {tasks.map((t) => (
              <li key={t.id} className="task-list__item">
                <span className="task-list__title">{t.title}</span>
                <span className="task-list__status">{statusLabel[t.status]}</span>
                <span className={`task-card__priority task-card__priority--${t.priority}`}>
                  {priorityLabel[t.priority]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
