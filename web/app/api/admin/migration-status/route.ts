import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const migrationChecks = [
      {
        name: 'System Logs Table',
        check: async () => {
          const { error } = await supabase.from('system_logs').select('id').limit(1);
          return !error;
        },
        migration: '20251030000001_create_system_logs_table.sql'
      },
      {
        name: 'Web Vitals Table',
        check: async () => {
          const { error } = await supabase.from('web_vitals').select('id').limit(1);
          return !error;
        },
        migration: '20251030000003_web_vitals_monitoring.sql'
      },
      {
        name: 'Database Functions',
        check: async () => {
          const { error } = await supabase.rpc('get_performance_insights');
          return !error || error.code !== 'PGRST202';
        },
        migration: '20251030000011_fix_web_vitals_constraints.sql'
      },
      {
        name: 'Optimization Features',
        check: async () => {
          const { error } = await supabase.rpc('refresh_analytics_views');
          return !error || error.code !== 'PGRST202';
        },
        migration: '20251030000010_database_optimization.sql'
      }
    ];

    const results = [];
    
    for (const check of migrationChecks) {
      try {
        const isAvailable = await check.check();
        results.push({
          name: check.name,
          available: isAvailable,
          migration: check.migration,
          status: isAvailable ? 'applied' : 'pending'
        });
      } catch (error) {
        results.push({
          name: check.name,
          available: false,
          migration: check.migration,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const allApplied = results.every(r => r.available);
    const pendingMigrations = results.filter(r => !r.available);

    return NextResponse.json({
      allApplied,
      pendingCount: pendingMigrations.length,
      migrations: results,
      recommendations: allApplied 
        ? ['All migrations are applied! Your system is fully optimized.']
        : [
            'Some migrations are pending. Run the following commands:',
            '1. supabase db push (to apply all pending migrations)',
            '2. Restart your application to use the new features',
            ...pendingMigrations.map(m => `   - ${m.migration}`)
          ]
    });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json({ 
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}