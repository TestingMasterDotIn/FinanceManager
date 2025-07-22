/*
  # Enhance user earnings table

  1. Table Changes
    - Add `salary` column (numeric, nullable)
    - Add `include_interest_earnings` column (boolean, default false)

  2. Updates
    - Existing records will have include_interest_earnings set to false by default
    - salary column will be nullable to support backward compatibility
*/

-- Add new columns to user_earnings table
ALTER TABLE user_earnings 
ADD COLUMN IF NOT EXISTS salary numeric CHECK (salary >= 0),
ADD COLUMN IF NOT EXISTS include_interest_earnings boolean DEFAULT false NOT NULL;

-- Update existing records to set include_interest_earnings to false if not already set
UPDATE user_earnings 
SET include_interest_earnings = false 
WHERE include_interest_earnings IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_earnings.salary IS 'Base salary component of monthly earnings';
COMMENT ON COLUMN user_earnings.include_interest_earnings IS 'Whether to include lending/borrowing interest in total earnings calculation';
