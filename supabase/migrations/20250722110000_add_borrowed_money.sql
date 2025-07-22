-- Create borrowed_money table
CREATE TABLE borrowed_money (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lender_name TEXT NOT NULL,
    lender_contact TEXT,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    interest_rate DECIMAL(5,2) DEFAULT 0 CHECK (interest_rate >= 0),
    borrowed_date DATE NOT NULL,
    expected_return_date DATE,
    paid_date DATE,
    is_paid BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint to ensure expected_return_date is after borrowed_date
ALTER TABLE borrowed_money 
ADD CONSTRAINT check_borrowed_return_date 
CHECK (expected_return_date >= borrowed_date);

-- Create indexes for better query performance
CREATE INDEX idx_borrowed_money_user_id ON borrowed_money(user_id);
CREATE INDEX idx_borrowed_money_borrowed_date ON borrowed_money(borrowed_date);
CREATE INDEX idx_borrowed_money_is_paid ON borrowed_money(is_paid);
CREATE INDEX idx_borrowed_money_expected_return_date ON borrowed_money(expected_return_date);

-- Set up Row Level Security (RLS)
ALTER TABLE borrowed_money ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own borrowed money records
CREATE POLICY "Users can view their own borrowed money records" ON borrowed_money
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own borrowed money records" ON borrowed_money
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own borrowed money records" ON borrowed_money
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own borrowed money records" ON borrowed_money
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_borrowed_money_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER trigger_update_borrowed_money_updated_at
    BEFORE UPDATE ON borrowed_money
    FOR EACH ROW
    EXECUTE FUNCTION update_borrowed_money_updated_at();
