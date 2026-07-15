-- Drop all user tables in schema `public` before running fresh migrations.
-- WARNING: This permanently deletes table data.
-- Does NOT touch internal Supabase schemas such as auth, storage, realtime, etc.

DO $$
DECLARE
  obj RECORD;
BEGIN
  -- Drop ordinary and partitioned tables in public schema.
  FOR obj IN
    SELECT n.nspname AS schema_name, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format(
      'DROP TABLE IF EXISTS %I.%I CASCADE;',
      obj.schema_name,
      obj.table_name
    );
  END LOOP;
END $$;

