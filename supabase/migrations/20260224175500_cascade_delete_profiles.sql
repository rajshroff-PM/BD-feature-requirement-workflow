-- The public.profiles table likely references auth.users(id). 
-- When removing a user in the dashboard, PostgreSQL blocks it because their profile still exists.
-- We must update the foreign key constraint to ON DELETE CASCADE.

DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the foreign key constraint connecting profiles.id to auth.users.id
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t1 ON c.conrelid = t1.oid
    JOIN pg_class t2 ON c.confrelid = t2.oid
    WHERE t1.relname = 'profiles' AND t2.relname = 'users' AND c.contype = 'f';

    IF constraint_name IS NOT NULL THEN
        -- Drop the existing constraint
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
        
        -- Re-add it with ON DELETE CASCADE
        EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT ' || quote_ident(constraint_name) || 
                ' FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE';
    ELSE
        -- If for some reason it wasn't named or found, just explicitly try to add it
        -- (This might fail if the constraint exists under an unknown situation, but usually it finds it)
        BEGIN
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            -- Ignore if it somehow exists
        END;
    END IF;
END;
$$;
