/*
  # Add custom name field to loans table

  1. Add custom_name column to loans table
  2. This allows users to provide custom names for loans (e.g., "Main House", "Investment Property")
  3. Field is optional and nullable
*/

-- Add custom_name column to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS custom_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN loans.custom_name IS 'Optional custom name for the loan to help users differentiate between similar loan types';
