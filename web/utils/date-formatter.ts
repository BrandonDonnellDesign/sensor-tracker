import { Profile } from '@/types/profile';

/**
 * Centralized date and time formatting utility that respects user preferences
 */
export class DateTimeFormatter {
  private static instance: DateTimeFormatter;
  private currentProfile: Profile | null = null;

  private constructor() {}

  static getInstance(): DateTimeFormatter {
    if (!DateTimeFormatter.instance) {
      DateTimeFormatter.instance = new DateTimeFormatter();
    }
    return DateTimeFormatter.instance;
  }

  /**
   * Set the current user profile for formatting preferences
   */
  setProfile(profile: Profile | null) {
    this.currentProfile = profile;
  }

  /**
   * Get the current profile or use defaults
   */
  private getPreferences() {
    return {
      dateFormat: this.currentProfile?.date_format || 'MM/DD/YYYY',
      timeFormat: this.currentProfile?.time_format || '12',
      timezone: this.currentProfile?.timezone || 'America/New_York',
    };
  }

  /**
   * Format a date according to user preferences
   */
  formatDate(date: Date | string | null): string {
    if (!date) return '--';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const { dateFormat, timezone } = this.getPreferences();

    try {
      // Convert date format to Intl options
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
      };

      switch (dateFormat) {
        case 'MM/DD/YYYY':
          options.month = '2-digit';
          options.day = '2-digit';
          options.year = 'numeric';
          return new Intl.DateTimeFormat('en-US', options).format(dateObj);
        
        case 'DD/MM/YYYY':
          options.day = '2-digit';
          options.month = '2-digit';
          options.year = 'numeric';
          return new Intl.DateTimeFormat('en-GB', options).format(dateObj);
        
        case 'YYYY-MM-DD':
          options.year = 'numeric';
          options.month = '2-digit';
          options.day = '2-digit';
          return new Intl.DateTimeFormat('sv-SE', options).format(dateObj);
        
        case 'MMM DD, YYYY':
          options.month = 'short';
          options.day = 'numeric';
          options.year = 'numeric';
          return new Intl.DateTimeFormat('en-US', options).format(dateObj);
        
        default:
          return new Intl.DateTimeFormat('en-US', options).format(dateObj);
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateObj.toLocaleDateString();
    }
  }

  /**
   * Format a time according to user preferences
   */
  formatTime(date: Date | string | null): string {
    if (!date) return '--';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Time';

    const { timeFormat, timezone } = this.getPreferences();

    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: timeFormat === '12',
      };

      const formatted = new Intl.DateTimeFormat('en-US', options).format(dateObj);
      return formatted;
    } catch (error) {
      console.error('Error formatting time:', error);
      return dateObj.toLocaleTimeString();
    }
  }

  /**
   * Format both date and time according to user preferences
   */
  formatDateTime(date: Date | string | null): string {
    if (!date) return '--';
    
    const formattedDate = this.formatDate(date);
    const formattedTime = this.formatTime(date);
    
    if (formattedDate === 'Invalid Date' || formattedTime === 'Invalid Time') {
      return 'Invalid Date/Time';
    }

    return `${formattedDate} ${formattedTime}`;
  }

  /**
   * Format a date for display in lists (shorter format)
   */
  formatDateShort(date: Date | string | null): string {
    if (!date) return '--';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const { dateFormat, timezone } = this.getPreferences();

    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
      };

      switch (dateFormat) {
        case 'MM/DD/YYYY':
          options.month = 'numeric';
          options.day = 'numeric';
          options.year = '2-digit';
          return new Intl.DateTimeFormat('en-US', options).format(dateObj);
        
        case 'DD/MM/YYYY':
          options.day = 'numeric';
          options.month = 'numeric';
          options.year = '2-digit';
          return new Intl.DateTimeFormat('en-GB', options).format(dateObj);
        
        case 'YYYY-MM-DD':
          options.year = '2-digit';
          options.month = 'numeric';
          options.day = 'numeric';
          return new Intl.DateTimeFormat('sv-SE', options).format(dateObj);
        
        case 'MMM DD, YYYY':
          options.month = 'short';
          options.day = 'numeric';
          return new Intl.DateTimeFormat('en-US', options).format(dateObj);
        
        default:
          return new Intl.DateTimeFormat('en-US', options).format(dateObj);
      }
    } catch (error) {
      console.error('Error formatting date short:', error);
      return dateObj.toLocaleDateString();
    }
  }

  /**
   * Format a date for HTML datetime-local input
   */
  formatForInput(date: Date | string | null): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';

    const { timezone } = this.getPreferences();

    try {
      // Create a date in the user's timezone
      const localDate = new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
      return localDate.toISOString().slice(0, 16);
    } catch (error) {
      console.error('Error formatting for input:', error);
      return dateObj.toISOString().slice(0, 16);
    }
  }

  /**
   * Get relative time format (e.g., "2 hours ago", "in 3 days")
   */
  formatRelativeTime(date: Date | string | null): string {
    if (!date) return '--';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        if (diffMinutes < 0) return `${Math.abs(diffMinutes)} minutes ago`;
        if (diffMinutes === 0) return 'now';
        return `in ${diffMinutes} minutes`;
      }
      if (diffHours < 0) return `${Math.abs(diffHours)} hours ago`;
      return `in ${diffHours} hours`;
    }

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    }
    
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
}

// Export a singleton instance for easy use
export const dateTimeFormatter = DateTimeFormatter.getInstance();

// Export hook for React components to use user preferences
export function useDateTimeFormatter() {
  return dateTimeFormatter;
}
