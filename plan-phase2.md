# Plano Técnico — Fase 2

## Visão Geral

Este documento descreve a implementação completa das três novas funcionalidades adicionadas à plataforma Mindmap na Fase 2.

---

## Features implementadas

| # | Feature | Status |
|---|---------|--------|
| 1 | Chat IA com streaming SSE | Implementado |
| 2 | Gestão de Projetos (Kanban + Calendário) | Implementado |
| 3 | Perfis de Clientes | Implementado |

---

## 1. Modelo de Dados

### Arquivo: `supabase/schema-phase2.sql`

#### Tabelas criadas

| Tabela | Colunas principais | RLS |
|--------|-------------------|-----|
| `clients` | id, user_id, name, company, email, phone, notes, color | owner-only |
| `tasks` | id, user_id, client_id, mind_map_id, title, description, status, priority, due_date | owner-only |
| `chat_conversations` | id, user_id, title, created_at, updated_at | owner-only |
| `chat_messages` | id, conversation_id, role, content, created_at | via conversation owner |

#### ALTER aplicado

```sql
ALTER TABLE public.mind_maps
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
```

#### Índices criados

```
idx_clients_user_id, idx_tasks_user_id, idx_tasks_client_id,
idx_tasks_mind_map_id, idx_tasks_due_date,
idx_chat_conversations_user_id, idx_chat_messages_conversation,
idx_mind_maps_client_id
```

---

## 2. Tipos TypeScript

**Arquivo:** `src/types/database.ts`

Adicionadas as interfaces `Row`, `Insert`, `Update` para todas as novas tabelas:
- `clients`
- `tasks`
- `chat_conversations`
- `chat_messages`

Campo `client_id: string | null` adicionado a `mind_maps`.

---

## 3. Chat IA

### Arquitetura de Streaming

```
Client                          Server
  │                               │
  ├─ POST /api/ai/chat ──────────►│
  │  { conversationId, messages } │
  │                               ├─ Groq API (stream: true)
  │◄─ ReadableStream (SSE) ───────┤
  │  data: {"token": "..."}        │
  │  data: [DONE]                 │
```

### Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/app/api/ai/chat/route.ts` | Endpoint SSE via Groq SDK |
| `src/lib/data/chat.ts` | Queries: listar conversas e mensagens |
| `src/lib/actions/chat.ts` | Server Actions: criar, renomear, deletar conversa; salvar mensagem |
| `src/components/chat/conversation-list.tsx` | Sidebar de conversas |
| `src/components/chat/chat-messages.tsx` | Thread de mensagens com cursor piscante |
| `src/components/chat/chat-input.tsx` | Textarea auto-redimensionável + envio por Enter |
| `src/components/chat/chat-window.tsx` | Controller: streaming + "Criar Mapa Mental" |
| `src/components/chat/chat-layout-client.tsx` | Layout client com sidebar |
| `src/app/(dashboard)/chat/layout.tsx` | Layout server (carrega conversas) |
| `src/app/(dashboard)/chat/page.tsx` | Redirect para conversa mais recente (ou cria nova) |
| `src/app/(dashboard)/chat/[conversationId]/page.tsx` | Página da conversa |

### Botão "Criar Mapa Mental"

Aparece após a última mensagem do assistente. Chama:
1. `POST /api/ai/generate` — gera estrutura de nós via Groq
2. `POST /api/maps/create-from-chat` — persiste mapa no Supabase e redireciona para o editor

---

## 4. Gestão de Projetos

### Kanban

Colunas fixas: **A Fazer** / **Em Andamento** / **Concluído**

Drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable`. Ao soltar um card em outra coluna, chama `updateTaskStatusAction` no servidor e reverte o estado local em caso de erro.

### Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/data/tasks.ts` | Queries: getTasks, getKanbanColumns, getTasksByDate |
| `src/lib/actions/tasks.ts` | Server Actions: criar, atualizar, mover, deletar tarefa; exportar mapa para tarefas |
| `src/components/projects/kanban-board.tsx` | Board com DnD context |
| `src/components/projects/kanban-column.tsx` | Coluna droppable + cards sortable |
| `src/components/projects/task-card.tsx` | Card com prioridade, data, cliente |
| `src/components/projects/task-modal.tsx` | Modal CRUD completo |
| `src/components/projects/calendar-view.tsx` | Calendário mensal client-side |
| `src/app/(dashboard)/projects/page.tsx` | Kanban + filtro por cliente |
| `src/app/(dashboard)/projects/calendar/page.tsx` | Visualização calendário |

### Exportação de Mapa para Tarefas

Botão **"Enviar para Gestão"** no toolbar do mapa chama:
```
POST /api/maps/export-to-tasks
{ mindMapId, clientId? }
```
Cada nó do mapa vira uma tarefa com `status: "todo"`.

### API Routes auxiliares

| Route | Método | Descrição |
|-------|--------|-----------|
| `/api/maps/create-from-chat` | POST | Cria mapa a partir dos nós gerados pelo chat |
| `/api/maps/export-to-tasks` | POST | Converte nós do mapa em tarefas do Kanban |

---

## 5. Perfis de Clientes

### Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/data/clients.ts` | Queries: getClients, getClientById, getClientStats |
| `src/lib/actions/clients.ts` | Server Actions: criar, atualizar, deletar cliente |
| `src/components/clients/client-list.tsx` | Grid com cards + modal embutido |
| `src/components/clients/client-form-modal.tsx` | Modal CRUD com 8 opções de cor |
| `src/components/clients/client-dashboard.tsx` | Estatísticas: mapas, tarefas, concluídas, pendentes |
| `src/app/(dashboard)/clients/page.tsx` | Listagem |
| `src/app/(dashboard)/clients/[id]/page.tsx` | Detalhe: stats + mapas associados + tarefas |

### Vinculação

- `mind_maps.client_id` — associa mapa a cliente
- `tasks.client_id` — associa tarefa a cliente
- Filtro em `/projects?clientId=<id>` — filtra Kanban por cliente

---

## 6. Integração no AppShell

**Arquivo:** `src/components/layout/app-shell.tsx`

Navegação atualizada:
```
Meus mapas  →  /maps
Chat IA     →  /chat
Gestão      →  /projects
Clientes    →  /clients
```

---

## 7. Estilos CSS

**Arquivo:** `src/app/globals.css`

Seções adicionadas:
- `CHAT IA` — sidebar de conversas, balões de mensagem, cursor piscante, input auto-resize
- `MODAL / FORM COMMON` — `.modal-overlay`, `.modal`, `.form-field`, `.form-row`
- `KANBAN` — colunas, cards com prioridade, drag handles
- `CALENDAR` — grade 7 colunas, células, badges de status
- `CLIENTS` — grid de cards, hero de detalhe, stats, color picker
- `PAGE HEADER UTILITIES` — `.page-header__row`, `.page-filter`, `.button--sm`

---

## 8. Fases de Implementação

| Fase | Conteúdo | Status |
|------|----------|--------|
| 1 | Schema SQL + tipos TypeScript | Concluído |
| 2 | Chat IA (streaming + UI) | Concluído |
| 3 | Kanban + exportar mapa | Concluído |
| 4 | Calendário + CRUD Clientes | Concluído |
| 5 | AppShell + CSS + integração | Concluído |

---

## 9. Instruções de Deploy

### 1. Executar SQL no Supabase

```sql
-- Executar na Dashboard do Supabase → SQL Editor
-- Arquivo: supabase/schema-phase2.sql
-- ATENÇÃO: executar na ordem — clients antes do ALTER em mind_maps
```

### 2. Variáveis de ambiente necessárias

Já configuradas na Fase 1:
```
GROQ_API_KEY=<sua chave>
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role>
```

### 3. Instalar dependência nova

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 10. Riscos e Observações

| Risco | Mitigação |
|-------|-----------|
| SSE pode ser cortado por timeouts de proxy/CDN | Vercel tem suporte nativo a streaming; para outros hosts, configurar timeout |
| `chat_messages` RLS depende de `chat_conversations.user_id` | Policy criada com subquery `EXISTS`; funciona nativamente com RLS |
| `@dnd-kit` requer `"use client"` em todos os componentes de drag | Já aplicado em `kanban-board.tsx` e `kanban-column.tsx` |
| `client_id` em `mind_maps` exige `clients` criada antes | O SQL cria `clients` primeiro no arquivo |
