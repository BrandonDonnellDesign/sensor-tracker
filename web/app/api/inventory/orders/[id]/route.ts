import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// PATCH - Update order status
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { status, actual_delivery_date, quantity } = body;

        // Update the order
        const { data: order, error: updateError } = await (supabase as any)
            .from('sensor_orders')
            .update({
                status,
                actual_delivery_date,
                quantity, // Allow updating quantity
                updated_at: new Date().toISOString()
            })
            .eq('id', params.id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // If status is delivered, add to inventory
        if (status === 'delivered' && order.sensor_model_id) {
            const { error: inventoryError } = await (supabase as any).rpc('increment_inventory', {
                p_user_id: user.id,
                p_sensor_model_id: order.sensor_model_id,
                p_quantity: order.quantity || 1
            });

            if (inventoryError) {
                console.error('Error updating inventory:', inventoryError);
                return NextResponse.json({
                    success: false,
                    error: 'Order updated but failed to update inventory'
                }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            order
        });

    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json(
            { error: 'Failed to update order' },
            { status: 500 }
        );
    }
}
