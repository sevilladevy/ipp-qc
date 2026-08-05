-- ============ FIX: defect_types tidak bisa dibaca user authenticated ============
-- Gejala: /master/defect-types kosong padahal tabel berisi 30 baris.
-- Query REST (authenticated) => [] sedangkan anon/service-role => 30 baris.
-- Artinya di DB live tidak ada policy SELECT untuk role authenticated.
-- Jalankan di Supabase Dashboard -> SQL Editor. Idempotent, aman dijalankan ulang.

ALTER TABLE public.defect_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read defect_types" ON public.defect_types;
CREATE POLICY "auth read defect_types" ON public.defect_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "supervisor manage defect_types" ON public.defect_types;
CREATE POLICY "supervisor manage defect_types" ON public.defect_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'supervisor'))
  WITH CHECK (public.has_role(auth.uid(),'supervisor'));
