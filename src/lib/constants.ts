// Application-wide constants

// Version - could also be read from package.json at build time
export const APP_VERSION = "2.0";
export const APP_NAME = "IPP";
export const APP_FULL_NAME = "Injeksi Plastik Pasifik";
export const APP_TAGLINE = "Quality Inspection Daily Report";

// Query keys for consistent cache management
export const QUERY_KEYS = {
  // Master data
  INSPECTION_TABLES: ["inspection_tables"] as const,
  PARTS: ["parts"] as const,
  DEFECT_TYPES: ["defect_types"] as const,
  TABLE_DEFAULT_PARTS: (noMeja: number | null) => ["table-default-parts", noMeja] as const,
  DEFAULT_PARTS_BY_TABLE: ["default-parts-by-table"] as const,

  // Dashboard & Analytics
  DASHBOARD: (from: string, to: string) => ["dashboard-management", from, to] as const,
  ANALYTICS: (from: string, to: string) => ["analytics-management", from, to] as const,

  // Reports
  REPORT_MANAGEMENT: (from: string, to: string) => ["report-management", from, to] as const,

  // Input
  INPUT_DAILY_LOG: (date: string) => ["input-daily-log", date] as const,

  // Defects
  DEFECTS: (reportIds: string[]) => ["defects", ...reportIds.sort()] as const,
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  INPUT_PREFS: "inspection-input-preferences",
  SIDEBAR_COLLAPSED: "ipp-sidebar-collapsed",
  REPORT_PRESETS: "management-report-presets-v1",
} as const;

// Validation thresholds
export const THRESHOLDS = {
  PASS_RATE_EXCELLENT: 0.98,
  PASS_RATE_GOOD: 0.95,
  NG_RATE_WARNING: 0.02,
  NG_RATE_CRITICAL: 0.05,
  NG_COUNT_LOW: 3,
  NG_COUNT_MEDIUM: 10,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as const,
} as const;
