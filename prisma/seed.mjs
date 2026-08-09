// Seeds the local Postgres from exported production JSON (from earlier REST export).
// Data source directory: passed via SEED_DATA_DIR (defaults to the export dir).
// Run: node prisma/seed.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/ipp_quality";
const SEED_DIR = process.env.SEED_DATA_DIR ?? "C:\\Users\\user\\AppData\\Local\\Temp\\opencode\\ipp-migration";

// Single default password applied to every migrated account. Anyone logging in
// after the migration uses this password until an admin resets it via the app.
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "ipp12345";

function load(name, fallback = []) {
  try {
    return JSON.parse(readFileSync(join(SEED_DIR, `${name}.json`), "utf8"));
  } catch {
    console.warn(`[seed] ${name}.json not found - using empty`);
    return fallback;
  }
}

function toDate(v) {
  if (!v) return new Date(0);
  return new Date(v);
}

function toTime(v) {
  // "07:00:00" -> Date
  const [h, m, s] = String(v ?? "00:00:00").split(":").map(Number);
  const d = new Date(1970, 0, 1, h || 0, m || 0, s || 0);
  return d;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding local Postgres:", DATABASE_URL);

  // ---- CRITICAL: wipe existing data so reseeds are idempotent ----
  await prisma.inspectionDefectDetail.deleteMany();
  await prisma.inspectionReport.deleteMany();
  await prisma.inspectionTableDefaultPart.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.part.deleteMany();
  await prisma.inspectionTable.deleteMany();
  await prisma.defectType.deleteMany();

  // 1. defect_types
  const defects = load("defect_types");
  for (const d of defects) {
    await prisma.defectType.create({
      data: {
        id: d.id,
        kode_defect: d.kode_defect,
        nama_defect: d.nama_defect,
        deskripsi: d.deskripsi,
        kategori_defect: d.kategori_defect,
        is_active: d.is_active,
        urutan: d.urutan,
        created_at: toDate(d.created_at),
        updated_at: toDate(d.updated_at),
      },
    });
  }
  console.log(`  defect_types: ${defects.length}`);

  // inspect.  tables
  const tables = load("inspection_tables");
  for (const t of tables) {
    await prisma.inspectionTable.create({
      data: {
        id: t.id,
        no_meja: t.no_meja,
        nama_meja: t.nama_meja,
        status: t.status,
        created_at: toDate(t.created_at),
        updated_at: toDate(t.updated_at),
      },
    });
  }
  console.log(`  inspection_tables: ${tables.length}`);

  // parts
  const parts = load("parts");
  for (const p of parts) {
    await prisma.part.create({
      data: {
        id: p.id,
        part_no: p.part_no,
        part_name: p.part_name,
        kategori: p.kategori,
        customer_id: p.customer ?? null,
        is_active: p.is_active,
        standard_cycle_time: p.standard_cycle_time,
        created_at: toDate(p.created_at),
        updated_at: toDate(p.updated_at),
      },
    });
  }
  console.log(`  parts: ${parts.length}`);

  // inspection_table_default_parts (empty in source, but keep structure)
  const defaultParts = load("inspection_table_default_parts");
  for (const dp of defaultParts) {
    await prisma.inspectionTableDefaultPart.create({
      data: {
        id: dp.id,
        no_meja: dp.no_meja,
        part_no: dp.part_no,
        created_at: toDate(dp.created_at),
      },
    });
  }
  console.log(`  inspection_table_default_parts: ${defaultParts.length}`);

  // ---- AUTH DATA ----
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // profiles (every profile gets the default password hash)
  const profiles = load("profiles");
  for (const pr of profiles) {
    await prisma.profile.create({
      data: {
        id: pr.id,
        full_name: pr.full_name,
        email: pr.email,
        password_hash: hash,
        created_at: toDate(pr.created_at),
        updated_at: toDate(pr.updated_at),
      },
    });
  }
  console.log(`  profiles: ${profiles.length} (default password: "${DEFAULT_PASSWORD}")`);

  // user_roles (map live "operator" -> "inspector" per code standard)
  const roles = load("user_roles");
  const roleMap = new Map();
  for (const r of roles) {
    const role = r.role === "operator" || r.role === "inspector" ? "inspector" : "supervisor";
    if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, role === "supervisor" ? "supervisor" : "inspector");
  }
  for (const [userId, role] of roleMap.entries()) {
    await prisma.userRole.create({
      data: { user_id: userId, role, created_at: new Date() },
    });
  }
  console.log(`  user_roles (deduped to one role per user): ${roleMap.size}`);

  // ---- INSPECTION REPORTS + DETAILS ----
  const reports = load("inspection_reports");
  for (const r of reports) {
    await prisma.inspectionReport.create({
      data: {
        id: r.id,
        report_date: toDate(r.report_date),
        shift: r.shift,
        no_meja: r.no_meja,
        jam_mulai: toTime(r.jam_mulai),
        jam_selesai: toTime(r.jam_selesai),
        part_no: r.part_no,
        part_name: r.part_name,
        qty_check: r.qty_check,
        total_ng: r.total_ng,
        total_ok: r.total_ok,
        actual_cycle_time: r.actual_cycle_time,
        created_by: r.created_by,
        created_at: toDate(r.created_at),
        updated_at: toDate(r.updated_at),
        lot_no: r.lot_no,
      },
    });
  }
  console.log(`  inspection_reports: ${reports.length}`);

  const details = load("inspection_defect_details");
  for (const d of details) {
    await prisma.inspectionDefectDetail.create({
      data: {
        id: d.id,
        report_id: d.report_id,
        short_shot: d.short_shot ?? 0,
        lipat: d.lipat ?? 0,
        burry: d.burry ?? 0,
        bending: d.bending ?? 0,
        dirty: d.dirty ?? 0,
        kontaminasi: d.kontaminasi ?? 0,
        filter_bolong_rusak: d.filter_bolong_rusak ?? 0,
        shinning: d.shinning ?? 0,
        silver: d.silver ?? 0,
        flow_mark: d.flow_mark ?? 0,
        burn_mark: d.burn_mark ?? 0,
        sink_mark: d.sink_mark ?? 0,
        ejector_mark: d.ejector_mark ?? 0,
        gas_mark: d.gas_mark ?? 0,
        crack: d.crack ?? 0,
        gap: d.gap ?? 0,
        dented: d.dented ?? 0,
        scratch: d.scratch ?? 0,
        flash: d.flash ?? 0,
        double_inject: d.double_inject ?? 0,
        bubble: d.bubble ?? 0,
        gate_long: d.gate_long ?? 0,
        gate_hole: d.gate_hole ?? 0,
        over_cut: d.over_cut ?? 0,
        under_cut: d.under_cut ?? 0,
        black_dot: d.black_dot ?? 0,
        deform: d.deform ?? 0,
        weld_line: d.weld_line ?? 0,
        start_up_setting_alarm: d.start_up_setting_alarm ?? 0,
        extra_defects: d.extra_defects ?? {},
        created_at: toDate(d.created_at),
      },
    });
  }
  console.log(`  inspection_defect_details: ${details.length}`);

  await prisma.$disconnect();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});