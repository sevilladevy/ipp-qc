
DROP POLICY IF EXISTS "auth insert defect_details" ON public.defect_details;
DROP POLICY IF EXISTS "auth update defect_details" ON public.defect_details;
DROP POLICY IF EXISTS "auth delete defect_details" ON public.defect_details;

CREATE POLICY "owner or supervisor insert defect_details" ON public.defect_details
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.production_reports r WHERE r.id = report_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(),'supervisor')))
  );

CREATE POLICY "owner or supervisor update defect_details" ON public.defect_details
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.production_reports r WHERE r.id = report_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(),'supervisor')))
  );

CREATE POLICY "owner or supervisor delete defect_details" ON public.defect_details
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.production_reports r WHERE r.id = report_id AND (r.created_by = auth.uid() OR public.has_role(auth.uid(),'supervisor')))
  );
