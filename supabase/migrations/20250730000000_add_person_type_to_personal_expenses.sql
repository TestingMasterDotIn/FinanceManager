-- Add person_type column to personal_expenses table
ALTER TABLE personal_expenses 
ADD COLUMN person_type VARCHAR DEFAULT 'family_member' NOT NULL 
CHECK (person_type IN ('family_member', 'event'));

-- Create index for better query performance on person_type
CREATE INDEX idx_personal_expenses_person_type ON personal_expenses(person_type);

-- Update existing records to have the default value
UPDATE personal_expenses 
SET person_type = 'family_member' 
WHERE person_type IS NULL;
