-- Create the uploads storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload files (customers upload before auth)
CREATE POLICY "Anyone can upload files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to read/download files
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');

-- Enable realtime on print_jobs for admin panel
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;