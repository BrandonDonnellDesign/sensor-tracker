/**
 * Email Service for sending notifications
 * Supports multiple email providers (Resend, SendGrid, etc.)
 */

import { EmailTemplate } from './email-templates';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[];
  from?: EmailRecipient;
  replyTo?: string;
  template: EmailTemplate;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private provider: 'resend' | 'sendgrid' | 'mock';
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    // Determine email provider based on environment variables
    if (process.env.RESEND_API_KEY) {
      this.provider = 'resend';
      this.apiKey = process.env.RESEND_API_KEY;
    } else if (process.env.SENDGRID_API_KEY) {
      this.provider = 'sendgrid';
      this.apiKey = process.env.SENDGRID_API_KEY;
    } else {
      this.provider = 'mock';
      this.apiKey = '';
    }

    this.fromEmail = process.env.FROM_EMAIL || 'noreply@cgmtracker.com';
    this.fromName = process.env.FROM_NAME || 'CGM Tracker Community';
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      // Validate recipients
      for (const recipient of recipients) {
        if (!this.isValidEmail(recipient.email)) {
          return {
            success: false,
            error: `Invalid email address: ${recipient.email}`
          };
        }
      }

      // Send based on provider
      switch (this.provider) {
        case 'resend':
          return await this.sendWithResend(options);
        case 'sendgrid':
          return await this.sendWithSendGrid(options);
        case 'mock':
          return await this.sendWithMock(options);
        default:
          return {
            success: false,
            error: 'No email provider configured'
          };
      }
    } catch (error) {
      console.error('Email service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send email using Resend
   */
  private async sendWithResend(options: EmailOptions): Promise<EmailResult> {
    try {
      // Dynamic import with fallback
      let Resend;
      try {
        const resendModule = await eval('import("resend")');
        Resend = resendModule.Resend;
      } catch (importError) {
        return {
          success: false,
          error: 'Resend package not installed. Run: npm install resend'
        };
      }
      
      const resend = new Resend(this.apiKey);

      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      const result = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
        subject: options.template.subject,
        html: options.template.html,
        text: options.template.text,
        replyTo: options.replyTo,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      return {
        success: true,
        messageId: result.data?.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resend error'
      };
    }
  }

  /**
   * Send email using SendGrid
   */
  private async sendWithSendGrid(options: EmailOptions): Promise<EmailResult> {
    try {
      // Dynamic import with fallback
      let sgMail;
      try {
        sgMail = await eval('import("@sendgrid/mail")');
      } catch (importError) {
        return {
          success: false,
          error: 'SendGrid package not installed. Run: npm install @sendgrid/mail'
        };
      }
      
      sgMail.default.setApiKey(this.apiKey);

      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      const msg = {
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        personalizations: recipients.map(recipient => ({
          to: [{
            email: recipient.email,
            name: recipient.name
          }],
          subject: options.template.subject
        })),
        content: [
          {
            type: 'text/plain',
            value: options.template.text
          },
          {
            type: 'text/html',
            value: options.template.html
          }
        ],
        replyTo: options.replyTo ? { email: options.replyTo } : undefined
      };

      const result = await sgMail.default.send(msg);
      
      return {
        success: true,
        messageId: result[0].headers['x-message-id']
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SendGrid error'
      };
    }
  }

  /**
   * Mock email sending for development
   */
  private async sendWithMock(options: EmailOptions): Promise<EmailResult> {
    console.log('📧 Mock Email Sent:');
    console.log('To:', options.to);
    console.log('Subject:', options.template.subject);
    console.log('HTML Length:', options.template.html.length);
    console.log('Text Length:', options.template.text.length);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Validate email address
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get provider info for debugging
   */
  getProviderInfo() {
    return {
      provider: this.provider,
      fromEmail: this.fromEmail,
      fromName: this.fromName,
      hasApiKey: !!this.apiKey
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();