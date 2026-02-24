-- Modify the handle_new_user function if it restricts roles, making sure 'PO' passes.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'BD')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely drop any check constraint on profiles.role that might reject 'PO', then add it back including 'PO'
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.profiles'::regclass
      AND a.attname = 'role'
      AND c.contype = 'c'
    LIMIT 1;
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
        EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT ' || quote_ident(constraint_name) || ' CHECK (role IN (''BD'', ''BA'', ''PM'', ''DEV'', ''PO''))';
    END IF;
END;
$$;
