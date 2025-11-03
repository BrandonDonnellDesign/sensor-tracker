import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Check if api_keys table exists
    const { error: tableError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1);
    
    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'table_missing',
        message: 'API keys table does not exist',
        details: tableError.message,
        solution: 'Run the database migration: web/scripts/apply-api-auth-migration.sql'
      });
    }
    
    // Check if we can create a test record (and immediately delete it)
    const testKey = {
      user_id: '00000000-0000-0000-0000-000000000000',
      name: 'test_key_delete_me',
      key_hash: 'test_hash',
      key_prefix: 'sk_test',
      tier: 'free',
      rate_limit_per_hour: 100
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('api_keys')
      .insert(testKey)
      .select()
      .single();
    
    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'insert_failed',
        message: 'Cannot insert into api_keys table',
        details: insertError.message
      });
    }
    
    // Clean up test record
    await supabase
      .from('api_keys')
      .delete()
      .eq('id', insertData.id);
    
    return NextResponse.json({
      success: true,
      message: 'Database is ready for API key management',
      tables: {
        api_keys: 'exists and writable',
        test_insert_id: insertData.id
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'general_error',
      message: 'Database check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}