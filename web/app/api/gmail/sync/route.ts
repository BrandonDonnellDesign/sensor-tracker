import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { syncGmailForUser } from '@/lib/gmail/sync-service';

/**
 * Manually trigger email sync
 * POST /api/gmail/sync
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use the shared sync service
        const result = await syncGmailForUser(user.id);

        return NextResponse.json({
            success: true,
            message: `Synced ${result.emailsProcessed} emails`,
            emails: result.results,
        });

    } catch (error) {
        console.error('Error syncing Gmail:', error);
        return NextResponse.json(
            { error: 'Failed to sync emails' },
            { status: 500 }
        );
    }
}
