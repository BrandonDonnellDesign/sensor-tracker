import { createAdminClient } from '@/lib/supabase-admin';

export interface SystemLogEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  user_hash?: string;
}

export async function fetchRecentLogs(limit = 50): Promise<SystemLogEvent[]> {
  try {
    const supabase = createAdminClient();
    // Cast to any since system_logs table may not be in generated types yet
    const { data, error } = await (supabase as any)
      .from('system_logs')
      .select('id, created_at, level, category, message, user_hash')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('fetchRecentLogs error:', error.message);
      return [];
    }

    return (data || []).map((log: any) => ({
      id: log.id,
      timestamp: log.created_at,
      level: log.level,
      category: log.category,
      message: log.message,
      user_hash: log.user_hash,
    }));
  } catch (e) {
    console.warn('fetchRecentLogs unexpected error:', e);
    return [];
  }
}

export async function getLogStats() {
  try {
    const supabase = createAdminClient();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const [{ count: errors }, { count: warnings }, { count: info }] = await Promise.all([
      (supabase as any).from('system_logs').select('id', { count: 'exact', head: true })
        .eq('level', 'error').gte('created_at', yesterday),
      (supabase as any).from('system_logs').select('id', { count: 'exact', head: true })
        .eq('level', 'warn').gte('created_at', yesterday),
      (supabase as any).from('system_logs').select('id', { count: 'exact', head: true })
        .eq('level', 'info').gte('created_at', yesterday),
    ]);

    return { errors: errors || 0, warnings: warnings || 0, info: info || 0 };
  } catch (e) {
    return { errors: 0, warnings: 0, info: 0 };
  }
}