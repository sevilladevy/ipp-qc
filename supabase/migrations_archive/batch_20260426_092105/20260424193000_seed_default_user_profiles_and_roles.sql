-- Seed aplikasi untuk akun auth.users yang sudah ada.
-- Catatan:
-- 1. Migration ini tidak membuat row di auth.users.
-- 2. Migration ini hanya menyelaraskan public.profiles dan public.user_roles
--    untuk akun yang sudah tersedia di Supabase Auth.
-- 3. admin@ipp.com dan supervisor@ipp.com diperlakukan sebagai supervisor.

DO $$
DECLARE
  missing_emails TEXT;
BEGIN
  SELECT string_agg(seed.email, ', ' ORDER BY seed.email)
  INTO missing_emails
  FROM (
    VALUES
      ('fa3edf2a-a471-45c6-b758-d520be98b007'::uuid, 'admin@ipp.com'),
      ('d35bedcf-5dce-455d-8d13-695247ecfdb1'::uuid, 'supervisor@ipp.com'),
      ('bc454000-3f00-4ed4-8e9b-bebc69eade08'::uuid, 'user@ipp.com')
  ) AS seed(id, email)
  LEFT JOIN auth.users auth_user ON auth_user.id = seed.id
  WHERE auth_user.id IS NULL;

  IF missing_emails IS NOT NULL THEN
    RAISE NOTICE 'User seed dilewati untuk akun auth yang belum ada: %', missing_emails;
  END IF;
END $$;

INSERT INTO public.profiles (id, email, full_name)
SELECT
  seed.id,
  COALESCE(auth_user.email, seed.email),
  seed.full_name
FROM (
  VALUES
    (
      'fa3edf2a-a471-45c6-b758-d520be98b007'::uuid,
      'admin@ipp.com',
      'Admin IPP'
    ),
    (
      'd35bedcf-5dce-455d-8d13-695247ecfdb1'::uuid,
      'supervisor@ipp.com',
      'Supervisor IPP'
    ),
    (
      'bc454000-3f00-4ed4-8e9b-bebc69eade08'::uuid,
      'user@ipp.com',
      'Operator IPP'
    )
) AS seed(id, email, full_name)
JOIN auth.users auth_user ON auth_user.id = seed.id
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

DELETE FROM public.user_roles AS existing
USING (
  VALUES
    (
      'fa3edf2a-a471-45c6-b758-d520be98b007'::uuid,
      'supervisor'::public.app_role
    ),
    (
      'd35bedcf-5dce-455d-8d13-695247ecfdb1'::uuid,
      'supervisor'::public.app_role
    ),
    (
      'bc454000-3f00-4ed4-8e9b-bebc69eade08'::uuid,
      'operator'::public.app_role
    )
) AS seed(user_id, role)
WHERE existing.user_id = seed.user_id
  AND existing.role <> seed.role;

INSERT INTO public.user_roles (user_id, role)
SELECT
  seed.user_id,
  seed.role
FROM (
  VALUES
    (
      'fa3edf2a-a471-45c6-b758-d520be98b007'::uuid,
      'supervisor'::public.app_role
    ),
    (
      'd35bedcf-5dce-455d-8d13-695247ecfdb1'::uuid,
      'supervisor'::public.app_role
    ),
    (
      'bc454000-3f00-4ed4-8e9b-bebc69eade08'::uuid,
      'operator'::public.app_role
    )
) AS seed(user_id, role)
JOIN auth.users auth_user ON auth_user.id = seed.user_id
ON CONFLICT (user_id, role) DO NOTHING;
