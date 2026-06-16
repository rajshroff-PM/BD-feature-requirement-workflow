-- Migration: add delete_user_admin RPC function
-- Description: Allows PM and SUPER_ADMIN roles to securely delete users from auth.users (and cascades to profiles).

CREATE OR REPLACE FUNCTION delete_user_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the user who created it (postgres superuser)
AS $$
BEGIN
    -- Verify the caller has PM or SUPER_ADMIN role
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('PM', 'SUPER_ADMIN')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only PM and SUPER_ADMIN can delete users.';
    END IF;

    -- Delete the user from auth.users.
    -- This will cascade and delete the user from profiles, thanks to the ON DELETE CASCADE constraint.
    DELETE FROM auth.users WHERE id = target_user_id;

END;
$$;
