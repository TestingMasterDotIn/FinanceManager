-- Migration for advanced finance features
-- Add credit scores table
CREATE TABLE IF NOT EXISTS credit_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    provider TEXT NOT NULL CHECK (provider IN ('CIBIL', 'Experian', 'Equifax', 'CRIF')),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    factors JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add investments table
CREATE TABLE IF NOT EXISTS investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_type TEXT NOT NULL CHECK (investment_type IN ('SIP', 'Mutual Fund', 'Stocks', 'FD', 'PPF', 'ELSS', 'Bonds')),
    investment_name TEXT NOT NULL,
    amount_invested DECIMAL(15,2) NOT NULL DEFAULT 0,
    current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    monthly_sip DECIMAL(15,2),
    maturity_date DATE,
    interest_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add financial goals table
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('house', 'car', 'education', 'retirement', 'vacation', 'emergency', 'other')),
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    target_date DATE NOT NULL,
    monthly_contribution DECIMAL(15,2) NOT NULL DEFAULT 0,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add financial insights table for AI recommendations
CREATE TABLE IF NOT EXISTS financial_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('debt_optimization', 'investment_suggestion', 'tax_planning', 'goal_tracking', 'credit_improvement')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_items JSONB DEFAULT '[]',
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add expense categories table for better expense tracking
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    budget_limit DECIMAL(15,2),
    color_code TEXT DEFAULT '#6B7280',
    icon TEXT DEFAULT 'currency-rupee',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category_name)
);

-- Add transaction tracking table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'investment', 'loan_payment')),
    category_id UUID REFERENCES expense_categories(id),
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_last_updated ON credit_scores(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(investment_type);

CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_priority ON financial_goals(priority);
CREATE INDEX IF NOT EXISTS idx_financial_goals_target_date ON financial_goals(target_date);

CREATE INDEX IF NOT EXISTS idx_financial_insights_user_id ON financial_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_insights_type ON financial_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_financial_insights_unread ON financial_insights(user_id, is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- Add RLS (Row Level Security) policies
ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Credit scores policies
CREATE POLICY "Users can view own credit scores" ON credit_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit scores" ON credit_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit scores" ON credit_scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit scores" ON credit_scores FOR DELETE USING (auth.uid() = user_id);

-- Investments policies
CREATE POLICY "Users can view own investments" ON investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own investments" ON investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own investments" ON investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own investments" ON investments FOR DELETE USING (auth.uid() = user_id);

-- Financial goals policies
CREATE POLICY "Users can view own financial goals" ON financial_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own financial goals" ON financial_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own financial goals" ON financial_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own financial goals" ON financial_goals FOR DELETE USING (auth.uid() = user_id);

-- Financial insights policies
CREATE POLICY "Users can view own financial insights" ON financial_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own financial insights" ON financial_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own financial insights" ON financial_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own financial insights" ON financial_insights FOR DELETE USING (auth.uid() = user_id);

-- Expense categories policies
CREATE POLICY "Users can view own expense categories" ON expense_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expense categories" ON expense_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expense categories" ON expense_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expense categories" ON expense_categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_credit_scores_updated_at BEFORE UPDATE ON credit_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_goals_updated_at BEFORE UPDATE ON financial_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_insights_updated_at BEFORE UPDATE ON financial_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
