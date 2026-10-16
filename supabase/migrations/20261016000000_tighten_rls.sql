-- Migration: Tighten RLS policies for sensitive tables
-- Date: 2026-10-16
-- Fixes: audit_log INSERT bypass, non_conformities INSERT no owner check

-- audit_log: restrict INSERT to creator only
DROP POLICY IF EXISTS "audit log insert all" ON public.audit_log;
CREATE POLICY "audit log insert own"
  ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'supervisor'));

-- audit_log: restrict UPDATE/DELETE to supervisor only
DROP POLICY IF EXISTS "audit log update all" ON public.audit_log;
DROP POLICY IF EXISTS "audit log delete all" ON public.audit_log;
CREATE POLICY "audit log update supervisor"
  ON public.audit_log
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));
CREATE POLICY "audit log delete supervisor"
  ON public.audit_log
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

-- non_conformities: restrict INSERT to owner only
DROP POLICY IF EXISTS "nc insert all" ON public.non_conformities;
CREATE POLICY "nc insert own"
  ON public.non_conformities
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- non_conformities: restrict UPDATE to owner or supervisor
DROP POLICY IF EXISTS "nc update all" ON public.non_conformities;
CREATE POLICY "nc update own_or_supervisor"
  ON public.non_conformities
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'supervisor'));

-- profiles: restrict DELETE to supervisor only (SELECT stays permissive for directory)
DROP POLICY IF EXISTS "profiles delete all" ON public.profiles;
CREATE POLICY "profiles delete supervisor"
  ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));

-- user_roles: restrict DELETE to supervisor only
DROP POLICY IF EXISTS "user_roles delete all" ON public.user_roles;
CREATE POLICY "user_roles delete supervisor"
  ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'));
