"use client";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  client_id: string | null;
};

type ClientOption = { id: string; name: string; color: string };

type TaskCardProps = {
  task: Task;
  clients: ClientOption[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

const priorityLabel: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta"
};

const priorityClass: Record<string, string> = {
  low: "task-card__priority--low",
  medium: "task-card__priority--medium",
  high: "task-card__priority--high"
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(date + "T00:00:00"));
}

export function TaskCard({ task, clients, onEdit, onDelete }: TaskCardProps) {
  const client = clients.find((c) => c.id === task.client_id);

  return (
    <div className="task-card">
      <div className="task-card__header">
        <span className={`task-card__priority ${priorityClass[task.priority]}`}>
          {priorityLabel[task.priority]}
        </span>
        <div className="task-card__actions">
          <button
            type="button"
            className="task-card__btn"
            onClick={() => onEdit(task)}
            aria-label="Editar tarefa"
          >
            ✎
          </button>
          <button
            type="button"
            className="task-card__btn task-card__btn--delete"
            onClick={() => onDelete(task.id)}
            aria-label="Deletar tarefa"
          >
            ×
          </button>
        </div>
      </div>
      <p className="task-card__title">{task.title}</p>
      {task.description && <p className="task-card__desc">{task.description}</p>}
      <div className="task-card__footer">
        {task.due_date && (
          <span className="task-card__date">{formatDate(task.due_date)}</span>
        )}
        {client && (
          <span className="task-card__client" style={{ borderColor: client.color, color: client.color }}>
            {client.name}
          </span>
        )}
      </div>
    </div>
  );
}
