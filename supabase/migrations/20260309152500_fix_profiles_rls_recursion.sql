-- Fix infinite recursion in profiles RLS policy
-- The previous policy used 'FOR ALL', which caused infinite recursion 
-- when evaluating the USING clause (a SELECT querying the same table).
-- Changing to 'FOR UPDATE' breaks the recursion cycle.

DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "SUPER_ADMIN can manage all profiles" ON profiles;

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'PM', 'PO')
  );
