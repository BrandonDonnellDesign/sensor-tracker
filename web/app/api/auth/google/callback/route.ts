import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getTokensFromCode, getUserEmail } from '@/lib/gmail/oauth-client';

/**
 * Handle Gmail OAuth callback
 * GET /api/auth/google/callback?code=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Handle OAuth errors
        if (error) {
            console.error('OAuth error:', error);
            return NextResponse.redirect(
                new URL(`/dashboard/settings?gmail_error=${error}`, request.url)
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                new URL('/dashboard/settings?gmail_error=missing_params', request.url)
            );
        }

        // Verify state parameter
        let stateData;
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        } catch {
            return NextResponse.redirect(
                new URL('/dashboard/settings?gmail_error=invalid_state', request.url)
            );
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || user.id !== stateData.userId) {
            return NextResponse.redirect(
                new URL('/dashboard/settings?gmail_error=unauthorized', request.url)
            );
        }

        // Exchange code for tokens
        const tokens = await getTokensFromCode(code);

        if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error('Missing tokens from OAuth response');
        }

        // Get user's Gmail address
        const emailAddress = await getUserEmail(tokens.access_token);

        // Calculate token expiry
        const tokenExpiry = tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : new Date(Date.now() + 3600 * 1000); // 1 hour default

        // Save connection to database
        const { error: dbError } = await (supabase as any)
            .from('email_connections')
            .upsert({
                user_id: user.id,
                provider: 'gmail',
                email_address: emailAddress,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expiry: tokenExpiry.toISOString(),
                last_sync: null,
                sync_enabled: true,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,email_address'
            });

        if (dbError) {
            console.error('Error saving email connection:', dbError);
            return NextResponse.redirect(
                new URL('/dashboard/settings?gmail_error=save_failed', request.url)
            );
        }

        // Success! Redirect to settings
        return NextResponse.redirect(
            new URL('/dashboard/settings?gmail_connected=true', request.url)
        );

    } catch (error) {
        console.error('Error in Gmail OAuth callback:', error);
        return NextResponse.redirect(
            new URL('/dashboard/settings?gmail_error=unknown', request.url)
        );
    }
}
