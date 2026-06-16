-- Rename PO role to MANAGEMENT in profiles and pending_invitations

-- Drop constraints FIRST so the UPDATE doesn't violate them
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check;

-- Update existing rows
UPDATE public.profiles SET role = 'MANAGEMENT' WHERE role = 'PO';
UPDATE public.pending_invitations SET role = 'MANAGEMENT' WHERE role = 'PO';

-- Re-add constraints with MANAGEMENT instead of PO
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('SUPER_ADMIN', 'BD', 'BA', 'PM', 'MANAGEMENT', 'DEV', 'DEV_LEAD'));

ALTER TABLE public.pending_invitations ADD CONSTRAINT pending_invitations_role_check
  CHECK (role IN ('SUPER_ADMIN', 'BD', 'BA', 'PM', 'MANAGEMENT', 'DEV', 'DEV_LEAD'));

-- Update admin RLS policies to use MANAGEMENT instead of PO
-- Keep FOR UPDATE (not FOR ALL) to avoid infinite RLS recursion on SELECT
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'PM', 'MANAGEMENT')
  );

DROP POLICY IF EXISTS "Admins can insert invitations" ON public.pending_invitations;
CREATE POLICY "Admins can insert invitations" ON public.pending_invitations
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'PM', 'MANAGEMENT')
  );

DROP POLICY IF EXISTS "Admins can view invitations" ON public.pending_invitations;
CREATE POLICY "Admins can view invitations" ON public.pending_invitations
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'PM', 'MANAGEMENT')
  );

DROP POLICY IF EXISTS "Admins can update invitations" ON public.pending_invitations;
CREATE POLICY "Admins can update invitations" ON public.pending_invitations
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'PM', 'MANAGEMENT')
  );
