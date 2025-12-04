import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * Get Gmail connection status
 * GET /api/gmail/status
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get email connection
        const { data: connection, error: dbError } = await (supabase as any)
            .from('email_connections')
            .select('id, email_address, last_sync, sync_enabled, created_at')
            .eq('user_id', user.id)
            .eq('provider', 'gmail')
            .single();

        if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Error fetching Gmail connection:', dbError);
            return NextResponse.json(
                { error: 'Failed to fetch connection status' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            connection: connection || null,
            connected: !!connection,
        });

    } catch (error) {
        console.error('Error in Gmail status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch connection status' },
            { status: 500 }
        );
    }
}
