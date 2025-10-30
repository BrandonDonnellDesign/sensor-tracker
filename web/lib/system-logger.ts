import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// Create a client for logging (can use anon key since we're just inserting logs)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export type LogLevel = 'info' | 'warn' | 'error';
export type LogCategory = 
  | 'sensors' 
  | 'photos' 
  | 'users' 
  | 'storage' 
  | 'quality' 
  | 'system' 
  | 'monitoring' 
  | 'database' 
  | 'ocr' 
  | 'dexcom' 
  | 'notifications'
  | 'auth'
  | 'api'
  | 'sync';

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
}

class SystemLogger {
  private hashUserId(userId: string): string {
    return createHash('sha256').update(userId).digest('hex').substring(0, 16);
  }

  async log(entry: LogEntry): Promise<void> {
    try {
      const logData = {
        level: entry.level,
        category: entry.category,
        message: entry.message,
        user_hash: entry.userId ? this.hashUserId(entry.userId) : null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('system_logs')
        .insert([logData]);

      if (error) {
        console.error('Failed to write system log:', error);
        // Don't throw here to avoid breaking the main application flow
      }
    } catch (error) {
      console.error('System logger error:', error);
      // Don't throw here to avoid breaking the main application flow
    }
  }

  // Convenience methods for different log levels
  async info(category: LogCategory, message: string, userId?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({ level: 'info', category, message, ...(userId && { userId }), ...(metadata && { metadata }) });
  }

  async warn(category: LogCategory, message: string, userId?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({ level: 'warn', category, message, ...(userId && { userId }), ...(metadata && { metadata }) });
  }

  async error(category: LogCategory, message: string, userId?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({ level: 'error', category, message, ...(userId && { userId }), ...(metadata && { metadata }) });
  }

  // Specific logging methods for common scenarios
  async logUserAction(action: string, userId: string, details?: Record<string, any>): Promise<void> {
    await this.info('users', `User action: ${action}`, userId, details);
  }

  async logSensorEvent(event: string, userId: string, sensorId?: string, details?: Record<string, any>): Promise<void> {
    await this.info('sensors', `Sensor event: ${event}`, userId, { 
      sensorId, 
      ...details 
    });
  }

  async logDexcomSync(status: 'started' | 'success' | 'failed', userId: string, details?: Record<string, any>): Promise<void> {
    const level = status === 'failed' ? 'error' : 'info';
    await this.log({
      level,
      category: 'dexcom',
      message: `Dexcom sync ${status}`,
      userId,
      ...(details && { metadata: details })
    });
  }

  async logPhotoUpload(status: 'started' | 'success' | 'failed', userId: string, filename?: string, details?: Record<string, any>): Promise<void> {
    const level = status === 'failed' ? 'error' : 'info';
    await this.log({
      level,
      category: 'photos',
      message: `Photo upload ${status}${filename ? `: ${filename}` : ''}`,
      userId,
      ...(details && { metadata: details })
    });
  }

  async logOCRProcessing(status: 'started' | 'success' | 'failed', userId: string, details?: Record<string, any>): Promise<void> {
    const level = status === 'failed' ? 'error' : 'info';
    await this.log({
      level,
      category: 'ocr',
      message: `OCR processing ${status}`,
      userId,
      ...(details && { metadata: details })
    });
  }

  async logNotification(status: 'sent' | 'delivered' | 'failed', userId: string, type: string, details?: Record<string, any>): Promise<void> {
    const level = status === 'failed' ? 'error' : 'info';
    await this.log({
      level,
      category: 'notifications',
      message: `Notification ${status}: ${type}`,
      userId,
      ...(details && { metadata: details })
    });
  }

  async logSystemEvent(event: string, level: LogLevel = 'info', details?: Record<string, any>): Promise<void> {
    await this.log({
      level,
      category: 'system',
      message: event,
      ...(details && { metadata: details })
    });
  }

  async logDatabaseEvent(event: string, level: LogLevel = 'info', userId?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      level,
      category: 'database',
      message: event,
      ...(userId && { userId }),
      ...(details && { metadata: details })
    });
  }

  async logQualityCheck(result: 'passed' | 'failed', userId: string, checkType: string, details?: Record<string, any>): Promise<void> {
    const level = result === 'failed' ? 'warn' : 'info';
    await this.log({
      level,
      category: 'quality',
      message: `Quality check ${result}: ${checkType}`,
      userId,
      ...(details && { metadata: details })
    });
  }

  async logStorageEvent(event: string, level: LogLevel = 'info', userId?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      level,
      category: 'storage',
      message: event,
      ...(userId && { userId }),
      ...(details && { metadata: details })
    });
  }

  async logAuthEvent(event: string, userId?: string, level: LogLevel = 'info', details?: Record<string, any>): Promise<void> {
    await this.log({
      level,
      category: 'auth',
      message: event,
      ...(userId && { userId }),
      ...(details && { metadata: details })
    });
  }

  async logAPIEvent(event: string, level: LogLevel = 'info', userId?: string, details?: Record<string, any>): Promise<void> {
    await this.log({
      level,
      category: 'api',
      message: event,
      ...(userId && { userId }),
      ...(details && { metadata: details })
    });
  }
}

// Export a singleton instance
export const systemLogger = new SystemLogger();

// Export the class for testing or custom instances
export { SystemLogger };