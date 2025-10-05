// Script to test database connection and apply Dexcom migration if needed
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndSetupDatabase() {
  try {
    console.log('Checking if dexcom_tokens table exists...');
    
    // Check if table exists
    const { data, error } = await supabase
      .from('dexcom_tokens')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
        console.log('❌ dexcom_tokens table does not exist');
        console.log('Please run the migration in Supabase dashboard:');
        console.log('Copy the SQL from: supabase/migrations/20250104000006_dexcom_api_integration.sql');
        console.log('And execute it in: https://supabase.com/dashboard/project/ygawcvrjnijrivcvdwrm/sql');
        return false;
      } else {
        console.error('Database error:', error);
        return false;
      }
    }
    
    console.log('✅ dexcom_tokens table exists');
    console.log('Database is ready for real Dexcom sync!');
    return true;
    
  } catch (err) {
    console.error('Failed to check database:', err);
    return false;
  }
}

checkAndSetupDatabase();