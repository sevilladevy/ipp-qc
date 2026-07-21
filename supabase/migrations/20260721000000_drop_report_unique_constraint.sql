-- Drop the UNIQUE constraint on inspection_reports
-- yang mencegah multiple input untuk (date, shift, meja, part) yang sama
ALTER TABLE public.inspection_reports DROP CONSTRAINT IF EXISTS inspection_reports_report_date_shift_no_meja_part_no_key;
