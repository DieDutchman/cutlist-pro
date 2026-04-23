-- Add screenshot_base64 column to feedback table
-- Run this once in the Supabase SQL editor before deploying the screenshot feature.
-- Column stores a base64-encoded data URI (max 2 MB enforced client-side).
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS screenshot_base64 text;
