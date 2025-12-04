import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { syncGmailForUser } from '@/lib/gmail/sync-service';

/**
 * Scheduled job to sync emails for all connected users
 * GET /api/cron/gmail-sync
 * Protected by CRON_SECRET header
 */
export async function GET(request: Request) {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Also allow if called from localhost for testing
        const host = request.headers.get('host');
        if (!host?.includes('localhost')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const supabase = await createClient();

        // Get all users with enabled Gmail sync
        // In a real app, we might want to batch this or use a queue
        const { data: connections, error } = await supabase
            .from('email_connections')
            .select('user_id')
            .eq('sync_enabled', true)
            .eq('provider', 'gmail');

        if (error) throw error;

        console.log(`Starting scheduled sync for ${connections.length} users`);

        const results = {
            total: connections.length,
            success: 0,
            failed: 0,
        };

        // Process each user
        // Note: This is sequential to avoid hitting rate limits too hard
        // For production with many users, use a queue (e.g. Inngest, Trigger.dev)
        for (const conn of connections) {
            try {
                console.log(`Syncing for user ${conn.user_id}...`);

                // Call the sync service
                const syncResult = await syncGmailForUser(conn.user_id);

                console.log(`✓ Synced ${syncResult.emailsProcessed} emails for user ${conn.user_id}`);
                results.success++;
            } catch (err) {
                console.error(`✗ Failed to sync for user ${conn.user_id}:`, err);
                results.failed++;
            }
        }

        return NextResponse.json({
            success: true,
            results,
        });

    } catch (error) {
        console.error('Error in scheduled Gmail sync:', error);
        return NextResponse.json(
            { error: 'Failed to run scheduled sync' },
            { status: 500 }
        );
    }
}
