import { createAdminClient } from '@/lib/supabase-admin';
import { createHash } from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory =
  | 'sensors'
  | 'photos'
  | 'users'
  | 'storage'
  | 'quality'
  | 'system'
  | 'ocr'
  | 'dexcom'
  | 'notifications'
  | 'security'
  | 'cron'
  | 'admin';

export interface LogMetadata {
  [key: string]: any;
}

export async function logEvent({
  level,
  category,
  message,
  userId,
  metadata
}: {
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  metadata?: LogMetadata;
}) {
  const supabase = createAdminClient();
  let user_hash: string | null = null;
  if (userId) {
    user_hash = createHash('sha256').update(userId).digest('hex').substring(0, 12);
  }
  await supabase.from('system_logs').insert([
    {
      level,
      category,
      message,
      user_hash,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString()
    }
  ]);
}
