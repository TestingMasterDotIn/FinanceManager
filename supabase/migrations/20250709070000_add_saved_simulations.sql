-- Create saved_simulations table
CREATE TABLE saved_simulations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  simulation_name TEXT NOT NULL,
  description TEXT,
  original_schedule JSONB NOT NULL,
  new_schedule JSONB NOT NULL,
  interest_saved DECIMAL(15,2) NOT NULL,
  months_saved INTEGER NOT NULL,
  new_debt_free_date DATE NOT NULL,
  new_emi DECIMAL(15,2),
  prepayments JSONB,
  rate_changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE saved_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved simulations" ON saved_simulations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved simulations" ON saved_simulations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved simulations" ON saved_simulations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved simulations" ON saved_simulations
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_saved_simulations_user_id ON saved_simulations(user_id);
CREATE INDEX idx_saved_simulations_loan_id ON saved_simulations(loan_id);
CREATE INDEX idx_saved_simulations_created_at ON saved_simulations(created_at);
