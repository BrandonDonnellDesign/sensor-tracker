-- Email Connections Table
-- Stores Gmail OAuth tokens and connection info for each user
CREATE TABLE IF NOT EXISTS email_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gmail',
  email_address TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email_address)
);

-- Parsed Emails Table
-- Stores metadata about parsed order emails
CREATE TABLE IF NOT EXISTS parsed_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_connection_id UUID REFERENCES email_connections(id) ON DELETE SET NULL,
  gmail_message_id TEXT UNIQUE NOT NULL,
  subject TEXT,
  from_address TEXT,
  received_date TIMESTAMP WITH TIME ZONE,
  parsed_data JSONB,
  order_id UUID REFERENCES sensor_orders(id) ON DELETE SET NULL,
  parsing_status TEXT DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'success', 'failed', 'review_needed')),
  confidence_score DECIMAL(3,2),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_connections_user_id ON email_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_user_id ON parsed_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_gmail_message_id ON parsed_emails(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_parsing_status ON parsed_emails(parsing_status);
CREATE INDEX IF NOT EXISTS idx_parsed_emails_order_id ON parsed_emails(order_id);

-- Row Level Security
ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_emails ENABLE ROW LEVEL SECURITY;

-- Policies for email_connections
CREATE POLICY "Users can view their own email connections"
  ON email_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email connections"
  ON email_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email connections"
  ON email_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email connections"
  ON email_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for parsed_emails
CREATE POLICY "Users can view their own parsed emails"
  ON parsed_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own parsed emails"
  ON parsed_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parsed emails"
  ON parsed_emails FOR UPDATE
  USING (auth.uid() = user_id);
