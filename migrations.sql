-- Run this SQL in your Supabase SQL Editor to update your database schema

-- Add workload column to events if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS workload integer DEFAULT 0;

-- Add certificates_released column to events if it doesn't exist
ALTER TABLE events ADD COLUMN IF NOT EXISTS certificates_released boolean DEFAULT false;

-- Add certificate_code column to registrations if it doesn't exist
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS certificate_code text;
