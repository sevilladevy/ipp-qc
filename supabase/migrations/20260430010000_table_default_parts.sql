-- ============ INSPECTION TABLE DEFAULT PARTS ============
-- Links inspection tables to their default parts for quick selection
-- Jalankan SQL ini di Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS public.inspection_table_default_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_meja INTEGER NOT NULL REFERENCES public.inspection_tables(no_meja) ON DELETE CASCADE,
  part_no TEXT NOT NULL REFERENCES public.parts(part_no) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (no_meja, part_no)
);
ALTER TABLE public.inspection_table_default_parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read inspection_table_default_parts" ON public.inspection_table_default_parts;
CREATE POLICY "auth read inspection_table_default_parts" ON public.inspection_table_default_parts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "supervisor manage inspection_table_default_parts" ON public.inspection_table_default_parts;
CREATE POLICY "supervisor manage inspection_table_default_parts" ON public.inspection_table_default_parts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor')) WITH CHECK (public.has_role(auth.uid(),'supervisor'));

CREATE INDEX IF NOT EXISTS idx_inspection_table_default_parts_meja ON public.inspection_table_default_parts (no_meja);
CREATE INDEX IF NOT EXISTS idx_inspection_table_default_parts_part ON public.inspection_table_default_parts (part_no);

-- ============ SEED default parts for existing tables ============
-- Hapus baris di bawah jika tidak ingin seed default
-- INSERT INTO public.inspection_table_default_parts (no_meja, part_no)
-- SELECT t.no_meja, p.part_no
-- FROM public.inspection_tables t
-- CROSS JOIN public.parts p
-- WHERE t.status = 'Aktif'
-- ON CONFLICT DO NOTHING;
