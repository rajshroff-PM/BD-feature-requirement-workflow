-- Add Product Owner columns to the tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS po_status VARCHAR(50) DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS po_overview TEXT;

-- Update existing records to have a 'Pending' po_status if they don't already
UPDATE public.tickets SET po_status = 'Pending' WHERE po_status IS NULL;
