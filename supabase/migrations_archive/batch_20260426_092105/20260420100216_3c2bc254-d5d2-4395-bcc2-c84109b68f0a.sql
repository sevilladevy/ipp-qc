-- Fix: restrict profiles SELECT so users only see their own profile (or supervisors see all)
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;

CREATE POLICY "users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "supervisors read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- Fix: restrict role management so supervisors cannot grant supervisor role via client
-- Replace the over-broad ALL policy with narrower ones.
DROP POLICY IF EXISTS "supervisor manage roles" ON public.user_roles;

-- Supervisors may insert ONLY non-supervisor (operator) roles via client.
CREATE POLICY "supervisors insert non-supervisor roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'supervisor'::app_role)
  AND role <> 'supervisor'::app_role
);

-- Supervisors may update only to non-supervisor roles, and may not modify supervisor rows.
CREATE POLICY "supervisors update non-supervisor roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'supervisor'::app_role)
  AND role <> 'supervisor'::app_role
)
WITH CHECK (
  public.has_role(auth.uid(), 'supervisor'::app_role)
  AND role <> 'supervisor'::app_role
);

-- Supervisors may delete any role row (needed to demote / clean up operator rows when promoting).
CREATE POLICY "supervisors delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::app_role));

-- Note: Promotion to supervisor is handled exclusively server-side via the
-- promoteToSupervisor server function using the service role key, which
-- bypasses RLS. Client-side privilege escalation is now blocked.