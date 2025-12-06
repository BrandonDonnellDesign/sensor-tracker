/**
 * Centralized error logging and tracking for Gmail sync operations
 */

import { createClient } from '@/lib/supabase-server';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorCategory = 
  | 'email_parsing' 
  | 'order_matching' 
  | 'inventory_update' 
  | 'gmail_api'
  | 'database'
  | 'unknown';

export interface SyncError {
  id?: string;
  user_id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, any>;
  email_id?: string;
  order_id?: string;
  stack_trace?: string;
  created_at?: string;
}

export class GmailSyncErrorLogger {
  private static instance: GmailSyncErrorLogger;
  private errors: SyncError[] = [];

  static getInstance(): GmailSyncErrorLogger {
    if (!GmailSyncErrorLogger.instance) {
      GmailSyncErrorLogger.instance = new GmailSyncErrorLogger();
    }
    return GmailSyncErrorLogger.instance;
  }

  /**
   * Log an error to database and memory
   */
  async logError(error: Omit<SyncError, 'id' | 'created_at'>): Promise<void> {
    try {
      const supabase = createClient();
      
      const { data, error: dbError } = await supabase
        .from('gmail_sync_errors')
        .insert({
          user_id: error.user_id,
          category: error.category,
          severity: error.severity,
          message: error.message,
          details: error.details || {},
          email_id: error.email_id,
          order_id: error.order_id,
          stack_trace: error.stack_trace,
        })
        .select()
        .single();

      if (dbError) {
        console.warn('Could not log error to database (table may not exist yet):', dbError.message);
        // Still add to memory
        this.errors.push({ ...error, created_at: new Date().toISOString() });
      } else if (data) {
        this.errors.push(data);
      }

      // Log to console based on severity
      this.consoleLog(error);
    } catch (err) {
      console.error('Critical error in error logger:', err);
      // Still log to console
      this.consoleLog(error);
    }
  }

  /**
   * Log parsing failure
   */
  async logParsingError(
    userId: string,
    emailId: string,
    vendor: string,
    error: Error,
    emailContent?: string
  ): Promise<void> {
    try {
      await this.logError({
        user_id: userId,
        category: 'email_parsing',
        severity: 'warning',
        message: `Failed to parse ${vendor} email`,
        details: {
          vendor,
          error_message: error.message,
          email_preview: emailContent?.substring(0, 200),
        },
        email_id: emailId,
        stack_trace: error.stack,
      });
    } catch (err) {
      // Don't throw, just log to console
      console.warn('Could not log parsing error to database:', err);
    }
  }

  /**
   * Log order matching failure
   */
  async logMatchingError(
    userId: string,
    emailId: string,
    parsedData: any,
    reason: string
  ): Promise<void> {
    try {
      await this.logError({
        user_id: userId,
        category: 'order_matching',
        severity: 'info',
        message: `Could not match email to order: ${reason}`,
        details: {
          parsed_data: parsedData,
          reason,
        },
        email_id: emailId,
      });
    } catch (err) {
      // Don't throw, just log to console
      console.warn('Could not log matching error to database:', err);
    }
  }

  /**
   * Log inventory update failure
   */
  async logInventoryError(
    userId: string,
    orderId: string,
    error: Error,
    operation: 'increase' | 'decrease'
  ): Promise<void> {
    try {
      await this.logError({
        user_id: userId,
        category: 'inventory_update',
        severity: 'error',
        message: `Failed to ${operation} inventory`,
        details: {
          operation,
          error_message: error.message,
        },
        order_id: orderId,
        stack_trace: error.stack,
      });
    } catch (err) {
      // Don't throw, just log to console
      console.warn('Could not log inventory error to database:', err);
    }
  }

  /**
   * Log Gmail API error
   */
  async logGmailApiError(
    userId: string,
    error: Error,
    operation: string
  ): Promise<void> {
    try {
      await this.logError({
        user_id: userId,
        category: 'gmail_api',
        severity: 'error',
        message: `Gmail API error during ${operation}`,
        details: {
          operation,
          error_message: error.message,
        },
        stack_trace: error.stack,
      });
    } catch (err) {
      // Don't throw, just log to console
      console.warn('Could not log Gmail API error to database:', err);
    }
  }

  /**
   * Get recent errors for a user
   */
  async getRecentErrors(
    userId: string,
    limit: number = 50
  ): Promise<SyncError[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('gmail_sync_errors')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Could not fetch errors (table may not exist yet):', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Failed to fetch errors:', err);
      return [];
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(
    userId: string,
    days: number = 7
  ): Promise<{
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
  }> {
    try {
      const supabase = createClient();
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('gmail_sync_errors')
        .select('category, severity')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString());

      if (error) {
        console.warn('Could not fetch error stats (table may not exist yet):', error.message);
        return {
          total: 0,
          byCategory: {} as Record<ErrorCategory, number>,
          bySeverity: {} as Record<ErrorSeverity, number>,
        };
      }

      const stats = {
        total: data?.length || 0,
        byCategory: {} as Record<ErrorCategory, number>,
        bySeverity: {} as Record<ErrorSeverity, number>,
      };

      data?.forEach((row) => {
        stats.byCategory[row.category] = (stats.byCategory[row.category] || 0) + 1;
        stats.bySeverity[row.severity] = (stats.bySeverity[row.severity] || 0) + 1;
      });

      return stats;
    } catch (err) {
      console.error('Failed to fetch error stats:', err);
      return {
        total: 0,
        byCategory: {} as Record<ErrorCategory, number>,
        bySeverity: {} as Record<ErrorSeverity, number>,
      };
    }
  }

  /**
   * Clear old errors (cleanup)
   */
  async clearOldErrors(userId: string, daysToKeep: number = 30): Promise<number> {
    try {
      const supabase = createClient();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { error, count } = await supabase
        .from('gmail_sync_errors')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('Failed to clear old errors:', err);
      return 0;
    }
  }

  /**
   * Console logging based on severity
   */
  private consoleLog(error: Omit<SyncError, 'id' | 'created_at'>): void {
    const prefix = `[Gmail Sync ${error.category}]`;
    const message = `${prefix} ${error.message}`;

    switch (error.severity) {
      case 'critical':
      case 'error':
        console.error(message, error.details);
        break;
      case 'warning':
        console.warn(message, error.details);
        break;
      case 'info':
        console.info(message, error.details);
        break;
    }
  }

  /**
   * Get in-memory errors (for current session)
   */
  getSessionErrors(): SyncError[] {
    return [...this.errors];
  }

  /**
   * Clear session errors
   */
  clearSessionErrors(): void {
    this.errors = [];
  }
}

// Export singleton
export const gmailErrorLogger = GmailSyncErrorLogger.getInstance();
