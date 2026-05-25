-- Phase 3: Add subtitle and image_suggestion columns to nodes
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS image_suggestion TEXT;
