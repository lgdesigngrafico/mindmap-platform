"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  closestCenter
} from "@dnd-kit/core";
import { updateTaskStatusAction, deleteTaskAction } from "@/lib/actions/tasks";
import { KanbanColumn } from "./kanban-column";
import { TaskModal } from "./task-modal";

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

type KanbanBoardProps = {
  initialTasks: Task[];
  clients: ClientOption[];
};

const COLUMN_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  done: "Concluído"
};

const COLUMNS: Array<"todo" | "in_progress" | "done"> = ["todo", "in_progress", "done"];

export function KanbanBoard({ initialTasks, clients }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [defaultStatus, setDefaultStatus] = useState<"todo" | "in_progress" | "done">("todo");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function getColumn(status: string): Task[] {
    return tasks.filter((t) => t.status === status);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    const newStatus = COLUMNS.includes(overId as typeof COLUMNS[number])
      ? (overId as "todo" | "in_progress" | "done")
      : tasks.find((t) => t.id === overId)?.status;

    if (!newStatus) return;

    const task = tasks.find((t) => t.id === draggedId);
    if (!task || task.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === draggedId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateTaskStatusAction(draggedId, newStatus);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === draggedId ? { ...t, status: task.status } : t))
      );
    }
  }

  function handleAddTask(status: "todo" | "in_progress" | "done") {
    setEditingTask(undefined);
    setDefaultStatus(status);
    setModalOpen(true);
  }

  function handleEditTask(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleDeleteTask(id: string) {
    if (!confirm("Remover esta tarefa?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTaskAction(id);
    } catch {
      // silently ignore; next reload will show real state
    }
  }

  function handleSaved(saved: Task) {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === saved.id);
      if (exists) return prev.map((t) => (t.id === saved.id ? saved : t));
      return [saved, ...prev];
    });
  }

  return (
    <div className="kanban">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="kanban__board">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col}
              id={col}
              title={COLUMN_LABELS[col]}
              tasks={getColumn(col)}
              clients={clients}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
      </DndContext>

      {modalOpen && (
        <TaskModal
          task={editingTask}
          defaultStatus={defaultStatus}
          clients={clients}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
