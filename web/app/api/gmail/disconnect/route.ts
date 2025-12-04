import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * Disconnect Gmail account
 * DELETE /api/gmail/disconnect
 */
export async function DELETE() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete email connection
        const { error: deleteError } = await (supabase as any)
            .from('email_connections')
            .delete()
            .eq('user_id', user.id)
            .eq('provider', 'gmail');

        if (deleteError) {
            console.error('Error disconnecting Gmail:', deleteError);
            return NextResponse.json(
                { error: 'Failed to disconnect Gmail' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Gmail disconnected successfully'
        });

    } catch (error) {
        console.error('Error in Gmail disconnect:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect Gmail' },
            { status: 500 }
        );
    }
}
