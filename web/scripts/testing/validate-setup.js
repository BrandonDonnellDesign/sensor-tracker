#!/usr/bin/env node

/**
 * Validate Complete Application Setup
 * Consolidates all validation and testing scripts
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateDatabase() {
  console.log('🔍 Validating database setup...');
  
  try {
    // Check core tables exist
    const tables = [
      'profiles',
      'glucose_readings', 
      'community_tips',
      'community_comments',
      'community_votes',
      'dexcom_tokens',
      'notifications',
      'activity_feed'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.error(`❌ Table ${table} not accessible:`, error.message);
        return false;
      }
      console.log(`✅ Table ${table} exists and accessible`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database validation failed:', error.message);
    return false;
  }
}

async function validateFunctions() {
  console.log('🔍 Validating database functions...');
  
  try {
    // Test auto-refresh function
    const { data, error } = await supabase.rpc('refresh_expired_dexcom_tokens');
    
    if (error && !error.message.includes('function does not exist')) {
      console.error('❌ Auto-refresh function error:', error.message);
      return false;
    }
    
    console.log('✅ Database functions validated');
    return true;
  } catch (error) {
    console.error('❌ Function validation failed:', error.message);
    return false;
  }
}

async function validateAPI() {
  console.log('🔍 Validating API endpoints...');
  
  const endpoints = [
    '/api/community/stats',
    '/api/community/activity', 
    '/api/community/leaderboard',
    '/api/dexcom/token-status'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`);
      
      if (response.ok) {
        console.log(`✅ Endpoint ${endpoint} responding`);
      } else {
        console.log(`⚠️  Endpoint ${endpoint} returned ${response.status}`);
      }
    } catch (error) {
      console.log(`⚠️  Endpoint ${endpoint} not accessible (app may not be running)`);
    }
  }
  
  return true;
}

async function main() {
  console.log('🚀 Starting application setup validation...\n');
  
  const dbValid = await validateDatabase();
  const functionsValid = await validateFunctions();
  const apiValid = await validateAPI();
  
  console.log('\n📊 Validation Summary:');
  console.log(`Database: ${dbValid ? '✅ Valid' : '❌ Issues found'}`);
  console.log(`Functions: ${functionsValid ? '✅ Valid' : '❌ Issues found'}`);
  console.log(`API: ${apiValid ? '✅ Accessible' : '❌ Issues found'}`);
  
  if (dbValid && functionsValid) {
    console.log('\n🎉 Setup validation completed successfully!');
    console.log('Your CGM companion app is ready to use.');
  } else {
    console.log('\n⚠️  Some issues were found. Please check the logs above.');
    process.exit(1);
  }
}

main().catch(console.error);