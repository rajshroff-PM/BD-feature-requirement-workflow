-- Add DEV_LEAD to profiles role constraint
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('SUPER_ADMIN', 'BD', 'BA', 'PM', 'PO', 'DEV', 'DEV_LEAD'));
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Add DEV_LEAD to pending_invitations role constraint
DO $$
BEGIN
  ALTER TABLE pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check;
  
  ALTER TABLE pending_invitations ADD CONSTRAINT pending_invitations_role_check CHECK (role IN ('SUPER_ADMIN', 'BD', 'BA', 'PM', 'PO', 'DEV', 'DEV_LEAD'));
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;
