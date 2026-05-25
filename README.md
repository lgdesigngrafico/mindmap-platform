# Mindmap Platform

Base do projeto para uma plataforma web de mapa mental com:

- Next.js 14 + App Router + TypeScript
- Supabase Auth + Postgres + Storage
- Vercel Free
- React Flow (xyflow) para o editor visual

## Escopo implementado nesta base

- autenticação com email/senha
- botão para OAuth com Google
- middleware para rotas protegidas
- dashboard protegido
- CRUD inicial de mapas mentais
- schema SQL inicial do Supabase
- plano técnico salvo em `plan-mindmap.md`

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Banco e autenticação

1. Crie um projeto no Supabase.
2. Execute o SQL de `supabase/schema.sql`.
3. Ative Email/Password em Auth.
4. Opcional: ative Google OAuth e configure a callback:
   - `http://localhost:3000/auth/callback`
   - sua URL pública da Vercel + `/auth/callback`

## Estrutura principal

- `src/app/(auth)` → login e cadastro
- `src/app/(dashboard)` → dashboard e páginas privadas
- `src/components/auth` → formulários e ações de auth
- `src/components/maps` → lista e ações de mapas
- `src/lib/supabase` → clients e middleware
- `supabase/schema.sql` → DDL e RLS

## Próximos passos

1. instalar dependências
2. rodar o projeto localmente
3. validar auth
4. evoluir para o editor com React Flow
5. adicionar upload de mídia por nó
