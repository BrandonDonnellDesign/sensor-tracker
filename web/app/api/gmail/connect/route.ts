import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAuthUrl } from '@/lib/gmail/oauth-client';

/**
 * Initiate Gmail OAuth flow
 * GET /api/gmail/connect
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Generate state parameter for security (prevents CSRF)
        const state = Buffer.from(JSON.stringify({
            userId: user.id,
            timestamp: Date.now(),
        })).toString('base64');

        // Generate OAuth URL
        const authUrl = getAuthUrl(state);

        return NextResponse.json({
            success: true,
            authUrl,
        });

    } catch (error) {
        console.error('Error initiating Gmail OAuth:', error);
        return NextResponse.json(
            { error: 'Failed to initiate OAuth flow' },
            { status: 500 }
        );
    }
}
