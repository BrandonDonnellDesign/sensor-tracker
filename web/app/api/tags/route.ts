import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { systemLogger } from '@/lib/system-logger';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      await systemLogger.warn('api', 'Tags API accessed without authentication');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      await systemLogger.error('database', `Failed to fetch tags: ${error.message}`, user.id);
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
    }

    await systemLogger.info('api', 'Tags fetched successfully', user.id, { tagCount: tags?.length || 0 });
    return NextResponse.json(tags || []);
  } catch (error) {
    console.error('Unexpected error fetching tags:', error);
    await systemLogger.error('api', `Tags API unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}