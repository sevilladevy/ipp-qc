
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('operator', 'supervisor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "auth read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "supervisor read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "supervisor manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ============ TIMESTAMP TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ NEW USER HANDLER (auto-promote first user to supervisor) ============
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
    _role := 'operator';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ MACHINES ============
CREATE TABLE public.machines (
  id SERIAL PRIMARY KEY,
  no_mesin INTEGER UNIQUE NOT NULL,
  nama_mesin TEXT,
  kapasitas_ton INTEGER,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif','Maintenance','Tidak Aktif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read machines" ON public.machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisor manage machines" ON public.machines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor')) WITH CHECK (public.has_role(auth.uid(),'supervisor'));
CREATE TRIGGER trg_machines_updated BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PARTS ============
CREATE TABLE public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_part TEXT UNIQUE NOT NULL,
  nama_part TEXT NOT NULL,
  kategori TEXT CHECK (kategori IN ('SMALL','MEDIUM','BIG','SA')),
  customer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read parts" ON public.parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisor manage parts" ON public.parts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor')) WITH CHECK (public.has_role(auth.uid(),'supervisor'));
CREATE TRIGGER trg_parts_updated BEFORE UPDATE ON public.parts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DEFECT TYPES ============
CREATE TABLE public.defect_types (
  id SERIAL PRIMARY KEY,
  kode_defect TEXT UNIQUE NOT NULL,
  nama_defect TEXT NOT NULL,
  deskripsi TEXT,
  kategori_defect TEXT CHECK (kategori_defect IN ('Dimensi','Kosmetik','Fungsi','Material','Proses')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  urutan INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.defect_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read defect_types" ON public.defect_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisor manage defect_types" ON public.defect_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor')) WITH CHECK (public.has_role(auth.uid(),'supervisor'));
CREATE TRIGGER trg_defect_types_updated BEFORE UPDATE ON public.defect_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCTION REPORTS ============
CREATE TABLE public.production_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('Pagi','Siang','Malam')),
  no_mesin INTEGER NOT NULL,
  kategori_part TEXT NOT NULL CHECK (kategori_part IN ('SMALL','MEDIUM','BIG','SA')),
  nama_part TEXT NOT NULL,
  total_output INTEGER NOT NULL DEFAULT 0,
  total_ok INTEGER NOT NULL DEFAULT 0,
  total_ng INTEGER NOT NULL DEFAULT 0,
  yield_proses NUMERIC(6,4) GENERATED ALWAYS AS (
    CASE WHEN total_output > 0 THEN total_ok::NUMERIC / total_output ELSE 0 END
  ) STORED,
  yield_ng NUMERIC(6,4) GENERATED ALWAYS AS (
    CASE WHEN total_output > 0 THEN total_ng::NUMERIC / total_output ELSE 0 END
  ) STORED,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_date, shift, no_mesin, nama_part)
);
ALTER TABLE public.production_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read reports" ON public.production_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own reports" ON public.production_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "users update own reports" ON public.production_reports FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "users delete own reports or supervisor" ON public.production_reports FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'supervisor'));
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.production_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_reports_date ON public.production_reports (report_date DESC);
CREATE INDEX idx_reports_mesin ON public.production_reports (no_mesin);

-- ============ DEFECT DETAILS ============
CREATE TABLE public.defect_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.production_reports(id) ON DELETE CASCADE,
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
ALTER TABLE public.defect_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read defect_details" ON public.defect_details FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert defect_details" ON public.defect_details FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update defect_details" ON public.defect_details FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth delete defect_details" ON public.defect_details FOR DELETE TO authenticated USING (true);

-- ============ SEED DATA ============
INSERT INTO public.machines (no_mesin, nama_mesin, kapasitas_ton, status) VALUES
  (1,'Mesin 1',100,'Aktif'),(2,'Mesin 2',100,'Aktif'),(3,'Mesin 3',150,'Aktif'),
  (4,'Mesin 4',150,'Aktif'),(5,'Mesin 5',180,'Aktif'),(6,'Mesin 6',180,'Aktif'),
  (7,'Mesin 7',200,'Aktif'),(8,'Mesin 8',200,'Aktif'),(9,'Mesin 9',250,'Aktif'),
  (10,'Mesin 10',250,'Aktif'),(11,'Mesin 11',280,'Aktif'),(12,'Mesin 12',280,'Aktif'),
  (13,'Mesin 13',300,'Aktif'),(14,'Mesin 14',300,'Aktif'),(15,'Mesin 15',350,'Aktif'),
  (16,'Mesin 16',350,'Aktif'),(17,'Mesin 17',400,'Aktif'),(18,'Mesin 18',400,'Aktif'),
  (19,'Mesin 19',450,'Aktif'),(20,'Mesin 20',500,'Aktif'),(21,'Mesin 21',550,'Aktif');

INSERT INTO public.parts (kode_part, nama_part, kategori, customer) VALUES
  ('BTN-40','BUTTON 40','SMALL',NULL),
  ('DCT-KWN','DUCT KWN','MEDIUM',NULL),
  ('ELM-K93A','ELEMENT K93A','BIG',NULL),
  ('HMR-K97G-RH','HOLDER MIRROR K97G RH','MEDIUM',NULL),
  ('HMR-K97G-LH','HOLDER MIRROR K97G LH','MEDIUM',NULL),
  ('CCU-2','CASE CCU #2','MEDIUM',NULL),
  ('BRK-D74A-105B','BRACKET D74A 105B','MEDIUM',NULL),
  ('CST-04','CST 04','SMALL',NULL),
  ('CST-18','CST 18','SMALL',NULL),
  ('CST-19','CST 19','SMALL',NULL),
  ('ARM-LOCK','ARM LOCK','MEDIUM',NULL),
  ('LCC-BOX','LOWER COVER CONSOLE BOX','BIG',NULL),
  ('7176-6851-30','7176-6851-30','SMALL',NULL),
  ('7171-6334-30','7171-6334-30','MEDIUM',NULL),
  ('IMP-ASSY','IMPELLER ASSY','MEDIUM',NULL),
  ('LNS-K1Z','LENS K1Z','MEDIUM',NULL),
  ('ELM-K18A','ELEMENT K18A','BIG',NULL),
  ('ELM-K41K','ELEMENT K41K','BIG',NULL),
  ('INC-BPN','INNER CASE BPN','BIG',NULL),
  ('CVR-K60R-1','COVER K60R #1','BIG',NULL);

INSERT INTO public.defect_types (kode_defect, nama_defect, kategori_defect, urutan) VALUES
  ('SHORT_SHOT','Short Shot','Proses',1),
  ('LIPAT','Lipat','Kosmetik',2),
  ('BURRY','Burry','Dimensi',3),
  ('BENDING','Bending','Dimensi',4),
  ('DIRTY','Dirty','Kosmetik',5),
  ('KONTAMINASI','Kontaminasi','Material',6),
  ('FILTER_BOLONG_RUSAK','Filter Bolong/Rusak','Proses',7),
  ('SHINNING','Shinning','Kosmetik',8),
  ('SILVER','Silver','Material',9),
  ('FLOW_MARK','Flow Mark','Kosmetik',10),
  ('BURN_MARK','Burn Mark','Kosmetik',11),
  ('SINK_MARK','Sink Mark','Kosmetik',12),
  ('EJECTOR_MARK','Ejector Mark','Proses',13),
  ('GAS_MARK','Gas Mark','Proses',14),
  ('CRACK','Crack','Fungsi',15),
  ('GAP','Gap','Dimensi',16),
  ('DENTED','Dented','Kosmetik',17),
  ('SCRATCH','Scratch','Kosmetik',18),
  ('FLASH','Flash','Dimensi',19),
  ('DOUBLE_INJECT','Double Inject','Proses',20),
  ('BUBBLE','Bubble','Material',21),
  ('GATE_LONG','Gate Long','Dimensi',22),
  ('GATE_HOLE','Gate Hole','Proses',23),
  ('OVER_CUT','Over Cut','Dimensi',24),
  ('UNDER_CUT','Under Cut','Dimensi',25),
  ('BLACK_DOT','Black Dot','Kosmetik',26),
  ('DEFORM','Deform','Dimensi',27),
  ('WELD_LINE','Weld Line','Kosmetik',28),
  ('START_UP_ALARM','Start Up / Setting Alarm','Proses',29);
