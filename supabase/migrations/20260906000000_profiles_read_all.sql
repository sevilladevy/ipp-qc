-- Fix: inspector names missing in tables (dashboard, log input, analitik, laporan).
-- Root cause: the live profiles SELECT policy only exposed the viewer's own
-- row, so profile lookups for other inspectors missed and the UI fell back
-- to raw created_by UUIDs. Name/email columns are non-sensitive directory
-- data; UPDATE/DELETE stay restricted (see 20260715000000 migration).

DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;

CREATE POLICY "auth read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
