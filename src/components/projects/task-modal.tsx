"use client";

import { useState, useEffect } from "react";
import { createTaskAction, updateTaskAction } from "@/lib/actions/tasks";

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

type ClientOption = { id: string; name: string };

type TaskModalProps = {
  task?: Task;
  defaultStatus?: "todo" | "in_progress" | "done";
  clients: ClientOption[];
  onClose: () => void;
  onSaved: (task: Task & { id: string }) => void;
};

type MapNode = {
  id: string;
  label: string;
  notes: string | null;
  parent_node_id: string | null;
  sort_order: number;
};

function buildMapContent(nodes: MapNode[]): React.ReactNode {
  const rootNode = nodes.find((n) => !n.parent_node_id);
  if (!rootNode) return null;

  const slideNodes = nodes.filter((n) => n.parent_node_id === rootNode.id);

  return (
    <div className="task-modal__map-content">
      <h4 className="task-modal__map-root">{rootNode.label}</h4>
      {slideNodes.map((slide) => {
        const children = nodes.filter((n) => n.parent_node_id === slide.id);
        return (
          <div key={slide.id} className="task-modal__map-slide">
            <h5 className="task-modal__map-slide-title">{slide.label}</h5>
            {children.length > 0 ? (
              <div className="task-modal__map-slide-children">
                {children.map((child) => (
                  <div key={child.id} className="task-modal__map-node">
                    <span className="task-modal__map-node-label">{child.label}</span>
                    {child.notes && (
                      <p className="task-modal__map-node-notes">{child.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              slide.notes && <p className="task-modal__map-node-notes">{slide.notes}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TaskModal({ task, defaultStatus = "todo", clients, onClose, onSaved }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done">(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [clientId, setClientId] = useState(task?.client_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [mapNodes, setMapNodes] = useState<MapNode[] | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  useEffect(() => {
    if (!task?.mind_map_id) return;
    setMapLoading(true);
    fetch(`/api/maps/${task.mind_map_id}/nodes`)
      .then((r) => r.json())
      .then((data: { nodes?: MapNode[] }) => {
        if (Array.isArray(data.nodes)) setMapNodes(data.nodes);
      })
      .catch(() => null)
      .finally(() => setMapLoading(false));
  }, [task?.mind_map_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Título é obrigatório."); return; }
    setSaving(true);
    setError("");

    try {
      if (task) {
        await updateTaskAction(task.id, {
          title,
          description,
          status,
          priority,
          due_date: dueDate,
          client_id: clientId
        });
        onSaved({ ...task, title, description: description || null, status, priority, due_date: dueDate || null, client_id: clientId || null });
      } else {
        const id = await createTaskAction({
          title,
          description,
          status,
          priority,
          due_date: dueDate,
          client_id: clientId
        });
        onSaved({ id, title, description: description || null, status, priority, due_date: dueDate || null, client_id: clientId || null, mind_map_id: null });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{task ? "Editar Tarefa" : "Nova Tarefa"}</h2>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <form className="modal__body" onSubmit={handleSubmit}>
          {error && <p className="message message--error">{error}</p>}
          <div className="form-field">
            <label className="form-label">Título *</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-field">
            <label className="form-label">Descrição</label>
            <textarea className="form-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Status</label>
              <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="todo">A Fazer</option>
                <option value="in_progress">Em Andamento</option>
                <option value="done">Concluído</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Prioridade</label>
              <select className="form-input" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Data de entrega</label>
              <input type="date" className="form-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Cliente</label>
              <select className="form-input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— Nenhum —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {task?.mind_map_id && (
            <div className="task-modal__map-section">
              <div className="task-modal__map-header">
                <span className="task-modal__map-label">Conteúdo do Mapa Mental</span>
                {task.mind_map_id && (
                  <a
                    href={`/maps/${task.mind_map_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="task-modal__map-link"
                  >
                    Abrir mapa ↗
                  </a>
                )}
              </div>
              {mapLoading && <p className="task-modal__map-loading">Carregando conteúdo do mapa...</p>}
              {!mapLoading && mapNodes && buildMapContent(mapNodes)}
              {!mapLoading && !mapNodes && <p className="task-modal__map-empty">Nenhum conteúdo disponível.</p>}
            </div>
          )}

          <div className="modal__footer">
            <button type="button" className="button button--secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? "Salvando..." : task ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
