import { requireUser } from "@/lib/auth/session";
import { getTasks } from "@/lib/data/tasks";
import { getClients } from "@/lib/data/clients";
import { KanbanBoard } from "@/components/projects/kanban-board";

type Props = {
  searchParams: { clientId?: string };
};

export default async function ProjectsPage({ searchParams }: Props) {
  const user = await requireUser();
  const [tasks, clients] = await Promise.all([
    getTasks(user.id, searchParams.clientId),
    getClients(user.id)
  ]);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__row">
          <div>
            <h1>Gestão de Projetos</h1>
            <p>Organize suas tarefas em colunas de status.</p>
          </div>
          <div className="page-header__actions">
            <a href="/projects/calendar" className="button button--secondary">Calendário</a>
          </div>
        </div>
        {clients.length > 0 && (
          <div className="page-filter">
            <span className="page-filter__label">Filtrar por cliente:</span>
            <a
              href="/projects"
              className={`button button--sm ${!searchParams.clientId ? "button--primary" : "button--secondary"}`}
            >
              Todos
            </a>
            {clients.map((c) => (
              <a
                key={c.id}
                href={`/projects?clientId=${c.id}`}
                className={`button button--sm ${searchParams.clientId === c.id ? "button--primary" : "button--secondary"}`}
                style={{ borderColor: c.color }}
              >
                {c.name}
              </a>
            ))}
          </div>
        )}
      </header>
      <KanbanBoard
        initialTasks={tasks}
        clients={clients.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
      />
    </div>
  );
}
