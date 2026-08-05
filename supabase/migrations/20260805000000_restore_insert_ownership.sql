-- ============================================
-- Restore strict INSERT RLS policies
-- Reverts the permissive WITH CHECK (true) policies
-- introduced in 20260724000000_fix_rls_for_server_functions.sql
--
-- Server functions now use the service-role client for trusted writes,
-- so these permissive browser-facing INSERT policies are no longer needed.
-- Direct browser clients must go back to proofing ownership.
-- ============================================

DROP POLICY IF EXISTS "authenticated insert inspection_reports" ON public.inspection_reports;
DROP POLICY IF EXISTS "authenticated insert inspection_defect_details" ON public.inspection_defect_details;

-- Restore ownership-checked INSERT for inspection_reports
DROP POLICY IF EXISTS "users insert own inspection_reports" ON public.inspection_reports;
CREATE POLICY "users insert own inspection_reports" ON public.inspection_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Restore ownership/supervisor-checked INSERT for defect details
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