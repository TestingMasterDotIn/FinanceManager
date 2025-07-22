-- Fix payment_date column to be nullable
ALTER TABLE interest_payments ALTER COLUMN payment_date DROP NOT NULL;
