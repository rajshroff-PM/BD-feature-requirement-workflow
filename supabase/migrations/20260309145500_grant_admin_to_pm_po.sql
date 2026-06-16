DROP POLICY IF EXISTS "SUPER_ADMIN can manage all profiles" ON profiles;

CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'PM', 'PO')
  );
