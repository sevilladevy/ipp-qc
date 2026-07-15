-- =============================================================================
-- SEED SCRIPT: Tambah Inspector Test
-- =============================================================================
-- Cara pakai:
--   1. Buka Supabase SQL Editor
--   2. Paste seluruh script ini
--   3. Adjust jumlah inspector di bawah (EDIT JUMLAH DISINI)
--   4. Run
-- =============================================================================

DO $$
DECLARE
  -- EDIT JUMLAH DISINI: berapa banyak inspector test yang mau dibuat
  num_inspectors INTEGER := 5;

  i INTEGER;
  dummy_id UUID;
  email TEXT;
  full_name TEXT;
  existing_count INTEGER;
  created_count INTEGER := 0;
BEGIN
  -- Cek apakah ada inspector di sistem
  SELECT COUNT(*) INTO existing_count FROM public.user_roles WHERE role = 'inspector';

  RAISE NOTICE 'Inspector existing: %', existing_count;

  -- Jika sudah ada inspector, tanya apakah tetap lanjut
  IF existing_count > 0 THEN
    RAISE NOTICE 'Warning: Sudah ada % inspector di sistem. Script akan skip jika tidak ada auth users kosong.',
      existing_count;
  END IF;

  -- Method 1: Coba pakai existing auth users yang belum punya role
  RAISE NOTICE 'Method 1: Mencari auth users tanpa role...';

  FOR dummy_id, email IN
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.user_roles ur ON ur.user_id = au.id
    WHERE ur.user_id IS NULL
    LIMIT num_inspectors
  LOOP
    -- Insert profile
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
      dummy_id,
      COALESCE(email, 'inspector_' || dummy_id || '@test.local'),
      'Inspector ' || (SELECT COALESCE(MAX(CAST(SUBSTRING(REPLACE(full_name, 'Inspector ', ''), 1, LENGTH(REPLACE(full_name, 'Inspector ', '') ) - POSITION(' ' in REPLACE(full_name, 'Inspector ', '') )) AS INTEGER)), 0) + 1 FROM profiles WHERE full_name LIKE 'Inspector %'),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert role
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (dummy_id, 'inspector', now())
    ON CONFLICT (user_id, role) DO NOTHING;

    created_count := created_count + 1;
    RAISE NOTICE '  Created inspector from auth user: %', email;
  END LOOP;

  -- Method 2: Jika masih kurang, buat dummy inspector dengan UUID random
  -- (CATATAN: ini untuk testing lokal saja, tidak bisa login)
  IF created_count < num_inspectors THEN
    RAISE NOTICE 'Method 2: Membuat % dummy inspector (testing only)...', num_inspectors - created_count;

    WHILE created_count < num_inspectors LOOP
      dummy_id := gen_random_uuid();
      i := created_count + 1;

      full_name := 'Inspector Test ' || i;
      email := 'inspector' || i || '@test.local';

      -- Insert profile (tanpa FK constraint check sementara)
      BEGIN
        INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
        VALUES (dummy_id, email, full_name, now(), now())
        ON CONFLICT (id) DO NOTHING;

        -- Insert role
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES (dummy_id, 'inspector', now())
        ON CONFLICT (user_id, role) DO NOTHING;

        created_count := created_count + 1;
        RAISE NOTICE '  Created: % (%)', full_name, email;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '  Gagal membuat inspector %: %', email, SQLERRM;
      END;
    END LOOP;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEED RESULT: % inspector berhasil dibuat', created_count;
  RAISE NOTICE '========================================';

END $$;

-- Verifikasi hasil
SELECT
  role,
  COUNT(*) as total,
  string_agg(full_name, ', ') as names
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE role = 'inspector'
GROUP BY role;
