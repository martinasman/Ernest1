-- Add extended brand fields for the new AI generation pipeline
-- Run this after the initial schema.sql

-- Add extended tone of voice object (full details)
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS tone_of_voice_full JSONB DEFAULT '{}';

-- Add logo direction for future logo generation
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS logo_direction JSONB DEFAULT '{}';

-- Update colors JSONB to support new expanded color system
-- The existing colors column can store the new structure as it's JSONB

COMMENT ON COLUMN brands.tone_of_voice_full IS 'Full tone of voice object with formality, personality, vocabulary, examples';
COMMENT ON COLUMN brands.logo_direction IS 'Logo design direction with style, description, suggested elements';
