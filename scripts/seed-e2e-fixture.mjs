import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIG_PATH = path.resolve(
  process.env.E2E_FIXTURE_CONFIG_PATH || "scripts/e2e-fixture-config.json",
);

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, delta) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log("Skip seeding fixture: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY belum tersedia.");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = new Date();
const dateRows = Array.from({ length: 7 }, (_, idx) => {
  const date = addDays(today, idx - 6);
  return {
    date: toIsoDate(date),
    index: idx,
  };
});

const parts = [
  {
    part_no: "E2E-ALPHA",
    part_name: "E2E Fixture Alpha",
    kategori: "E2E",
    customer: "QA",
    is_active: true,
  },
  {
    part_no: "E2E-BETA",
    part_name: "E2E Fixture Beta",
    kategori: "E2E",
    customer: "QA",
    is_active: true,
  },
];

const reports = dateRows.map(({ date, index }) => {
  const useAlpha = index % 2 === 0;
  const qty_check = 900 + index * 80;
  const ng = 12 + index * 2;
  const ok = qty_check - ng;
  return {
    id: `e2e-fixture-${date}-${useAlpha ? "901" : "902"}`,
    report_date: date,
    shift: index % 2 === 0 ? "A" : "B",
    no_meja: useAlpha ? 1 : 2,
    part_no: useAlpha ? "E2E-ALPHA" : "E2E-BETA",
    part_name: useAlpha ? "E2E Fixture Alpha" : "E2E Fixture Beta",
    qty_check: qty_check,
    total_ok: ok,
    total_ng: ng,
    jam_mulai: "08:00",
    jam_selesai: "16:00",
    created_by: null,
  };
});

const defectDetails = reports.map((report, index) => ({
  report_id: report.id,
  flash: 5 + index,
  short_shot: 3 + (index % 3),
  black_dot: 2 + (index % 2),
  scratch: 1,
  bubble: 1,
  extra_defects: {},
}));

const monthlyRows = reports.filter(
  (report) => report.report_date.slice(0, 7) === toIsoDate(today).slice(0, 7),
);

const aggregate = (rows) => ({
  reports: rows.length,
  output: rows.reduce((sum, row) => sum + row.qty_check, 0),
});

const expectedByMode = {
  daily: aggregate(reports.slice(-1)),
  weekly: aggregate(reports),
  monthly: aggregate(monthlyRows),
  range: aggregate(reports),
};

const config = {
  from: reports[0]?.report_date,
  to: reports.at(-1)?.report_date,
  partFilter: "E2E Fixture",
  expectedByMode,
};

const run = async () => {
  const reportIds = reports.map((row) => row.id);
  const partNos = parts.map((row) => row.part_no);

  const { error: cleanupDetailsError } = await supabase
    .from("inspection_defect_details")
    .delete()
    .in("report_id", reportIds);
  if (cleanupDetailsError) throw cleanupDetailsError;

  const { error: cleanupReportsError } = await supabase
    .from("inspection_reports")
    .delete()
    .in("id", reportIds);
  if (cleanupReportsError) throw cleanupReportsError;

  const { error: cleanupPartsError } = await supabase.from("parts").delete().in("part_no", partNos);
  if (cleanupPartsError) throw cleanupPartsError;

  const { error: partsError } = await supabase.from("parts").insert(parts);
  if (partsError) throw partsError;

  const { error: reportsError } = await supabase.from("inspection_reports").insert(reports);
  if (reportsError) throw reportsError;

  const { error: detailsError } = await supabase
    .from("inspection_defect_details")
    .insert(defectDetails);
  if (detailsError) throw detailsError;

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  console.log(`Fixture seeded: ${reports.length} reports, ${defectDetails.length} defect rows`);
  console.log(`Fixture config saved: ${CONFIG_PATH}`);
};

run().catch((error) => {
  console.error("Failed to seed E2E fixture:", error);
  process.exit(1);
});
