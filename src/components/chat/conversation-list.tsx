"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { deleteConversationAction, renameConversationAction } from "@/lib/actions/chat";

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

type ConversationListProps = {
  conversations: Conversation[];
  onNewChat: () => void;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

export function ConversationList({ conversations, onNewChat }: ConversationListProps) {
  const pathname = usePathname();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  function startEdit(id: string, currentTitle: string) {
    setEditingId(id);
    setEditingTitle(currentTitle);
  }

  async function confirmEdit(id: string) {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      await renameConversationAction(id, trimmed);
    }
    setEditingId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === "Enter") {
      e.preventDefault();
      void confirmEdit(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  }

  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar__header">
        <span className="chat-sidebar__title">Chat IA</span>
        <button type="button" className="button button--primary button--sm" onClick={onNewChat}>
          + Nova
        </button>
      </div>
      <nav className="chat-sidebar__list">
        {conversations.length === 0 && (
          <p className="chat-sidebar__empty">Nenhuma conversa ainda.</p>
        )}
        {conversations.map((conv) => {
          const isActive = pathname === `/chat/${conv.id}`;
          const isEditing = editingId === conv.id;
          return (
            <div key={conv.id} className={`chat-sidebar__item${isActive ? " chat-sidebar__item--active" : ""}`}>
              {isEditing ? (
                <input
                  className="chat-sidebar__rename-input"
                  value={editingTitle}
                  autoFocus
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => void confirmEdit(conv.id)}
                  onKeyDown={(e) => handleKeyDown(e, conv.id)}
                />
              ) : (
                <Link href={`/chat/${conv.id}`} className="chat-sidebar__link">
                  <span className="chat-sidebar__conv-title">{conv.title}</span>
                  <span className="chat-sidebar__conv-date">{formatDate(conv.updated_at)}</span>
                </Link>
              )}
              <div className="chat-sidebar__actions">
                <button
                  type="button"
                  className="chat-sidebar__rename-btn"
                  title="Renomear conversa"
                  aria-label="Renomear conversa"
                  onClick={() => startEdit(conv.id, conv.title)}
                >
                  ✎
                </button>
                <form action={deleteConversationAction} className="chat-sidebar__delete">
                  <input type="hidden" name="id" value={conv.id} />
                  <button
                    type="submit"
                    className="chat-sidebar__delete-btn"
                    title="Remover conversa"
                    aria-label="Remover conversa"
                  >
                    ×
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
