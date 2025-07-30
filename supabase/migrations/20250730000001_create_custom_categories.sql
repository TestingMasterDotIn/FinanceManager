-- Create custom_categories table for user-defined expense categories
CREATE TABLE custom_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code for category
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique category names per user
  UNIQUE(user_id, category_name)
);

-- Create indexes for better query performance
CREATE INDEX idx_custom_categories_user_id ON custom_categories(user_id);
CREATE INDEX idx_custom_categories_name ON custom_categories(category_name);

-- Enable RLS
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own custom categories" ON custom_categories
  FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_custom_categories_updated_at
  BEFORE UPDATE ON custom_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some default custom categories for better user experience
-- These will be created for each new user when they first access the feature
