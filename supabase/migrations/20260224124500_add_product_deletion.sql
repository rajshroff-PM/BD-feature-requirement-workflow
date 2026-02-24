-- Add pending_deletion_at column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS pending_deletion_at TIMESTAMP WITH TIME ZONE;
