-- Add design reference columns to features table
ALTER TABLE features ADD COLUMN IF NOT EXISTS design_reference_link TEXT;
ALTER TABLE features ADD COLUMN IF NOT EXISTS design_reference_images TEXT[];

-- Create storage bucket for attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public access to view attachments
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- Allow authenticated users to upload attachments
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');
