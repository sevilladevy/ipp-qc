-- ============================================
-- QMS tiered writes: any authenticated user may RAISE
-- non-conformities and audit findings. Lifecycle
-- management (edits, status verification/closure,
-- deletes) stays supervisor-only via the existing
-- "supervisor manage" FOR ALL policies.
-- ============================================

CREATE POLICY "authenticated raise non_conformities"
  ON public.non_conformities FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated raise audit_findings"
  ON public.audit_findings FOR INSERT TO authenticated
  WITH CHECK (true);
