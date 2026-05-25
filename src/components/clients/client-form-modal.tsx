"use client";

import { useState } from "react";
import { createClientAction, updateClientAction } from "@/lib/actions/clients";

type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  color: string;
};

type ClientFormModalProps = {
  client?: Client;
  onClose: () => void;
  onSaved: (client: Client) => void;
};

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4"
];

export function ClientFormModal({ client, onClose, onSaved }: ClientFormModalProps) {
  const [name, setName] = useState(client?.name ?? "");
  const [company, setCompany] = useState(client?.company ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [color, setColor] = useState(client?.color ?? "#6366f1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true);
    setError("");

    try {
      const data = { name, company, email, phone, notes, color };
      if (client) {
        await updateClientAction(client.id, data);
        onSaved({ ...client, ...data, company: company || null, email: email || null, phone: phone || null, notes: notes || null });
      } else {
        const id = await createClientAction(data);
        onSaved({ id, name, company: company || null, email: email || null, phone: phone || null, notes: notes || null, color });
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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{client ? "Editar Cliente" : "Novo Cliente"}</h2>
          <button type="button" className="modal__close" onClick={onClose}>×</button>
        </div>
        <form className="modal__body" onSubmit={handleSubmit}>
          {error && <p className="message message--error">{error}</p>}
          <div className="form-field">
            <label className="form-label">Nome *</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Empresa</label>
              <input className="form-input" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Cor</label>
              <div className="color-picker">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch${color === c ? " color-swatch--active" : ""}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="modal__footer">
            <button type="button" className="button button--secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? "Salvando..." : client ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
