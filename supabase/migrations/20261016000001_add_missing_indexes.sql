-- Migration: Add missing indexes on foreign key columns
-- Date: 2026-10-16

-- inspection_reports.created_by (used in WHERE clauses for filtering by inspector)
CREATE INDEX IF NOT EXISTS idx_inspection_reports_created_by
  ON public.inspection_reports(created_by);

-- audit_schedules.lead_auditor (used in WHERE clauses for filtering by auditor)
CREATE INDEX IF NOT EXISTS idx_audit_schedules_lead_auditor
  ON public.audit_schedules(lead_auditor);
