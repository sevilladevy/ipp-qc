-- ============ SEED DATA (Fixed) ============
-- Run this after tables are created

-- Seed defect types
INSERT INTO public.defect_types (kode_defect, nama_defect, kategori_defect, urutan) VALUES
  ('SHORT_SHOT', 'Short Shot', 'Proses', 1),
  ('LIPAT', 'Lipat', 'Kosmetik', 2),
  ('BURRY', 'Burry', 'Dimensi', 3),
  ('BENDING', 'Bending', 'Dimensi', 4),
  ('DIRTY', 'Dirty', 'Kosmetik', 5),
  ('KONTAMINASI', 'Kontaminasi', 'Material', 6),
  ('FILTER_BOLONG_RUSAK', 'Filter Bolong/Rusak', 'Proses', 7),
  ('SHINNING', 'Shinning', 'Kosmetik', 8),
  ('SILVER', 'Silver', 'Material', 9),
  ('FLOW_MARK', 'Flow Mark', 'Kosmetik', 10),
  ('BURN_MARK', 'Burn Mark', 'Kosmetik', 11),
  ('SINK_MARK', 'Sink Mark', 'Kosmetik', 12),
  ('EJECTOR_MARK', 'Ejector Mark', 'Proses', 13),
  ('GAS_MARK', 'Gas Mark', 'Proses', 14),
  ('CRACK', 'Crack', 'Fungsi', 15),
  ('GAP', 'Gap', 'Dimensi', 16),
  ('DENTED', 'Dented', 'Kosmetik', 17),
  ('SCRATCH', 'Scratch', 'Kosmetik', 18),
  ('FLASH', 'Flash', 'Dimensi', 19),
  ('DOUBLE_INJECT', 'Double Inject', 'Proses', 20),
  ('BUBBLE', 'Bubble', 'Material', 21),
  ('GATE_LONG', 'Gate Long', 'Dimensi', 22),
  ('GATE_HOLE', 'Gate Hole', 'Proses', 23),
  ('OVER_CUT', 'Over Cut', 'Dimensi', 24),
  ('UNDER_CUT', 'Under Cut', 'Dimensi', 25),
  ('BLACK_DOT', 'Black Dot', 'Kosmetik', 26),
  ('DEFORM', 'Deform', 'Dimensi', 27),
  ('WELD_LINE', 'Weld Line', 'Kosmetik', 28),
  ('START_UP_ALARM', 'Start Up / Setting Alarm', 'Proses', 29)
ON CONFLICT (kode_defect) DO UPDATE
SET nama_defect = EXCLUDED.nama_defect, kategori_defect = EXCLUDED.kategori_defect, urutan = EXCLUDED.urutan;

-- Seed inspection tables (meja)
INSERT INTO public.inspection_tables (no_meja, nama_meja, status) VALUES
  (1, 'Meja Inspeksi 1', 'Aktif'),
  (2, 'Meja Inspeksi 2', 'Aktif'),
  (3, 'Meja Inspeksi 3', 'Aktif'),
  (4, 'Meja Inspeksi 4', 'Aktif'),
  (5, 'Meja Inspeksi 5', 'Aktif'),
  (6, 'Meja Inspeksi 6', 'Aktif'),
  (7, 'Meja Inspeksi 7', 'Aktif'),
  (8, 'Meja Inspeksi 8', 'Aktif'),
  (9, 'Meja Inspeksi 9', 'Aktif'),
  (10, 'Meja Inspeksi 10', 'Aktif')
ON CONFLICT (no_meja) DO UPDATE
SET nama_meja = EXCLUDED.nama_meja, status = EXCLUDED.status;

-- Seed parts - use upsert to handle both part_no and part_name conflicts
DO $$
BEGIN
  -- Insert or update each part
  INSERT INTO public.parts (part_no, part_name, kategori, standard_cycle_time, is_active)
  VALUES ('BTN-40', 'BUTTON 40', 'SMALL', 30, TRUE)
  ON CONFLICT (part_no) DO UPDATE
  SET part_name = EXCLUDED.part_name, kategori = EXCLUDED.kategori, standard_cycle_time = EXCLUDED.standard_cycle_time, is_active = EXCLUDED.is_active;

  INSERT INTO public.parts (part_no, part_name, kategori, standard_cycle_time, is_active)
  VALUES ('DCT-KWN', 'DUCT KWN', 'MEDIUM', 45, TRUE)
  ON CONFLICT (part_no) DO UPDATE
  SET part_name = EXCLUDED.part_name, kategori = EXCLUDED.kategori, standard_cycle_time = EXCLUDED.standard_cycle_time, is_active = EXCLUDED.is_active;

  INSERT INTO public.parts (part_no, part_name, kategori, standard_cycle_time, is_active)
  VALUES ('ELM-K93A', 'ELEMENT K93A', 'BIG', 60, TRUE)
  ON CONFLICT (part_no) DO UPDATE
  SET part_name = EXCLUDED.part_name, kategori = EXCLUDED.kategori, standard_cycle_time = EXCLUDED.standard_cycle_time, is_active = EXCLUDED.is_active;
END $$;

-- Seed default parts for all tables
INSERT INTO public.inspection_table_default_parts (no_meja, part_no)
SELECT t.no_meja, p.part_no
FROM public.inspection_tables t
CROSS JOIN public.parts p
WHERE t.status = 'Aktif'
ON CONFLICT (no_meja, part_no) DO NOTHING;
