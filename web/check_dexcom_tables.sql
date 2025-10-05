-- Simple check to see if the dexcom_tokens table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'dexcom_tokens'
);