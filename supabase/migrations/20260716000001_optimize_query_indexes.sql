-- Performance optimization: Add missing indexes for analytics & dashboard queries
-- The biggest bottleneck was inspection_defect_details lacking an index on report_id,
-- causing full sequential scans on every analytics/dashboard page load.

CREATE INDEX IF NOT EXISTS idx_inspection_defect_details_report_id
  ON public.inspection_defect_details (report_id);

-- Composite indexes on inspection_reports to support client-side filters
-- without scanning all rows in a date range

CREATE INDEX IF NOT EXISTS idx_inspection_reports_date_meja
  ON public.inspection_reports (report_date DESC, no_meja);

CREATE INDEX IF NOT EXISTS idx_inspection_reports_date_shift
  ON public.inspection_reports (report_date DESC, shift);

CREATE INDEX IF NOT EXISTS idx_inspection_reports_date_created_by
  ON public.inspection_reports (report_date DESC, created_by);

-- Index for laporan.tsx ordering (report_date DESC)
CREATE INDEX IF NOT EXISTS idx_inspection_reports_date_desc
  ON public.inspection_reports (report_date DESC);

COMMENT ON INDEX idx_inspection_defect_details_report_id IS 'Speeds up fetchDefectDetailsByReportIds: avoid sequential scans when joining defect details to reports';
COMMENT ON INDEX idx_inspection_reports_date_meja IS 'Speeds up analytics/dashboard queries filtered by both date range and meja';
COMMENT ON INDEX idx_inspection_reports_date_shift IS 'Speeds up analytics/dashboard queries filtered by both date range and shift';
COMMENT ON INDEX idx_inspection_reports_date_created_by IS 'Speeds up analytics/dashboard queries filtered by both date range and inspector';
COMMENT ON INDEX idx_inspection_reports_date_desc IS 'Speeds up laporan.tsx ordering by report_date DESC';
