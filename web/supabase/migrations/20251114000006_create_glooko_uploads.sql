-- Glooko Uploads Tracking
-- Tracks ZIP files uploaded from Glooko Chrome extension

CREATE TABLE IF NOT EXISTS glooko_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  size BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded', -- 'uploaded', 'processing', 'processed', 'failed'
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Processing stats
  bolus_count INTEGER DEFAULT 0,
  basal_count INTEGER DEFAULT 0,
  status_event_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_glooko_uploads_user_id ON glooko_uploads(user_id);
CREATE INDEX idx_glooko_uploads_status ON glooko_uploads(user_id, status);
CREATE INDEX idx_glooko_uploads_created_at ON glooko_uploads(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE glooko_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own uploads" ON glooko_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads" ON glooko_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" ON glooko_uploads
  FOR UPDATE USING (auth.uid() = user_id);

-- Create storage bucket for glooko files
INSERT INTO storage.buckets (id, name, public)
VALUES ('glooko', 'glooko', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own glooko files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'glooko' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own glooko files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'glooko' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own glooko files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'glooko' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Log the migration
INSERT INTO system_logs (level, category, message, metadata)
VALUES (
  'info',
  'glooko',
  'Glooko uploads tracking created',
  '{"table": "glooko_uploads", "bucket": "glooko"}'::jsonb
)
ON CONFLICT DO NOTHING;
