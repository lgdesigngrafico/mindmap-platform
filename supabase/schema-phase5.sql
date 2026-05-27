-- Phase 5: Brand Kit per client

CREATE TABLE IF NOT EXISTS public.brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  primary_color text DEFAULT '#7c3aed',
  secondary_color text DEFAULT '#3b82f6',
  accent_color text DEFAULT '#10b981',
  brand_voice text,
  target_audience text,
  visual_references text,
  hashtags text,
  dos text,
  donts text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_kits_own_all" ON public.brand_kits FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_brand_kits_client_id ON public.brand_kits(client_id);
