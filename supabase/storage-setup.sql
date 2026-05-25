-- ======================================================
-- Supabase Storage Setup — Mindmap Platform
-- ======================================================
-- Execute este script no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/otvnzvlpyyctwpzqltbk/sql/new
--
-- ATENÇÃO: Execute ANTES de testar uploads de mídia.
-- ======================================================

-- 1. Criar bucket privado 'mindmap-media'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mindmap-media',
  'mindmap-media',
  false,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Remover políticas antigas (idempotente)
DROP POLICY IF EXISTS "media_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "media_select_own" ON storage.objects;
DROP POLICY IF EXISTS "media_delete_own" ON storage.objects;

-- 3. Upload apenas no próprio prefixo (user_id/)
CREATE POLICY "media_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mindmap-media'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 4. Leitura apenas do próprio prefixo
CREATE POLICY "media_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'mindmap-media'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 5. Deleção apenas do próprio prefixo
CREATE POLICY "media_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mindmap-media'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
