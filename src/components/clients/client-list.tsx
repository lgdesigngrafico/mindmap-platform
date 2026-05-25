"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteClientAction } from "@/lib/actions/clients";
import { ClientFormModal } from "./client-form-modal";

type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  color: string;
};

type ClientListProps = {
  initialClients: Client[];
};

export function ClientList({ initialClients }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);

  function handleSaved(saved: Client) {
    setClients((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) return prev.map((c) => (c.id === saved.id ? saved : c));
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  return (
    <div className="client-section">
      <div className="client-section__header">
        <h2>Seus Clientes</h2>
        <button
          type="button"
          className="button button--primary"
          onClick={() => { setEditingClient(undefined); setModalOpen(true); }}
        >
          + Novo Cliente
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="card empty-state">
          <p>Nenhum cliente cadastrado ainda.</p>
        </div>
      ) : (
        <div className="client-grid">
          {clients.map((client) => (
            <div key={client.id} className="client-card" style={{ borderTopColor: client.color }}>
              <div className="client-card__avatar" style={{ background: client.color }}>
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="client-card__info">
                <Link href={`/clients/${client.id}`} className="client-card__name">
                  {client.name}
                </Link>
                {client.company && <p className="client-card__company">{client.company}</p>}
                {client.email && <p className="client-card__meta">{client.email}</p>}
                {client.phone && <p className="client-card__meta">{client.phone}</p>}
              </div>
              <div className="client-card__actions">
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={() => { setEditingClient(client); setModalOpen(true); }}
                >
                  Editar
                </button>
                <form action={deleteClientAction} onSubmit={(e) => {
                  if (!confirm(`Remover cliente "${client.name}"?`)) e.preventDefault();
                }}>
                  <input type="hidden" name="id" value={client.id} />
                  <button type="submit" className="button button--danger button--sm">Deletar</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ClientFormModal
          client={editingClient}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
