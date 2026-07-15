ALTER TABLE public.production_reports
  DROP CONSTRAINT IF EXISTS production_reports_shift_check;

ALTER TABLE public.production_reports
  ADD CONSTRAINT production_reports_shift_check
  CHECK (shift IN ('Pagi', 'Malam'));
