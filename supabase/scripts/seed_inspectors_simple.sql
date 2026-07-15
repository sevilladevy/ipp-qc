-- =============================================================================
-- SEED SIMPLE: Inspector Test (Langsung, No Ribet)
-- =============================================================================
-- Copy-paste bagian INSERT aja sesuai kebutuhan
-- =============================================================================

-- Example: Buat 5 inspector test
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    -- Insert profile
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'inspector' || i || '@test.local',
      'Inspector Test ' || i,
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert role (note: ini akan gagal karena profile.id belum ada)
    -- Jadi pakai cara di bawah aja
  END LOOP;
END $$;

-- =============================================================================
-- CARA SIMPEL: Langsung Insert Manual
-- =============================================================================
-- Karena profile.id harus referensi ke auth.users, cara termudah:
-- 1. Buat user dulu di Supabase Dashboard > Authentication > Users > Add User
-- 2. Atau pakai script di bawah untuk auth users yang sudah ada

-- Tambah inspector dari auth user yang sudah ada (tanpa role):
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT au.id, 'inspector', now()
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL
AND au.email NOT LIKE '%supabase%'
LIMIT 5;

-- Verifikasi
SELECT
  p.email,
  p.full_name,
  ur.role,
  ur.created_at
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
ORDER BY ur.created_at DESC;
