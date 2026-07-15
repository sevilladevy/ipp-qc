// Comprehensive seeder for testing dashboard and reports
// Run: node scripts/seed-test-data.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ohnvjdzonmzybfqryrau.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomShift() {
  return ["A", "B", "C"][randomInt(0, 2)];
}

// Defect columns with defaults
const DEFECT_COLUMNS = [
  "short_shot",
  "lipat",
  "burry",
  "bending",
  "dirty",
  "kontaminasi",
  "filter_bolong_rusak",
  "shinning",
  "silver",
  "flow_mark",
  "burn_mark",
  "sink_mark",
  "ejector_mark",
  "gas_mark",
  "crack",
  "gap",
  "dented",
  "scratch",
  "flash",
  "double_inject",
  "bubble",
  "gate_long",
  "gate_hole",
  "over_cut",
  "under_cut",
  "black_dot",
  "deform",
  "weld_line",
  "start_up_setting_alarm",
];

function generateDefectRow(reportId, totalNg) {
  const row = {
    report_id: reportId,
    extra_defects: {},
  };

  // Set all columns to 0 by default
  DEFECT_COLUMNS.forEach((col) => {
    row[col] = 0;
  });

  // Distribute totalNg across random defect types
  let remaining = totalNg;
  if (remaining > 0) {
    // Pick 2-5 random defects
    const numDefects = randomInt(2, Math.min(5, DEFECT_COLUMNS.length));
    const shuffled = [...DEFECT_COLUMNS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numDefects);

    for (const defect of selected) {
      if (remaining <= 0) break;
      const amount = randomInt(1, Math.min(remaining, Math.ceil(totalNg / selected.length)));
      row[defect] = amount;
      remaining -= amount;
    }

    // If still remaining, add to first defect
    if (remaining > 0) {
      row[selected[0]] += remaining;
    }
  }

  return row;
}

async function seedTestData() {
  console.log("🌱 Starting test data seeder...\n");

  // Get existing data
  console.log("Fetching existing data...");
  const { data: tables } = await supabase.from("inspection_tables").select("*");
  const { data: parts } = await supabase.from("parts").select("*").eq("is_active", true);
  const { data: profiles } = await supabase.from("profiles").select("id");

  if (!tables?.length || !parts?.length) {
    console.error("❌ No tables or parts found. Run seed data first.");
    return;
  }

  console.log(
    `Found: ${tables.length} tables, ${parts.length} parts, ${profiles?.length || 0} users`,
  );

  // Clear existing reports for fresh test data
  console.log("\nClearing existing reports...");
  await supabase
    .from("inspection_defect_details")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("inspection_reports")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  // Generate reports for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const userId = profiles?.[0]?.id || null;
  const reports = [];
  const defectDetails = [];

  console.log(
    `\nGenerating reports from ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}...`,
  );

  // Generate ~5-10 reports per day
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const reportsPerDay = randomInt(5, 10);

    for (let i = 0; i < reportsPerDay; i++) {
      const table = tables[randomInt(0, tables.length - 1)];
      const part = parts[randomInt(0, parts.length - 1)];
      const shift = randomShift();
      const qtyCheck = randomInt(100, 500);

      // Random NG rate between 0.5% and 8%
      const ngRate = Math.random() * 0.075 + 0.005;
      const totalNg = Math.round(qtyCheck * ngRate);

      // Generate jam mulai and jam selesai
      const jamMulaiHour =
        shift === "A" ? randomInt(6, 8) : shift === "B" ? randomInt(14, 16) : randomInt(22, 23);
      const jamMulai = `${String(jamMulaiHour).padStart(2, "0")}:${randomInt(0, 5)}${randomInt(0, 9)}`;
      const duration = randomInt(30, 120);
      const jamSelesaiHour = (jamMulaiHour + Math.floor(duration / 60)) % 24;
      const jamSelesaiMin = randomInt(0, 59);
      const jamSelesai = `${String(jamSelesaiHour).padStart(2, "0")}:${String(jamSelesaiMin).padStart(2, "0")}`;

      const report = {
        report_date: dateStr,
        shift,
        no_meja: table.no_meja,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        part_no: part.part_no,
        part_name: part.part_name,
        qty_check: qtyCheck,
        // total_ok is GENERATED column, don't insert
        total_ng: totalNg,
        created_by: userId,
      };

      reports.push(report);
    }
  }

  console.log(`Generated ${reports.length} reports. Inserting...`);

  // Insert reports in batches
  const batchSize = 50;
  let insertedReports = [];

  for (let i = 0; i < reports.length; i += batchSize) {
    const batch = reports.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("inspection_reports")
      .insert(batch)
      .select("id, report_date, shift, no_meja, part_no, total_ng");

    if (error) {
      console.error(`Error inserting reports batch ${i}:`, error.message);
    }

    if (data && data.length > 0) {
      insertedReports.push(...data);
    }

    if ((i + batchSize) % 200 === 0 || i + batchSize >= reports.length) {
      console.log(`  Inserted ${insertedReports.length}/${reports.length} reports...`);
    }
  }

  console.log(`\n✅ Successfully inserted ${insertedReports.length} reports`);

  // Generate defect details for each report
  console.log("\nGenerating defect details...");

  for (const report of insertedReports) {
    const defectRow = generateDefectRow(report.id, report.total_ng);
    defectDetails.push(defectRow);
  }

  console.log(`Inserting ${defectDetails.length} defect details...`);

  // Insert defect details in batches
  for (let i = 0; i < defectDetails.length; i += batchSize) {
    const batch = defectDetails.slice(i, i + batchSize);
    const { error } = await supabase.from("inspection_defect_details").insert(batch);

    if (error) {
      console.error(`Error inserting defect details batch ${i}:`, error.message);
    }

    if ((i + batchSize) % 200 === 0 || i + batchSize >= defectDetails.length) {
      console.log(
        `  Inserted ${Math.min(i + batchSize, defectDetails.length)}/${defectDetails.length} defect details...`,
      );
    }
  }

  // Final verification
  console.log("\n=== Final Verification ===");

  const { count: reportCount } = await supabase
    .from("inspection_reports")
    .select("*", { count: "exact", head: true });

  const { count: detailCount } = await supabase
    .from("inspection_defect_details")
    .select("*", { count: "exact", head: true });

  const { data: recentReports } = await supabase
    .from("inspection_reports")
    .select("report_date, shift, no_meja, part_name, qty_check, total_ok, total_ng")
    .order("report_date", { ascending: false })
    .limit(5);

  const { data: summary } = await supabase
    .from("inspection_reports")
    .select("qty_check, total_ok, total_ng");

  let totalQty = 0,
    totalOk = 0,
    totalNg = 0;
  summary?.forEach((r) => {
    totalQty += r.qty_check;
    totalOk += r.total_ok || 0;
    totalNg += r.total_ng;
  });

  console.log(`Total Reports: ${reportCount}`);
  console.log(`Total Defect Details: ${detailCount}`);
  console.log(`\nSummary:`);
  console.log(`  Qty Check: ${totalQty.toLocaleString()}`);
  console.log(`  OK: ${totalOk.toLocaleString()}`);
  console.log(`  NG: ${totalNg.toLocaleString()}`);
  console.log(`  Yield: ${totalQty > 0 ? ((totalOk / totalQty) * 100).toFixed(2) : 0}%`);
  console.log(`  NG Rate: ${totalQty > 0 ? ((totalNg / totalQty) * 100).toFixed(2) : 0}%`);

  console.log("\nRecent Reports:");
  recentReports?.forEach((r) => {
    console.log(
      `  ${r.report_date} | Shift ${r.shift} | Meja ${r.no_meja} | ${r.part_name} | OK: ${r.total_ok} | NG: ${r.total_ng}`,
    );
  });

  console.log("\n🎉 Test data seeding completed!");
  console.log("\nYou can now test:");
  console.log("  - Dashboard: http://localhost:3000/");
  console.log("  - Reports: http://localhost:3000/laporan");
  console.log("  - Analytics: http://localhost:3000/analitik");
}

seedTestData().catch(console.error);
