/**
 * API endpoint for testing email notifications (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/lib/email/email-service';
import { emailTemplates } from '@/lib/email/email-templates';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { testType, recipientEmail } = body;

    if (!testType || !recipientEmail) {
      return NextResponse.json({ 
        error: 'Missing required fields: testType, recipientEmail' 
      }, { status: 400 });
    }

    let template;
    const recipientName = recipientEmail.split('@')[0];

    switch (testType) {
      case 'welcome':
        template = emailTemplates.welcomeEmail(
          recipientName,
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/notifications`
        );
        break;

      case 'comment_reply':
        template = emailTemplates.commentReply({
          recipientName,
          commenterName: 'Test User',
          tipTitle: 'Test Tip: Managing CGM Sensors',
          commentContent: 'This is a test comment to demonstrate the reply notification system.',
          replyContent: 'This is a test reply to show how the notification looks.',
          tipUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community/tips/test`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/notifications`
        });
        break;

      case 'admin_alert':
        template = emailTemplates.adminAlert({
          adminName: profile.full_name || recipientName,
          alertType: 'flagged_content',
          contentType: 'tip',
          contentTitle: 'Test Flagged Content',
          contentPreview: 'This is a test content that has been flagged by the AI moderation system for review.',
          authorName: 'Test Author',
          flagReason: 'Potential spam content detected',
          moderationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/community`
        });
        break;

      case 'weekly_digest':
        template = emailTemplates.weeklyDigest({
          recipientName,
          weeklyStats: {
            newTips: 12,
            newComments: 45,
            topTips: [
              {
                title: 'Best practices for CGM sensor placement',
                author: 'Sarah M.',
                votes: 23,
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community/tips/1`
              },
              {
                title: 'Troubleshooting connectivity issues',
                author: 'Mike R.',
                votes: 18,
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community/tips/2`
              },
              {
                title: 'Managing alerts during sleep',
                author: 'Lisa K.',
                votes: 15,
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/community/tips/3`
              }
            ]
          },
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/notifications`
        });
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid test type. Use: welcome, comment_reply, admin_alert, or weekly_digest' 
        }, { status: 400 });
    }

    // Send test email
    const result = await emailService.sendEmail({
      to: { email: recipientEmail, name: recipientName },
      template
    });

    // Get email service info for debugging
    const providerInfo = emailService.getProviderInfo();

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      testType,
      recipientEmail,
      providerInfo
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}