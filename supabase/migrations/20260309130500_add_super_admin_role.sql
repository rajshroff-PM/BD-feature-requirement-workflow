-- migration to add SUPER_ADMIN role and allow them to manage users
-- 1. We don't have an enum for role in the original setup, it's just a text check constraint.
--    We need to drop the old check constraint on profiles and add a new one.

DO $$
BEGIN
  -- We assume the constraint is called profiles_role_check or similar. 
  -- We will just alter the table to drop all checks on 'role' and add the new one.
  -- PostgreSQL doesn't have an easy "replace constraint", so we drop and add.
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  
  -- Add the new constraint
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('SUPER_ADMIN', 'BD', 'BA', 'PM', 'PO', 'DEV'));
EXCEPTION
  WHEN undefined_object THEN
    -- In case the constraint had a different dynamic name, this might catch it, 
    -- but usually it's named tablename_columnname_check
    NULL;
END $$;

-- 2. Add policies for SUPER_ADMIN to manage users
-- Drop it if it existed, though it shouldn't
DROP POLICY IF EXISTS "SUPER_ADMIN can manage all profiles" ON profiles;

CREATE POLICY "SUPER_ADMIN can manage all profiles" ON profiles
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'SUPER_ADMIN'
  );

-- Also add a policy to let them see all auth.users if needed? (Postgres function handles most of that)
