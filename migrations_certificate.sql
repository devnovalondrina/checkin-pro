-- Add certificate_template_url column to events if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS certificate_template_url text;
