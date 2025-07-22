/*
  # Add outstanding balance to lending/borrowing tables

  1. Add outstanding_balance column to lent_money table
  2. Add outstanding_balance column to borrowed_money table
  3. Set default values for existing records
  4. Add constraints and triggers
*/

-- Add outstanding_balance to lent_money table
ALTER TABLE lent_money 
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(15,2) DEFAULT 0;

-- Add outstanding_balance to borrowed_money table  
ALTER TABLE borrowed_money 
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(15,2) DEFAULT 0;

-- Update existing records to set outstanding_balance equal to amount
UPDATE lent_money SET outstanding_balance = amount WHERE outstanding_balance = 0;
UPDATE borrowed_money SET outstanding_balance = amount WHERE outstanding_balance = 0;

-- Make outstanding_balance NOT NULL after setting default values
ALTER TABLE lent_money ALTER COLUMN outstanding_balance SET NOT NULL;
ALTER TABLE borrowed_money ALTER COLUMN outstanding_balance SET NOT NULL;

-- Add check constraints
ALTER TABLE lent_money ADD CONSTRAINT check_lent_outstanding_balance 
    CHECK (outstanding_balance >= 0 AND outstanding_balance <= amount);

ALTER TABLE borrowed_money ADD CONSTRAINT check_borrowed_outstanding_balance 
    CHECK (outstanding_balance >= 0 AND outstanding_balance <= amount);

-- Add comments for documentation
COMMENT ON COLUMN lent_money.outstanding_balance IS 'Current outstanding amount remaining to be received';
COMMENT ON COLUMN borrowed_money.outstanding_balance IS 'Current outstanding amount remaining to be paid';
