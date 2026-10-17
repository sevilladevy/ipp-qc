-- ============================================================================
-- Fix live production RLS for qc.ptipp.app
-- Run in: Supabase Dashboard -> SQL Editor (project: qc.ptipp.app)
-- Idempotent: safe to run multiple times
-- ============================================================================

-- 1) Role helper type + function (used by RLS policies)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('inspector', 'supervisor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2) Core tables (idempotent create)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'inspector',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
CREATE TABLE IF NOT EXISTS public.inspection_tables (
  id SERIAL PRIMARY KEY,
  no_meja INTEGER UNIQUE NOT NULL,
  nama_meja TEXT,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif','Maintenance','Tidak Aktif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no TEXT UNIQUE NOT NULL,
  part_name TEXT NOT NULL,
  kategori TEXT CHECK (kategori IN ('SMALL','MEDIUM','BIG','SA')),
  customer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  standard_cycle_time INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.defect_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_defect TEXT UNIQUE NOT NULL,
  nama_defect TEXT NOT NULL,
  kategori_defect TEXT,
  deskripsi TEXT,
  urutan INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  shift TEXT NOT NULL,
  no_meja INTEGER NOT NULL,
  jam_mulai TIME NOT NULL,
  jam_selesai TIME NOT NULL,
  part_no TEXT NOT NULL,
  part_name TEXT NOT NULL,
  qty_check INTEGER NOT NULL DEFAULT 0,
  total_ng INTEGER NOT NULL DEFAULT 0,
  total_ok INTEGER GENERATED ALWAYS AS (qty_check - total_ng) STORED,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
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

-- 3) Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_defect_details ENABLE ROW LEVEL SECURITY;

-- 4) SELECT policies for authenticated users (fixes console errors)
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth read user_roles" ON public.user_roles;
CREATE POLICY "auth read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth read inspection_tables" ON public.inspection_tables;
CREATE POLICY "auth read inspection_tables" ON public.inspection_tables FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth read parts" ON public.parts;
CREATE POLICY "auth read parts" ON public.parts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth read defect_types" ON public.defect_types;
CREATE POLICY "auth read defect_types" ON public.defect_types FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth read inspection_reports" ON public.inspection_reports;
CREATE POLICY "auth read inspection_reports" ON public.inspection_reports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth read inspection_defect_details" ON public.inspection_defect_details;
CREATE POLICY "auth read inspection_defect_details" ON public.inspection_defect_details FOR SELECT TO authenticated USING (true);

-- 5) Supervisor manage policies (write access)
DROP POLICY IF EXISTS "supervisor manage profiles" ON public.profiles;
CREATE POLICY "supervisor manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

DROP POLICY IF EXISTS "supervisor manage user_roles" ON public.user_roles;
CREATE POLICY "supervisor manage user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

DROP POLICY IF EXISTS "supervisor manage inspection_tables" ON public.inspection_tables;
CREATE POLICY "supervisor manage inspection_tables" ON public.inspection_tables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

DROP POLICY IF EXISTS "supervisor manage parts" ON public.parts;
CREATE POLICY "supervisor manage parts" ON public.parts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

DROP POLICY IF EXISTS "supervisor manage defect_types" ON public.defect_types;
CREATE POLICY "supervisor manage defect_types" ON public.defect_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- 6) Ownership-based report/defect policies
DROP POLICY IF EXISTS "users insert own inspection_reports" ON public.inspection_reports;
CREATE POLICY "users insert own inspection_reports" ON public.inspection_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "users update own inspection_reports" ON public.inspection_reports;
CREATE POLICY "users update own inspection_reports" ON public.inspection_reports
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "users delete own inspection_reports or supervisor" ON public.inspection_reports;
CREATE POLICY "users delete own inspection_reports or supervisor" ON public.inspection_reports
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'supervisor'));

DROP POLICY IF EXISTS "owner or supervisor insert inspection_defect_details" ON public.inspection_defect_details;
CREATE POLICY "owner or supervisor insert inspection_defect_details" ON public.inspection_defect_details
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inspection_reports r
      WHERE r.id = report_id
        AND (r.created_by = auth.uid() OR public.has_role(auth.uid(), 'supervisor'))
    )
  );

DROP POLICY IF EXISTS "owner or supervisor update inspection_defect_details" ON public.inspection_defect_details;
CREATE POLICY "owner or supervisor update inspection_defect_details" ON public.inspection_defect_details
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_reports r
      WHERE r.id = report_id
        AND (r.created_by = auth.uid() OR public.has_role(auth.uid(), 'supervisor'))
    )
  );

DROP POLICY IF EXISTS "owner or supervisor delete inspection_defect_details" ON public.inspection_defect_details;
CREATE POLICY "owner or supervisor delete inspection_defect_details" ON public.inspection_defect_details
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_reports r
      WHERE r.id = report_id
        AND (r.created_by = auth.uid() OR public.has_role(auth.uid(), 'supervisor'))
    )
  );

-- 7) Profiles: self update + supervisor delete
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles delete supervisor" ON public.profiles;
CREATE POLICY "profiles delete supervisor" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

-- 8) user_roles: supervisor delete only
DROP POLICY IF EXISTS "user_roles delete supervisor" ON public.user_roles;
CREATE POLICY "user_roles delete supervisor" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

SELECT 'RLS policies applied.' AS status;
