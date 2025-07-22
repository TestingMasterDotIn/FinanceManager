-- Make expected_return_date nullable in lent_money table
ALTER TABLE public.lent_money ALTER COLUMN expected_return_date DROP NOT NULL;

-- Make expected_return_date nullable in borrowed_money table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'borrowed_money') THEN
        ALTER TABLE public.borrowed_money ALTER COLUMN expected_return_date DROP NOT NULL;
    END IF;
END $$;
