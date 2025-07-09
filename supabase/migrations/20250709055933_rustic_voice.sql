/*
  # Create loans management tables

  1. New Tables
    - `loans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `loan_type` (text)
      - `principal` (numeric)
      - `interest_rate` (numeric)
      - `tenure_months` (integer)
      - `start_date` (date)
      - `emi_amount` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `prepayments`
      - `id` (uuid, primary key)
      - `loan_id` (uuid, references loans)
      - `user_id` (uuid, references auth.users)
      - `amount` (numeric)
      - `prepayment_date` (date)
      - `prepayment_type` (text)
      - `frequency` (text, optional)
      - `created_at` (timestamptz)
    - `rate_changes`
      - `id` (uuid, primary key)
      - `loan_id` (uuid, references loans)
      - `user_id` (uuid, references auth.users)
      - `new_rate` (numeric)
      - `effective_date` (date)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_type text NOT NULL,
  principal numeric NOT NULL CHECK (principal > 0),
  interest_rate numeric NOT NULL CHECK (interest_rate > 0 AND interest_rate <= 100),
  tenure_months integer NOT NULL CHECK (tenure_months > 0),
  start_date date NOT NULL,
  emi_amount numeric NOT NULL CHECK (emi_amount > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prepayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  prepayment_date date NOT NULL,
  prepayment_type text NOT NULL CHECK (prepayment_type IN ('one_time', 'recurring')),
  frequency text CHECK (frequency IN ('monthly', 'yearly', 'custom')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  new_rate numeric NOT NULL CHECK (new_rate > 0 AND new_rate <= 100),
  effective_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_changes ENABLE ROW LEVEL SECURITY;

-- Policies for loans table
CREATE POLICY "Users can manage their own loans"
  ON loans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for prepayments table
CREATE POLICY "Users can manage their own prepayments"
  ON prepayments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for rate_changes table
CREATE POLICY "Users can manage their own rate changes"
  ON rate_changes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON loans(created_at);
CREATE INDEX IF NOT EXISTS idx_prepayments_loan_id ON prepayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_prepayments_user_id ON prepayments(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_changes_loan_id ON rate_changes(loan_id);
CREATE INDEX IF NOT EXISTS idx_rate_changes_user_id ON rate_changes(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();