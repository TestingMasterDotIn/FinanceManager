-- Create personal_expenses table
CREATE TABLE personal_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name VARCHAR NOT NULL,
  person_photo_url TEXT,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR NOT NULL, -- 'grocery', 'medicine', 'monthly_maintenance', 'others'
  custom_category VARCHAR, -- For 'others' category
  description TEXT,
  payment_screenshot_url TEXT, -- Screenshot of payment/transaction
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX idx_personal_expenses_user_id ON personal_expenses(user_id);
CREATE INDEX idx_personal_expenses_date ON personal_expenses(expense_date);
CREATE INDEX idx_personal_expenses_person ON personal_expenses(person_name);

-- Enable RLS
ALTER TABLE personal_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own personal expenses" ON personal_expenses
  FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_personal_expenses_updated_at
  BEFORE UPDATE ON personal_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
