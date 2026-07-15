-- =============================================================================
-- QUICK SEED: Tambah Inspector dari Auth User yang Sudah Ada
-- =============================================================================
-- Run script ini di SQL Editor untuk menambahkan role inspector
-- ke semua auth users yang belum punya role
-- =============================================================================

-- Lihat semua auth users:
-- SELECT id, email, created_at FROM auth.users LIMIT 10;

-- Tambah inspector role untuk auth user tertentu (ganti UUID-nya):
-- INSERT INTO public.user_roles (user_id, role, created_at)
-- VALUES ('masukkan-uuid-disini', 'inspector', now());

-- Atau auto-assign inspector ke semua auth users yang belum punya role:
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT au.id, 'inspector', now()
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL
  AND au.email NOT LIKE '%supabase-internal%'
  AND au.email NOT LIKE '%@supabase%';

-- Lihat hasil:
SELECT
  p.full_name,
  p.email,
  ur.role,
  CASE
    WHEN ur.role = 'supervisor' THEN 'Supervisor'
    WHEN ur.role = 'inspector' THEN 'Inspector'
    ELSE 'Unknown'
  END as role_display
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
ORDER BY ur.role, p.full_name;
