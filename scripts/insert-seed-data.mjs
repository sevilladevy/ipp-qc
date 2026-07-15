// Run this to insert seed data
// Usage: node scripts/insert-seed-data.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ohnvjdzonmzybfqryrau.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedData() {
  console.log("Seeding data...\n");

  // Seed defect types
  console.log("1. Seeding defect types...");
  const defectTypes = [
    { kode_defect: "SHORT_SHOT", nama_defect: "Short Shot", kategori_defect: "Proses", urutan: 1 },
    { kode_defect: "LIPAT", nama_defect: "Lipat", kategori_defect: "Kosmetik", urutan: 2 },
    { kode_defect: "BURRY", nama_defect: "Burry", kategori_defect: "Dimensi", urutan: 3 },
    { kode_defect: "BENDING", nama_defect: "Bending", kategori_defect: "Dimensi", urutan: 4 },
    { kode_defect: "DIRTY", nama_defect: "Dirty", kategori_defect: "Kosmetik", urutan: 5 },
    {
      kode_defect: "KONTAMINASI",
      nama_defect: "Kontaminasi",
      kategori_defect: "Material",
      urutan: 6,
    },
    {
      kode_defect: "FILTER_BOLONG_RUSAK",
      nama_defect: "Filter Bolong/Rusak",
      kategori_defect: "Proses",
      urutan: 7,
    },
    { kode_defect: "SHINNING", nama_defect: "Shinning", kategori_defect: "Kosmetik", urutan: 8 },
    { kode_defect: "SILVER", nama_defect: "Silver", kategori_defect: "Material", urutan: 9 },
    { kode_defect: "FLOW_MARK", nama_defect: "Flow Mark", kategori_defect: "Kosmetik", urutan: 10 },
    { kode_defect: "BURN_MARK", nama_defect: "Burn Mark", kategori_defect: "Kosmetik", urutan: 11 },
    { kode_defect: "SINK_MARK", nama_defect: "Sink Mark", kategori_defect: "Kosmetik", urutan: 12 },
    {
      kode_defect: "EJECTOR_MARK",
      nama_defect: "Ejector Mark",
      kategori_defect: "Proses",
      urutan: 13,
    },
    { kode_defect: "GAS_MARK", nama_defect: "Gas Mark", kategori_defect: "Proses", urutan: 14 },
    { kode_defect: "CRACK", nama_defect: "Crack", kategori_defect: "Fungsi", urutan: 15 },
    { kode_defect: "GAP", nama_defect: "Gap", kategori_defect: "Dimensi", urutan: 16 },
    { kode_defect: "DENTED", nama_defect: "Dented", kategori_defect: "Kosmetik", urutan: 17 },
    { kode_defect: "SCRATCH", nama_defect: "Scratch", kategori_defect: "Kosmetik", urutan: 18 },
    { kode_defect: "FLASH", nama_defect: "Flash", kategori_defect: "Dimensi", urutan: 19 },
    {
      kode_defect: "DOUBLE_INJECT",
      nama_defect: "Double Inject",
      kategori_defect: "Proses",
      urutan: 20,
    },
    { kode_defect: "BUBBLE", nama_defect: "Bubble", kategori_defect: "Material", urutan: 21 },
    { kode_defect: "GATE_LONG", nama_defect: "Gate Long", kategori_defect: "Dimensi", urutan: 22 },
    { kode_defect: "GATE_HOLE", nama_defect: "Gate Hole", kategori_defect: "Proses", urutan: 23 },
    { kode_defect: "OVER_CUT", nama_defect: "Over Cut", kategori_defect: "Dimensi", urutan: 24 },
    { kode_defect: "UNDER_CUT", nama_defect: "Under Cut", kategori_defect: "Dimensi", urutan: 25 },
    { kode_defect: "BLACK_DOT", nama_defect: "Black Dot", kategori_defect: "Kosmetik", urutan: 26 },
    { kode_defect: "DEFORM", nama_defect: "Deform", kategori_defect: "Dimensi", urutan: 27 },
    { kode_defect: "WELD_LINE", nama_defect: "Weld Line", kategori_defect: "Kosmetik", urutan: 28 },
    {
      kode_defect: "START_UP_ALARM",
      nama_defect: "Start Up / Setting Alarm",
      kategori_defect: "Proses",
      urutan: 29,
    },
  ];

  for (const defect of defectTypes) {
    const { error } = await supabase.from("defect_types").upsert(defect, {
      onConflict: "kode_defect",
    });
    if (error) {
      console.error(`  Error inserting ${defect.kode_defect}:`, error.message);
    }
  }
  console.log("  Defect types seeded!");

  // Seed inspection tables
  console.log("2. Seeding inspection tables...");
  const tables = [];
  for (let i = 1; i <= 10; i++) {
    tables.push({
      no_meja: i,
      nama_meja: `Meja Inspeksi ${i}`,
      status: "Aktif",
    });
  }
  const { error: tablesError } = await supabase.from("inspection_tables").upsert(tables, {
    onConflict: "no_meja",
  });
  if (tablesError) {
    console.error("  Error seeding tables:", tablesError.message);
  } else {
    console.log("  Inspection tables seeded!");
  }

  // Seed parts
  console.log("3. Seeding parts...");
  const parts = [
    {
      part_no: "BTN-40",
      part_name: "BUTTON 40",
      kategori: "SMALL",
      standard_cycle_time: 30,
      is_active: true,
    },
    {
      part_no: "DCT-KWN",
      part_name: "DUCT KWN",
      kategori: "MEDIUM",
      standard_cycle_time: 45,
      is_active: true,
    },
    {
      part_no: "ELM-K93A",
      part_name: "ELEMENT K93A",
      kategori: "BIG",
      standard_cycle_time: 60,
      is_active: true,
    },
  ];

  for (const part of parts) {
    // First try to update, then insert
    const { error: updateError } = await supabase
      .from("parts")
      .update(part)
      .eq("part_no", part.part_no);

    if (updateError) {
      const { error: insertError } = await supabase.from("parts").insert(part);
      if (insertError) {
        console.error(`  Error inserting part ${part.part_no}:`, insertError.message);
      }
    }
  }
  console.log("  Parts seeded!");

  // Seed default parts for tables
  console.log("4. Seeding default parts for tables...");

  // Get all tables and parts
  const { data: allTables } = await supabase
    .from("inspection_tables")
    .select("no_meja")
    .eq("status", "Aktif");
  const { data: allParts } = await supabase.from("parts").select("part_no");

  if (allTables && allParts) {
    const defaultParts = [];
    for (const table of allTables) {
      for (const part of allParts) {
        defaultParts.push({
          no_meja: table.no_meja,
          part_no: part.part_no,
        });
      }
    }

    for (const dp of defaultParts) {
      const { error } = await supabase.from("inspection_table_default_parts").upsert(dp, {
        onConflict: "no_meja,part_no",
      });
      if (error && !error.message.includes("duplicate")) {
        console.error(`  Error inserting default part:`, error.message);
      }
    }
    console.log("  Default parts seeded!");
  }

  // Verify
  console.log("\n=== Verification ===");
  const { count: defectCount } = await supabase
    .from("defect_types")
    .select("*", { count: "exact", head: true });
  const { count: tableCount } = await supabase
    .from("inspection_tables")
    .select("*", { count: "exact", head: true });
  const { count: partCount } = await supabase
    .from("parts")
    .select("*", { count: "exact", head: true });
  const { count: defaultPartCount } = await supabase
    .from("inspection_table_default_parts")
    .select("*", { count: "exact", head: true });

  console.log(`Defect Types: ${defectCount}`);
  console.log(`Inspection Tables: ${tableCount}`);
  console.log(`Parts: ${partCount}`);
  console.log(`Default Parts: ${defaultPartCount}`);

  console.log("\n✅ Seed data completed!");
}

seedData().catch(console.error);
