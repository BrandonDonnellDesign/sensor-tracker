import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { headers } from 'next/headers';

interface DeliveryWebhookPayload {
  notificationId: string;
  status: 'delivered' | 'failed' | 'clicked' | 'dismissed';
  timestamp: string;
  provider: string;
  providerResponse?: any;
  errorMessage?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    token: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (implement based on your push service)
    const headersList = await headers();
    const signature = headersList.get('x-webhook-signature');
    const requestText = await request.text();
    if (!verifyWebhookSignature(signature, requestText)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: DeliveryWebhookPayload = JSON.parse(requestText);
    const adminClient = createAdminClient();

    // Update notification delivery status
    const { error: updateError } = await adminClient
      .from('notifications')
      .update({
        delivery_status: payload.status === 'clicked' || payload.status === 'dismissed' ? 'delivered' : payload.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.notificationId);

    if (updateError) {
      console.error('Failed to update notification status:', updateError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // Map status to valid database values
    const mapStatusToDbValue = (status: string): 'pending' | 'sent' | 'delivered' | 'failed' => {
      switch (status) {
        case 'clicked':
        case 'dismissed':
        case 'delivered':
          return 'delivered';
        case 'failed':
          return 'failed';
        default:
          return 'sent';
      }
    };

    // Log the delivery event
    const { error: logError } = await adminClient
      .from('notification_delivery_log')
      .insert({
        notification_id: payload.notificationId,
        status: mapStatusToDbValue(payload.status),
        provider: payload.provider,
        provider_response: payload.providerResponse || null,
        error_message: payload.errorMessage || null
      });

    if (logError) {
      console.error('Failed to log delivery event:', logError);
    }

    // Handle specific events
    switch (payload.status) {
      case 'delivered':
        console.log(`Notification ${payload.notificationId} delivered successfully`);
        break;
      case 'failed':
        console.log(`Notification ${payload.notificationId} failed: ${payload.errorMessage}`);
        // Could trigger retry logic here
        break;
      case 'clicked':
        console.log(`Notification ${payload.notificationId} was clicked`);
        // Could track engagement metrics
        break;
      case 'dismissed':
        console.log(`Notification ${payload.notificationId} was dismissed`);
        break;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function verifyWebhookSignature(signature: string | null, body: string): boolean {
  // Implement signature verification based on your push notification service
  // For example, for Firebase Cloud Messaging or other services
  
  if (!signature) {
    return false;
  }

  // This is a placeholder - implement actual signature verification
  // Example for HMAC-SHA256:
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.WEBHOOK_SECRET!)
  //   .update(body)
  //   .digest('hex');
  // return signature === `sha256=${expectedSignature}`;

  return true; // For development - implement proper verification in production
}