-- ============================================================
-- Migration: Pending Invitations System
-- Admins INSERT into this table; trigger picks up role on login.
-- ============================================================

-- Create the table
CREATE TABLE IF NOT EXISTS pending_invitations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    email text NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pending_invitations_email_unique UNIQUE (email),
    CONSTRAINT pending_invitations_role_check CHECK (role IN ('SUPER_ADMIN', 'BD', 'BA', 'PM', 'PO', 'DEV'))
);

-- Enable RLS
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can INSERT
DROP POLICY IF EXISTS "Admins can insert invitations" ON pending_invitations;
CREATE POLICY "Admins can insert invitations" ON pending_invitations
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'PM', 'PO')
    );

-- Only admins can SELECT
DROP POLICY IF EXISTS "Admins can view invitations" ON pending_invitations;
CREATE POLICY "Admins can view invitations" ON pending_invitations
    FOR SELECT
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'PM', 'PO')
    );

-- Only admins can UPDATE
DROP POLICY IF EXISTS "Admins can update invitations" ON pending_invitations;
CREATE POLICY "Admins can update invitations" ON pending_invitations
    FOR UPDATE
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SUPER_ADMIN', 'PM', 'PO')
    );

-- Update the handle_new_user trigger to check pending_invitations for role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    invited_role text;
    invited_name text;
BEGIN
    -- Check if the new user's email was pre-invited by an admin
    SELECT role, full_name INTO invited_role, invited_name
    FROM public.pending_invitations
    WHERE lower(email) = lower(new.email)
    LIMIT 1;

    IF invited_role IS NOT NULL THEN
        -- Use admin-assigned role and name
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            new.id,
            new.email,
            COALESCE(invited_name, new.raw_user_meta_data->>'full_name'),
            invited_role
        )
        ON CONFLICT (id) DO UPDATE SET
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name;
    ELSE
        -- No invitation: create profile without role (shows Access Not Authorized)
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (
            new.id,
            new.email,
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'role'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
