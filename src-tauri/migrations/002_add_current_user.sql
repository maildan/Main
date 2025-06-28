-- Add is_current column to users table for account switching
ALTER TABLE users ADD COLUMN is_current BOOLEAN NOT NULL DEFAULT FALSE;

-- Set the first user as current if no current user exists
UPDATE users SET is_current = TRUE WHERE id = (
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
) AND NOT EXISTS (SELECT 1 FROM users WHERE is_current = TRUE);
