import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET - Fetch all orders for the user
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: orders, error } = await (supabase as any)
            .from('sensor_orders')
            .select('*')
            .eq('user_id', user.id)
            .order('order_date', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            orders: orders || []
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500 }
        );
    }
}
