"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./task-card";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  client_id: string | null;
  mind_map_id: string | null;
};

type ClientOption = { id: string; name: string; color: string };

type KanbanColumnProps = {
  id: "todo" | "in_progress" | "done";
  title: string;
  tasks: Task[];
  clients: ClientOption[];
  onAddTask: (status: "todo" | "in_progress" | "done") => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
};

function SortableCard({
  task,
  clients,
  onEdit,
  onDelete
}: {
  task: Task;
  clients: ClientOption[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} clients={clients} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

export function KanbanColumn({
  id,
  title,
  tasks,
  clients,
  onAddTask,
  onEditTask,
  onDeleteTask
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={`kanban-col kanban-col--${id}${isOver ? " kanban-col--over" : ""}`}>
      <div className="kanban-col__header">
        <h3 className="kanban-col__title">{title}</h3>
        <span className="kanban-col__count">{tasks.length}</span>
      </div>
      <div className="kanban-col__body" ref={setNodeRef}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              clients={clients}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <p className="kanban-col__empty">Nenhuma tarefa</p>
        )}
      </div>
      <button
        type="button"
        className="kanban-col__add"
        onClick={() => onAddTask(id)}
      >
        + Adicionar
      </button>
    </div>
  );
}
