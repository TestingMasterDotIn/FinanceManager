-- Add outstanding_balance column to loans table (My Loans section)
ALTER TABLE loans ADD COLUMN outstanding_balance NUMERIC(12,2) DEFAULT 0;

-- Update existing records to set outstanding_balance equal to principal for all loans
-- Outstanding balance for loans should start as the principal amount
UPDATE loans SET outstanding_balance = principal;

-- Make outstanding_balance NOT NULL after setting default values
ALTER TABLE loans ALTER COLUMN outstanding_balance SET NOT NULL;

-- Add check constraints to ensure outstanding_balance is not negative and not greater than original principal
ALTER TABLE loans ADD CONSTRAINT check_loans_outstanding_balance 
    CHECK (outstanding_balance >= 0 AND outstanding_balance <= principal);

-- Update the updated_at column when outstanding_balance changes
CREATE OR REPLACE FUNCTION update_loans_outstanding_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for loans table
CREATE TRIGGER update_loans_outstanding_balance_timestamp
    BEFORE UPDATE OF outstanding_balance ON loans
    FOR EACH ROW
    EXECUTE FUNCTION update_loans_outstanding_balance_timestamp();
