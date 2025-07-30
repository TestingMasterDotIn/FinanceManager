-- Create managed_members_events table
CREATE TABLE IF NOT EXISTS managed_members_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('family_member', 'event')),
    photo_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name, type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_managed_members_events_user_id ON managed_members_events(user_id);
CREATE INDEX IF NOT EXISTS idx_managed_members_events_type ON managed_members_events(type);
CREATE INDEX IF NOT EXISTS idx_managed_members_events_name ON managed_members_events(name);

-- Enable RLS
ALTER TABLE managed_members_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own managed members/events" ON managed_members_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own managed members/events" ON managed_members_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own managed members/events" ON managed_members_events
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own managed members/events" ON managed_members_events
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_managed_members_events_updated_at 
    BEFORE UPDATE ON managed_members_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
