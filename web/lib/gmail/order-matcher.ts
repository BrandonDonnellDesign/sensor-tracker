import { createClient } from '@/lib/supabase-server';
import { ParsedOrder } from './parsers/base-parser';

export class OrderMatcher {
    /**
     * Process a parsed order: find existing or create new
     */
    async processOrder(userId: string, order: ParsedOrder) {
        const supabase = await createClient();

        // 1. Check if order already exists by order number
        if (order.orderNumber) {
            const { data: existingOrder } = await supabase
                .from('sensor_orders')
                .select('*')
                .eq('user_id', userId)
                .eq('order_number', order.orderNumber)
                .single();

            if (existingOrder) {
                // Update existing order if we have new info (like tracking or status)
                const updates: any = {};
                let hasUpdates = false;
                let shouldIncrementInventory = false;

                if (order.status === 'shipped' && existingOrder.status === 'ordered') {
                    updates.status = 'shipped';
                    hasUpdates = true;
                }

                if (order.status === 'delivered' && existingOrder.status !== 'delivered') {
                    updates.status = 'delivered';
                    updates.actual_delivery_date = new Date().toISOString();
                    hasUpdates = true;
                    shouldIncrementInventory = true; // Mark for inventory update
                }

                // Only update if we have something new
                if (hasUpdates) {
                    await supabase
                        .from('sensor_orders')
                        .update(updates)
                        .eq('id', existingOrder.id);

                    // Increment inventory if order was just delivered
                    if (shouldIncrementInventory && existingOrder.sensor_model_id) {
                        await (supabase as any).rpc('increment_inventory', {
                            p_user_id: userId,
                            p_sensor_model_id: existingOrder.sensor_model_id,
                            p_quantity: existingOrder.quantity || 1
                        });
                    }

                    return { action: 'updated', orderId: existingOrder.id };
                }

                return { action: 'skipped', orderId: existingOrder.id, reason: 'No new info' };
            }
        } else {
            // 2. Fuzzy match: If no order number, try to find by supplier + recent date
            // This handles "Shipped" emails that don't include the order number
            // NOTE: We don't check quantity here because shipping emails often don't include it
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: recentOrders } = await supabase
                .from('sensor_orders')
                .select('*')
                .eq('user_id', userId)
                .eq('supplier', order.supplier)
                .gte('order_date', sevenDaysAgo.toISOString().split('T')[0])
                .in('status', ['ordered', 'shipped'])
                .order('order_date', { ascending: false })
                .limit(10);

            if (recentOrders && recentOrders.length > 0) {
                // Find the best matching order:
                // 1. Prefer orders placed 1-5 days before this email
                // 2. Must be in a state that can be updated
                const emailDate = order.orderDate || new Date();

                const candidateOrder = recentOrders.find(o => {
                    const orderDate = new Date(o.order_date);
                    const daysDiff = Math.floor((emailDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

                    // Order should be 0-5 days old relative to this email
                    const isRecentEnough = daysDiff >= 0 && daysDiff <= 5;

                    // Check if this order can be updated with new status
                    const canUpdate =
                        (order.status === 'shipped' && o.status === 'ordered') ||
                        (order.status === 'delivered' && o.status !== 'delivered');

                    return isRecentEnough && canUpdate;
                });

                if (candidateOrder) {
                    const updates: any = {};
                    let shouldIncrementInventory = false;

                    if (order.status === 'shipped' && candidateOrder.status === 'ordered') {
                        updates.status = 'shipped';
                    }
                    if (order.status === 'delivered' && candidateOrder.status !== 'delivered') {
                        updates.status = 'delivered';
                        updates.actual_delivery_date = new Date().toISOString();
                        shouldIncrementInventory = true;
                    }

                    await supabase
                        .from('sensor_orders')
                        .update(updates)
                        .eq('id', candidateOrder.id);

                    // Increment inventory if order was just delivered
                    if (shouldIncrementInventory && candidateOrder.sensor_model_id) {
                        await (supabase as any).rpc('increment_inventory', {
                            p_user_id: userId,
                            p_sensor_model_id: candidateOrder.sensor_model_id,
                            p_quantity: candidateOrder.quantity || 1
                        });
                    }

                    return { action: 'updated', orderId: candidateOrder.id, reason: 'Fuzzy matched by supplier and date' };
                }
            }
        }

        // 3. Before creating a new order, check if one already exists with same date/supplier/quantity
        // This prevents duplicates when order numbers are missing
        const orderDateStr = order.orderDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];

        const { data: duplicateCheck } = await supabase
            .from('sensor_orders')
            .select('*')
            .eq('user_id', userId)
            .eq('supplier', order.supplier)
            .eq('order_date', orderDateStr)
            .eq('quantity', order.quantity || 3)
            .limit(1)
            .single();

        // If we found a matching order by date/supplier/quantity, update it instead
        if (duplicateCheck) {
            console.log(`Found existing order by date/supplier/quantity match: ${duplicateCheck.id}`);

            const updates: any = {};
            let hasUpdates = false;
            let shouldIncrementInventory = false;

            if (order.status === 'shipped' && duplicateCheck.status === 'ordered') {
                updates.status = 'shipped';
                hasUpdates = true;
            }
            if (order.status === 'delivered' && duplicateCheck.status !== 'delivered') {
                updates.status = 'delivered';
                updates.actual_delivery_date = new Date().toISOString();
                hasUpdates = true;
                shouldIncrementInventory = true;
            }

            if (hasUpdates) {
                await supabase
                    .from('sensor_orders')
                    .update(updates)
                    .eq('id', duplicateCheck.id);

                if (shouldIncrementInventory && duplicateCheck.sensor_model_id) {
                    await (supabase as any).rpc('increment_inventory', {
                        p_user_id: userId,
                        p_sensor_model_id: duplicateCheck.sensor_model_id,
                        p_quantity: duplicateCheck.quantity || 1
                    });
                }

                return { action: 'updated', orderId: duplicateCheck.id, reason: 'Matched by date/supplier/quantity' };
            }

            return { action: 'skipped', orderId: duplicateCheck.id, reason: 'Duplicate order' };
        }

        // 4. If no existing order found, create new one
        // Get default sensor model (e.g. Dexcom G7)
        const { data: sensorModel } = await supabase
            .from('sensor_models')
            .select('id')
            .ilike('name', '%Dexcom%')
            .limit(1)
            .single();

        const { data: newOrder, error } = await supabase
            .from('sensor_orders')
            .insert({
                user_id: userId,
                order_date: order.orderDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                quantity: order.quantity || 3,
                status: order.status,
                supplier: order.supplier,
                order_number: order.orderNumber || null,
                sensor_model_id: sensorModel?.id || null,
                // If delivered, set delivery date
                actual_delivery_date: order.status === 'delivered' ? new Date().toISOString() : null,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating order from email:', error);
            throw error;
        }

        // If delivered, update inventory
        if (order.status === 'delivered' && sensorModel?.id) {
            await (supabase as any).rpc('increment_inventory', {
                p_user_id: userId,
                p_sensor_model_id: sensorModel.id,
                p_quantity: order.quantity || 3
            });
        }

        return { action: 'created', orderId: newOrder.id };
    }
}

export const orderMatcher = new OrderMatcher();
