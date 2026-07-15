-- Convert from production to inspection schema
-- Drop all old production tables in dependency order
DROP TABLE IF EXISTS public.defect_details CASCADE;
DROP TABLE IF EXISTS public.production_reports CASCADE;
DROP TABLE IF EXISTS public.parts CASCADE;
DROP TABLE IF EXISTS public.machines CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- Drop triggers (they are dropped with functions but be explicit)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Migration: profiles and user_roles remain unchanged
-- Recreate helper functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_count INTEGER;
  _role app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  SELECT COUNT(*) INTO _user_count FROM public.user_roles;
  IF _user_count = 0 THEN
    _role := 'supervisor';
  ELSE
    _role := 'inspector';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate has_role function (used by RLS policies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ INSPECTION SHIFT ENUM ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'inspection_shift'
  ) THEN
    CREATE TYPE public.inspection_shift AS ENUM ('A', 'B', 'C');
  END IF;
END $$;

-- ============ INSPECTION TABLES (Meja Inspeksi) ============
CREATE TABLE IF NOT EXISTS public.inspection_tables (
  id SERIAL PRIMARY KEY,
  no_meja INTEGER UNIQUE NOT NULL,
  nama_meja TEXT,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif','Maintenance','Tidak Aktif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inspection_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read inspection_tables" ON public.inspection_tables;
CREATE POLICY "auth read inspection_tables" ON public.inspection_tables FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "supervisor manage inspection_tables" ON public.inspection_tables;
CREATE POLICY "supervisor manage inspection_tables" ON public.inspection_tables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor')) WITH CHECK (public.has_role(auth.uid(),'supervisor'));
DROP TRIGGER IF EXISTS trg_inspection_tables_updated ON public.inspection_tables;
CREATE TRIGGER trg_inspection_tables_updated BEFORE UPDATE ON public.inspection_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PARTS (updated for inspection) ============
CREATE TABLE IF NOT EXISTS public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no TEXT UNIQUE NOT NULL,
  part_name TEXT NOT NULL,
  kategori TEXT CHECK (kategori IN ('SMALL','MEDIUM','BIG','SA')),
  customer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  standard_cycle_time INTEGER, -- cycle time in seconds
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read parts" ON public.parts;
CREATE POLICY "auth read parts" ON public.parts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "supervisor manage parts" ON public.parts;
CREATE POLICY "supervisor manage parts" ON public.parts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor')) WITH CHECK (public.has_role(auth.uid(),'supervisor'));
DROP TRIGGER IF EXISTS trg_parts_updated ON public.parts;
CREATE TRIGGER trg_parts_updated BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_part_name_unique ON public.parts (part_name);

-- ============ INSPECTION REPORTS ============
CREATE TABLE IF NOT EXISTS public.inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  shift inspection_shift NOT NULL,
  no_meja INTEGER NOT NULL,
  jam_mulai TIME NOT NULL,
  jam_selesai TIME NOT NULL,
  part_no TEXT NOT NULL,
  part_name TEXT NOT NULL,
  qty_check INTEGER NOT NULL DEFAULT 0,
  total_ng INTEGER NOT NULL DEFAULT 0,
  total_ok INTEGER GENERATED ALWAYS AS (qty_check - total_ng) STORED,
  actual_cycle_time INTEGER, -- actual inspection time in seconds (for comparison with standard)
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_date, shift, no_meja, part_no)
);
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read inspection_reports" ON public.inspection_reports;
CREATE POLICY "auth read inspection_reports" ON public.inspection_reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "users insert own inspection_reports" ON public.inspection_reports;
CREATE POLICY "users insert own inspection_reports" ON public.inspection_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "users update own inspection_reports" ON public.inspection_reports;
CREATE POLICY "users update own inspection_reports" ON public.inspection_reports FOR UPDATE TO authenticated USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "users delete own inspection_reports or supervisor" ON public.inspection_reports;
CREATE POLICY "users delete own inspection_reports or supervisor" ON public.inspection_reports FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'supervisor'));
DROP TRIGGER IF EXISTS trg_inspection_reports_updated ON public.inspection_reports;
CREATE TRIGGER trg_inspection_reports_updated BEFORE UPDATE ON public.inspection_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_inspection_reports_date ON public.inspection_reports (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_meja ON public.inspection_reports (no_meja);

-- ============ INSPECTION DEFECT DETAILS ============
CREATE TABLE IF NOT EXISTS public.inspection_defect_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.inspection_reports(id) ON DELETE CASCADE,
  short_shot INTEGER NOT NULL DEFAULT 0,
  lipat INTEGER NOT NULL DEFAULT 0,
  burry INTEGER NOT NULL DEFAULT 0,
  bending INTEGER NOT NULL DEFAULT 0,
  dirty INTEGER NOT NULL DEFAULT 0,
  kontaminasi INTEGER NOT NULL DEFAULT 0,
  filter_bolong_rusak INTEGER NOT NULL DEFAULT 0,
  shinning INTEGER NOT NULL DEFAULT 0,
  silver INTEGER NOT NULL DEFAULT 0,
  flow_mark INTEGER NOT NULL DEFAULT 0,
  burn_mark INTEGER NOT NULL DEFAULT 0,
  sink_mark INTEGER NOT NULL DEFAULT 0,
  ejector_mark INTEGER NOT NULL DEFAULT 0,
  gas_mark INTEGER NOT NULL DEFAULT 0,
  crack INTEGER NOT NULL DEFAULT 0,
  gap INTEGER NOT NULL DEFAULT 0,
  dented INTEGER NOT NULL DEFAULT 0,
  scratch INTEGER NOT NULL DEFAULT 0,
  flash INTEGER NOT NULL DEFAULT 0,
  double_inject INTEGER NOT NULL DEFAULT 0,
  bubble INTEGER NOT NULL DEFAULT 0,
  gate_long INTEGER NOT NULL DEFAULT 0,
  gate_hole INTEGER NOT NULL DEFAULT 0,
  over_cut INTEGER NOT NULL DEFAULT 0,
  under_cut INTEGER NOT NULL DEFAULT 0,
  black_dot INTEGER NOT NULL DEFAULT 0,
  deform INTEGER NOT NULL DEFAULT 0,
  weld_line INTEGER NOT NULL DEFAULT 0,
  start_up_setting_alarm INTEGER NOT NULL DEFAULT 0,
  extra_defects JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inspection_defect_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read inspection_defect_details" ON public.inspection_defect_details;
CREATE POLICY "auth read inspection_defect_details" ON public.inspection_defect_details FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "owner or supervisor insert inspection_defect_details" ON public.inspection_defect_details;
CREATE POLICY "owner or supervisor insert inspection_defect_details" ON public.inspection_defect_details
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.inspection_reports r WHERE r.id = report_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(),'supervisor')))
  );
DROP POLICY IF EXISTS "owner or supervisor update inspection_defect_details" ON public.inspection_defect_details;
CREATE POLICY "owner or supervisor update inspection_defect_details" ON public.inspection_defect_details
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.inspection_reports r WHERE r.id = report_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(),'supervisor')))
  );
DROP POLICY IF EXISTS "owner or supervisor delete inspection_defect_details" ON public.inspection_defect_details;
CREATE POLICY "owner or supervisor delete inspection_defect_details" ON public.inspection_defect_details
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.inspection_reports r WHERE r.id = report_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(),'supervisor')))
  );

-- ============ SEED DATA: Inspection Tables ============
INSERT INTO public.inspection_tables (no_meja, nama_meja, status) VALUES
  (1, 'Meja Inspeksi 1', 'Aktif'),
  (2, 'Meja Inspeksi 2', 'Aktif'),
  (3, 'Meja Inspeksi 3', 'Aktif'),
  (4, 'Meja Inspeksi 4', 'Aktif'),
  (5, 'Meja Inspeksi 5', 'Aktif'),
  (6, 'Meja Inspeksi 6', 'Aktif'),
  (7, 'Meja Inspeksi 7', 'Aktif'),
  (8, 'Meja Inspeksi 8', 'Aktif'),
  (9, 'Meja Inspeksi 9', 'Aktif'),
  (10, 'Meja Inspeksi 10', 'Aktif')
ON CONFLICT (no_meja) DO UPDATE
SET nama_meja = EXCLUDED.nama_meja, status = EXCLUDED.status;

-- ============ SEED DATA: Defect Types ============
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

-- ============ SEED DATA: Sample Parts ============
INSERT INTO public.parts (part_no, part_name, kategori, standard_cycle_time, is_active) VALUES
  ('BTN-40', 'BUTTON 40', 'SMALL', 30, TRUE),
  ('DCT-KWN', 'DUCT KWN', 'MEDIUM', 45, TRUE),
  ('ELM-K93A', 'ELEMENT K93A', 'BIG', 60, TRUE)
ON CONFLICT (part_no) DO NOTHING;
