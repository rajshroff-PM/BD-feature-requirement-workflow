-- The profiles table was missing an UPDATE policy, causing "Failed to save role" 
-- because upsert tries to UPDATE the row created by the handle_new_user trigger.

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);
