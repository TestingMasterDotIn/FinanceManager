/*
  # Add user earnings table

  1. New Tables
    - `user_earnings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `monthly_earnings` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on the table
    - Add policies for authenticated users to manage their own earnings data
*/

CREATE TABLE IF NOT EXISTS user_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_earnings numeric NOT NULL CHECK (monthly_earnings >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_earnings ENABLE ROW LEVEL SECURITY;

-- Policies for user_earnings table
CREATE POLICY "Users can manage their own earnings"
  ON user_earnings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_earnings_user_id ON user_earnings(user_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_earnings
CREATE TRIGGER update_user_earnings_updated_at
    BEFORE UPDATE ON user_earnings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
