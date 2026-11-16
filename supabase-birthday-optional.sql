-- Lets a member remove their birthday (safe to re-run).
ALTER TABLE public.profiles ALTER COLUMN date_of_birth DROP NOT NULL;

SELECT is_nullable FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'date_of_birth';
