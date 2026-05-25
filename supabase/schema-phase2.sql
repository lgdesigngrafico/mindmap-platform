-- ============================================================
-- FASE 2 — Novas tabelas: Chat IA, Clientes e Tarefas
-- ============================================================

-- Coluna client_id em mind_maps
ALTER TABLE public.mind_maps
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Obs: clients precisa existir antes do ALTER acima; execute na ordem abaixo.

-- ------------------------------------------------------------
-- Clientes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  company    text,
  email      text,
  phone      text,
  notes      text,
  color      text        NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Tarefas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id   uuid        REFERENCES public.clients(id)  ON DELETE SET NULL,
  mind_map_id uuid        REFERENCES public.mind_maps(id) ON DELETE SET NULL,
  title       text        NOT NULL,
  description text,
  status      text        NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in_progress', 'done')),
  priority    text        NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
  due_date    date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Conversas do Chat IA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text        NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Mensagens do Chat IA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_user_id            ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id              ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id            ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_mind_map_id          ON public.tasks(mind_map_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date             ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mind_maps_client_id        ON public.mind_maps(client_id);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_own_all"             ON public.clients;
DROP POLICY IF EXISTS "tasks_own_all"               ON public.tasks;
DROP POLICY IF EXISTS "chat_conversations_own_all"  ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_messages_own_all"       ON public.chat_messages;

CREATE POLICY "clients_own_all"
ON public.clients FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_own_all"
ON public.tasks FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_conversations_own_all"
ON public.chat_conversations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_own_all"
ON public.chat_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc
    WHERE cc.id = conversation_id AND cc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc
    WHERE cc.id = conversation_id AND cc.user_id = auth.uid()
  )
);
