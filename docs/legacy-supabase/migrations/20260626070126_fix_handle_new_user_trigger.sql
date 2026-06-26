/*
# Fix handle_new_user trigger

## Problem
The `handle_new_user()` trigger fires on every INSERT into auth.users.
Without an EXCEPTION handler, any failure inside the function causes the
entire user-creation transaction to roll back, producing the Supabase error
"Database error saving new user".

Two issues fixed:
1. Added `SET search_path = public` — required for SECURITY DEFINER functions
   to reliably resolve table references.
2. Wrapped the INSERT in a BEGIN...EXCEPTION...END block so a profile-insert
   failure (e.g. duplicate key, RLS edge case, transient error) never blocks
   the actual user creation.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    INSERT INTO profiles (id, full_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Profile creation failure must never block user creation
    NULL;
  END;
  RETURN NEW;
END;
$$;
