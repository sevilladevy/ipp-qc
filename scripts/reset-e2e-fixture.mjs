import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIG_PATH = path.resolve(
  process.env.E2E_FIXTURE_CONFIG_PATH || "scripts/e2e-fixture-config.json",
);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log("Skip reset fixture: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY belum tersedia.");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const run = async () => {
  const { data: reports, error: fetchReportsError } = await supabase
    .from("inspection_reports")
    .select("id")
    .like("id", "e2e-fixture-%");
  if (fetchReportsError) throw fetchReportsError;

  const reportIds = (reports ?? []).map((row) => row.id);
  if (reportIds.length > 0) {
    const { error: detailsError } = await supabase
      .from("inspection_defect_details")
      .delete()
      .in("report_id", reportIds);
    if (detailsError) throw detailsError;

    const { error: reportsError } = await supabase
      .from("inspection_reports")
      .delete()
      .in("id", reportIds);
    if (reportsError) throw reportsError;
  }

  const { error: partAlphaError } = await supabase
    .from("parts")
    .delete()
    .eq("part_no", "E2E-ALPHA");
  if (partAlphaError) throw partAlphaError;
  const { error: partBetaError } = await supabase.from("parts").delete().eq("part_no", "E2E-BETA");
  if (partBetaError) throw partBetaError;

  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }

  console.log(`Fixture reset complete. Removed ${reportIds.length} reports.`);
};

run().catch((error) => {
  console.error("Failed to reset E2E fixture:", error);
  process.exit(1);
});
