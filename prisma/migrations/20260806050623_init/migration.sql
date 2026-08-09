-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('inspector', 'supervisor');

-- CreateEnum
CREATE TYPE "InspectionShift" AS ENUM ('A', 'B', 'C');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "full_name" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "AppRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_tables" (
    "id" SERIAL NOT NULL,
    "no_meja" INTEGER NOT NULL,
    "nama_meja" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aktif',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "part_no" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "kategori" TEXT,
    "customer" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "standard_cycle_time" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_reports" (
    "id" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "shift" "InspectionShift" NOT NULL,
    "no_meja" INTEGER NOT NULL,
    "jam_mulai" TIME NOT NULL,
    "jam_selesai" TIME NOT NULL,
    "part_no" TEXT NOT NULL,
    "part_name" TEXT NOT NULL,
    "qty_check" INTEGER NOT NULL DEFAULT 0,
    "total_ng" INTEGER NOT NULL DEFAULT 0,
    "total_ok" INTEGER,
    "actual_cycle_time" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lot_no" TEXT,

    CONSTRAINT "inspection_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_defect_details" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "short_shot" INTEGER NOT NULL DEFAULT 0,
    "lipat" INTEGER NOT NULL DEFAULT 0,
    "burry" INTEGER NOT NULL DEFAULT 0,
    "bending" INTEGER NOT NULL DEFAULT 0,
    "dirty" INTEGER NOT NULL DEFAULT 0,
    "kontaminasi" INTEGER NOT NULL DEFAULT 0,
    "filter_bolong_rusak" INTEGER NOT NULL DEFAULT 0,
    "shinning" INTEGER NOT NULL DEFAULT 0,
    "silver" INTEGER NOT NULL DEFAULT 0,
    "flow_mark" INTEGER NOT NULL DEFAULT 0,
    "burn_mark" INTEGER NOT NULL DEFAULT 0,
    "sink_mark" INTEGER NOT NULL DEFAULT 0,
    "ejector_mark" INTEGER NOT NULL DEFAULT 0,
    "gas_mark" INTEGER NOT NULL DEFAULT 0,
    "crack" INTEGER NOT NULL DEFAULT 0,
    "gap" INTEGER NOT NULL DEFAULT 0,
    "dented" INTEGER NOT NULL DEFAULT 0,
    "scratch" INTEGER NOT NULL DEFAULT 0,
    "flash" INTEGER NOT NULL DEFAULT 0,
    "double_inject" INTEGER NOT NULL DEFAULT 0,
    "bubble" INTEGER NOT NULL DEFAULT 0,
    "gate_long" INTEGER NOT NULL DEFAULT 0,
    "gate_hole" INTEGER NOT NULL DEFAULT 0,
    "over_cut" INTEGER NOT NULL DEFAULT 0,
    "under_cut" INTEGER NOT NULL DEFAULT 0,
    "black_dot" INTEGER NOT NULL DEFAULT 0,
    "deform" INTEGER NOT NULL DEFAULT 0,
    "weld_line" INTEGER NOT NULL DEFAULT 0,
    "start_up_setting_alarm" INTEGER NOT NULL DEFAULT 0,
    "extra_defects" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_defect_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_table_default_parts" (
    "id" TEXT NOT NULL,
    "no_meja" INTEGER NOT NULL,
    "part_no" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_table_default_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_types" (
    "id" SERIAL NOT NULL,
    "kode_defect" TEXT NOT NULL,
    "nama_defect" TEXT NOT NULL,
    "deskripsi" TEXT,
    "kategori_defect" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "defect_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_tables_no_meja_key" ON "inspection_tables"("no_meja");

-- CreateIndex
CREATE UNIQUE INDEX "parts_part_no_key" ON "parts"("part_no");

-- CreateIndex
CREATE UNIQUE INDEX "parts_part_name_key" ON "parts"("part_name");

-- CreateIndex
CREATE UNIQUE INDEX "defect_types_kode_defect_key" ON "defect_types"("kode_defect");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_defect_details" ADD CONSTRAINT "inspection_defect_details_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "inspection_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_table_default_parts" ADD CONSTRAINT "inspection_table_default_parts_no_meja_fkey" FOREIGN KEY ("no_meja") REFERENCES "inspection_tables"("no_meja") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_table_default_parts" ADD CONSTRAINT "inspection_table_default_parts_part_no_fkey" FOREIGN KEY ("part_no") REFERENCES "parts"("part_no") ON DELETE CASCADE ON UPDATE CASCADE;
