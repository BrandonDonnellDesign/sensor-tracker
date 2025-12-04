import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * Get parsed email history
 * GET /api/gmail/history
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: emails, error } = await supabase
            .from('parsed_emails')
            .select('*')
            .eq('user_id', user.id)
            .order('received_date', { ascending: false })
            .limit(20);

        if (error) throw error;

        return NextResponse.json({ emails });

    } catch (error) {
        console.error('Error fetching email history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch history' },
            { status: 500 }
        );
    }
}
