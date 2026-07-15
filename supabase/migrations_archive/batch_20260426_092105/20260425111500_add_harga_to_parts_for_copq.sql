-- Add confidential unit price for CoPQ calculation
-- Harga disimpan di tabel parts agar bisa dipakai untuk analitik biaya defect.
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS harga NUMERIC(14, 2);

UPDATE public.parts
SET harga = 0
WHERE harga IS NULL;

ALTER TABLE public.parts
  ALTER COLUMN harga SET DEFAULT 0,
  ALTER COLUMN harga SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parts_harga_non_negative'
  ) THEN
    ALTER TABLE public.parts
      ADD CONSTRAINT parts_harga_non_negative CHECK (harga >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.parts.harga IS 'Harga unit part (confidential) untuk perhitungan CoPQ.';

