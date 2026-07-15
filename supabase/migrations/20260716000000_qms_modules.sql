-- ============================================
-- QMS Modules: Audit, Corrective Action, Improvement
-- ISO 9001:2015 Clauses 9.2, 10.2, 10.3
-- ============================================

-- ============ AUDIT SCHEDULE TYPE ENUM ============
DO $$ BEGIN
  CREATE TYPE audit_type AS ENUM ('internal', 'external', 'supplier');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_status AS ENUM ('planned', 'in_progress', 'completed', 'overdue');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_finding_severity AS ENUM ('minor', 'major', 'critical', 'observation');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE nc_status AS ENUM ('open', 'in_progress', 'verified', 'closed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ca_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE improvement_status AS ENUM ('proposed', 'approved', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============ AUDIT SCHEDULES ============
CREATE TABLE IF NOT EXISTS public.audit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  audit_type audit_type NOT NULL DEFAULT 'internal',
  scope TEXT NOT NULL,
  area TEXT,
  planned_date DATE NOT NULL,
  completed_date DATE,
  status audit_status NOT NULL DEFAULT 'planned',
  lead_auditor UUID REFERENCES auth.users(id),
  audit_team UUID[] DEFAULT '{}',
  checklist JSONB DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_schedules ENABLE ROW LEVEL SECURITY;

-- ============ AUDIT FINDINGS ============
CREATE TABLE IF NOT EXISTS public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.audit_schedules(id) ON DELETE CASCADE,
  finding TEXT NOT NULL,
  severity audit_finding_severity NOT NULL DEFAULT 'minor',
  clause TEXT,
  objective_evidence TEXT,
  corrected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

-- ============ NON-CONFORMITY / CORRECTIVE ACTION ============
CREATE TABLE IF NOT EXISTS public.non_conformities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_number TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL DEFAULT 'internal', -- 'audit', 'complaint', 'daily_qc', 'other'
  source_id TEXT, -- reference to audit finding / report id
  description TEXT NOT NULL,
  severity audit_finding_severity NOT NULL DEFAULT 'minor',
  status nc_status NOT NULL DEFAULT 'open',
  root_cause TEXT,
  root_cause_category TEXT, -- 'man', 'machine', 'material', 'method', 'measurement', 'environment'
  corrective_action TEXT,
  preventive_action TEXT,
  deadline DATE,
  assigned_to UUID REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  closure_note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.non_conformities ENABLE ROW LEVEL SECURITY;

-- ============ CORRECTIVE ACTION LOG ============
CREATE TABLE IF NOT EXISTS public.ca_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nc_id UUID NOT NULL REFERENCES public.non_conformities(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('corrective', 'preventive')),
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  priority ca_priority NOT NULL DEFAULT 'medium',
  deadline DATE,
  completed_at TIMESTAMPTZ,
  effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
  effectiveness_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ca_actions ENABLE ROW LEVEL SECURITY;

-- ============ CONTINUAL IMPROVEMENT ============
CREATE TABLE IF NOT EXISTS public.improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('quality', 'process', 'safety', 'efficiency', 'other')),
  source TEXT NOT NULL DEFAULT 'management_review',
  source_id TEXT,
  expected_benefit TEXT,
  status improvement_status NOT NULL DEFAULT 'proposed',
  priority ca_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  deadline DATE,
  completed_at TIMESTAMPTZ,
  actual_result TEXT,
  lesson_learned TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.improvements ENABLE ROW LEVEL SECURITY;

-- ============ MANAGEMENT REVIEW ============
CREATE TABLE IF NOT EXISTS public.management_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  review_date DATE NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  attendees JSONB DEFAULT '[]',
  agenda TEXT NOT NULL,
  minutes TEXT,
  decisions JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.management_reviews ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
CREATE POLICY "auth read audit_schedules" ON public.audit_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisor manage audit_schedules" ON public.audit_schedules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "auth read audit_findings" ON public.audit_findings FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisor manage audit_findings" ON public.audit_findings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "auth read non_conformities" ON public.non_conformities FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisor manage non_conformities" ON public.non_conformities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "auth read ca_actions" ON public.ca_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisor manage ca_actions" ON public.ca_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "auth read improvements" ON public.improvements FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisor manage improvements" ON public.improvements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "auth read management_reviews" ON public.management_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisor manage management_reviews" ON public.management_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- ============ TRIGGERS ============
DROP TRIGGER IF EXISTS trg_audit_schedules_updated ON public.audit_schedules;
CREATE TRIGGER trg_audit_schedules_updated BEFORE UPDATE ON public.audit_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_non_conformities_updated ON public.non_conformities;
CREATE TRIGGER trg_non_conformities_updated BEFORE UPDATE ON public.non_conformities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_improvements_updated ON public.improvements;
CREATE TRIGGER trg_improvements_updated BEFORE UPDATE ON public.improvements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_management_reviews_updated ON public.management_reviews;
CREATE TRIGGER trg_management_reviews_updated BEFORE UPDATE ON public.management_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_audit_schedules_status ON public.audit_schedules (status);
CREATE INDEX IF NOT EXISTS idx_audit_schedules_planned_date ON public.audit_schedules (planned_date);
CREATE INDEX IF NOT EXISTS idx_audit_findings_audit_id ON public.audit_findings (audit_id);
CREATE INDEX IF NOT EXISTS idx_non_conformities_status ON public.non_conformities (status);
CREATE INDEX IF NOT EXISTS idx_non_conformities_severity ON public.non_conformities (severity);
CREATE INDEX IF NOT EXISTS idx_ca_actions_nc_id ON public.ca_actions (nc_id);
CREATE INDEX IF NOT EXISTS idx_improvements_status ON public.improvements (status);
CREATE INDEX IF NOT EXISTS idx_management_reviews_review_date ON public.management_reviews (review_date);

-- ============ AUDIT LOG (for tracking data changes) ============
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supervisor read audit_log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "system insert audit_log" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log (changed_at DESC);
