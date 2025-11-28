import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            order_date,
            quantity,
            order_number,
            supplier,
            sensor_model_id,
            status = 'delivered'
        } = body;

        // Validate required fields
        if (!order_date || !quantity) {
            return NextResponse.json(
                { success: false, error: 'Order date and quantity are required' },
                { status: 400 }
            );
        }

        // Insert into sensor_orders table
        const { data, error } = await (supabase as any)
            .from('sensor_orders')
            .insert({
                user_id: user.id,
                order_date,
                quantity: parseInt(quantity),
                order_number,
                supplier,
                sensor_model_id,
                status,
                actual_delivery_date: status === 'delivered' ? order_date : null,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating sensor order:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to log reorder' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            order: data
        });

    } catch (error) {
        console.error('Error in reorder API:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
