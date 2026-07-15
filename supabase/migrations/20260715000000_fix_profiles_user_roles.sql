-- Migration: Ensure profiles and user_roles tables exist
-- These tables may have been created via Supabase dashboard and need to be verified

-- Create user_roles enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('inspector', 'supervisor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "supervisor manage profiles" ON public.profiles;
CREATE POLICY "supervisor manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'inspector',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for user_roles
DROP POLICY IF EXISTS "auth read user_roles" ON public.user_roles;
CREATE POLICY "auth read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "supervisor manage user_roles" ON public.user_roles;
CREATE POLICY "supervisor manage user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor')) WITH CHECK (public.has_role(auth.uid(), 'supervisor'));

-- Create has_role function if it doesn't exist
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, needed_role app_role)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = $1 AND role = $2
  );
$$;

-- Create updated_at trigger function if it doesn't exist
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Add updated_at trigger to profiles if not exists
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger to user_roles if not exists
DROP TRIGGER IF EXISTS trg_user_roles_updated ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
