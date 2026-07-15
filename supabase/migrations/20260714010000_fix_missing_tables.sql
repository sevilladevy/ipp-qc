-- ============ FIX MISSING TABLES ============
-- Jalankan di Supabase Dashboard -> SQL Editor
-- Atau via CLI: supabase db execute --file fix_missing_tables.sql

-- ============ DEFECT TYPES TABLE ============
CREATE TABLE IF NOT EXISTS public.defect_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_defect TEXT UNIQUE NOT NULL,
  nama_defect TEXT NOT NULL,
  kategori_defect TEXT,
  urutan INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.defect_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read defect_types" ON public.defect_types;
CREATE POLICY "auth read defect_types" ON public.defect_types FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "supervisor manage defect_types" ON public.defect_types;
CREATE POLICY "supervisor manage defect_types" ON public.defect_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor')) WITH CHECK (public.has_role(auth.uid(),'supervisor'));

-- ============ TABLE DEFAULT PARTS ============
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

-- ============ SEED DEFECT TYPES ============
INSERT INTO public.defect_types (kode_defect, nama_defect, kategori_defect, urutan) VALUES
  ('SHORT_SHOT', 'Short Shot', 'Proses', 1),
  ('LIPAT', 'Lipat', 'Kosmetik', 2),
  ('BURRY', 'Burry', 'Dimensi', 3),
  ('BENDING', 'Bending', 'Dimensi', 4),
  ('DIRTY', 'Dirty', 'Kosmetik', 5),
  ('KONTAMINASI', 'Kontaminasi', 'Material', 6),
  ('FILTER_BOLONG_RUSAK', 'Filter Bolong/Rusak', 'Proses', 7),
  ('SHINNING', 'Shinning', 'Kosmetik', 8),
  ('SILVER', 'Silver', 'Material', 9),
  ('FLOW_MARK', 'Flow Mark', 'Kosmetik', 10),
  ('BURN_MARK', 'Burn Mark', 'Kosmetik', 11),
  ('SINK_MARK', 'Sink Mark', 'Kosmetik', 12),
  ('EJECTOR_MARK', 'Ejector Mark', 'Proses', 13),
  ('GAS_MARK', 'Gas Mark', 'Proses', 14),
  ('CRACK', 'Crack', 'Fungsi', 15),
  ('GAP', 'Gap', 'Dimensi', 16),
  ('DENTED', 'Dented', 'Kosmetik', 17),
  ('SCRATCH', 'Scratch', 'Kosmetik', 18),
  ('FLASH', 'Flash', 'Dimensi', 19),
  ('DOUBLE_INJECT', 'Double Inject', 'Proses', 20),
  ('BUBBLE', 'Bubble', 'Material', 21),
  ('GATE_LONG', 'Gate Long', 'Dimensi', 22),
  ('GATE_HOLE', 'Gate Hole', 'Proses', 23),
  ('OVER_CUT', 'Over Cut', 'Dimensi', 24),
  ('UNDER_CUT', 'Under Cut', 'Dimensi', 25),
  ('BLACK_DOT', 'Black Dot', 'Kosmetik', 26),
  ('DEFORM', 'Deform', 'Dimensi', 27),
  ('WELD_LINE', 'Weld Line', 'Kosmetik', 28),
  ('START_UP_ALARM', 'Start Up / Setting Alarm', 'Proses', 29)
ON CONFLICT (kode_defect) DO UPDATE
SET nama_defect = EXCLUDED.nama_defect, kategori_defect = EXCLUDED.kategori_defect, urutan = EXCLUDED.urutan;

-- ============ SEED DEFAULT PARTS FOR ALL TABLES ============
INSERT INTO public.inspection_table_default_parts (no_meja, part_no)
SELECT t.no_meja, p.part_no
FROM public.inspection_tables t
CROSS JOIN public.parts p
WHERE t.status = 'Aktif'
ON CONFLICT (no_meja, part_no) DO NOTHING;
