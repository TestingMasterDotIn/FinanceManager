-- Create table for tracking monthly interest payments
CREATE TABLE interest_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL,
  loan_type VARCHAR(20) NOT NULL CHECK (loan_type IN ('lent', 'borrowed')),
  payment_month INTEGER NOT NULL, -- Month number since loan started (1, 2, 3...)
  payment_date DATE,
  amount_paid DECIMAL(15,2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique constraint for loan and month
  UNIQUE(loan_id, loan_type, payment_month)
);

-- Create indexes for better performance
CREATE INDEX idx_interest_payments_loan_id ON interest_payments(loan_id);
CREATE INDEX idx_interest_payments_loan_type ON interest_payments(loan_type);
CREATE INDEX idx_interest_payments_due_date ON interest_payments(due_date);
CREATE INDEX idx_interest_payments_is_paid ON interest_payments(is_paid);

-- Create RLS policies
ALTER TABLE interest_payments ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to see their own interest payments
CREATE POLICY "Users can view their own interest payments" ON interest_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lent_money 
      WHERE lent_money.id = interest_payments.loan_id 
        AND lent_money.user_id = auth.uid()
        AND interest_payments.loan_type = 'lent'
    )
    OR
    EXISTS (
      SELECT 1 FROM borrowed_money 
      WHERE borrowed_money.id = interest_payments.loan_id 
        AND borrowed_money.user_id = auth.uid()
        AND interest_payments.loan_type = 'borrowed'
    )
  );

-- Policy for authenticated users to insert their own interest payments
CREATE POLICY "Users can insert their own interest payments" ON interest_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lent_money 
      WHERE lent_money.id = loan_id 
        AND lent_money.user_id = auth.uid()
        AND loan_type = 'lent'
    )
    OR
    EXISTS (
      SELECT 1 FROM borrowed_money 
      WHERE borrowed_money.id = loan_id 
        AND borrowed_money.user_id = auth.uid()
        AND loan_type = 'borrowed'
    )
  );

-- Policy for authenticated users to update their own interest payments
CREATE POLICY "Users can update their own interest payments" ON interest_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM lent_money 
      WHERE lent_money.id = interest_payments.loan_id 
        AND lent_money.user_id = auth.uid()
        AND interest_payments.loan_type = 'lent'
    )
    OR
    EXISTS (
      SELECT 1 FROM borrowed_money 
      WHERE borrowed_money.id = interest_payments.loan_id 
        AND borrowed_money.user_id = auth.uid()
        AND interest_payments.loan_type = 'borrowed'
    )
  );

-- Policy for authenticated users to delete their own interest payments
CREATE POLICY "Users can delete their own interest payments" ON interest_payments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM lent_money 
      WHERE lent_money.id = interest_payments.loan_id 
        AND lent_money.user_id = auth.uid()
        AND interest_payments.loan_type = 'lent'
    )
    OR
    EXISTS (
      SELECT 1 FROM borrowed_money 
      WHERE borrowed_money.id = interest_payments.loan_id 
        AND borrowed_money.user_id = auth.uid()
        AND interest_payments.loan_type = 'borrowed'
    )
  );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_interest_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interest_payments_updated_at
  BEFORE UPDATE ON interest_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_interest_payments_updated_at();
