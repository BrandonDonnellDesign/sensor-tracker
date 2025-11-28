import { createClient } from '@/lib/supabase-server';
import { calculateNextReorderDate, getDaysUntilReorder } from '@/lib/utils/reorder-calculator';

interface ReorderNotificationCheck {
    userId: string;
    totalInventory: number;
    sensorDuration: number;
    lastOrderDate: Date | null;
    nextReorderDate: Date | null;
    daysUntilReorder: number;
}

/**
 * Check if user needs a reorder reminder notification
 * Should be called daily (via cron job or scheduled task)
 */
export async function checkReorderReminders(): Promise<void> {
    try {
        const supabase = await createClient();

        // Get all users with inventory
        const { data: inventoryData, error: inventoryError } = await supabase
            .from('sensor_inventory')
            .select(`
        user_id,
        quantity,
        sensor_model_id,
        sensor_models (
          duration_days
        )
      `);

        if (inventoryError) throw inventoryError;

        // Group by user
        const userInventories = new Map<string, ReorderNotificationCheck>();

        for (const item of inventoryData || []) {
            const userId = item.user_id;
            const existing = userInventories.get(userId);
            const sensorDuration = (item.sensor_models as any)?.duration_days || 10;

            if (existing) {
                existing.totalInventory += item.quantity;
            } else {
                userInventories.set(userId, {
                    userId,
                    totalInventory: item.quantity,
                    sensorDuration,
                    lastOrderDate: null,
                    nextReorderDate: null,
                    daysUntilReorder: 0,
                });
            }
        }

        // For each user, check their latest order and calculate reorder date
        for (const [userId, inventory] of userInventories.entries()) {
            // Get latest order
            const { data: latestOrder } = await supabase
                .from('sensor_orders')
                .select('order_date')
                .eq('user_id', userId)
                .order('order_date', { ascending: false })
                .limit(1)
                .single();

            if (latestOrder) {
                const lastOrderDate = new Date(latestOrder.order_date);
                const nextReorderDate = calculateNextReorderDate(
                    lastOrderDate,
                    inventory.totalInventory,
                    inventory.sensorDuration
                );
                const daysUntilReorder = getDaysUntilReorder(nextReorderDate);

                inventory.lastOrderDate = lastOrderDate;
                inventory.nextReorderDate = nextReorderDate;
                inventory.daysUntilReorder = daysUntilReorder;

                // Send notification if within 3 days
                if (daysUntilReorder >= 0 && daysUntilReorder <= 3) {
                    await sendReorderNotification(userId, daysUntilReorder, inventory.totalInventory);
                }
            }
        }

        console.log(`Checked reorder reminders for ${userInventories.size} users`);
    } catch (error) {
        console.error('Error checking reorder reminders:', error);
        throw error;
    }
}

/**
 * Send a reorder reminder notification to a user
 */
async function sendReorderNotification(
    userId: string,
    daysUntilReorder: number,
    currentInventory: number
): Promise<void> {
    try {
        const supabase = await createClient();

        // Check if we already sent a notification today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'reorder_reminder')
            .gte('created_at', `${today}T00:00:00`)
            .single();

        if (existingNotification) {
            console.log(`Already sent reorder notification to user ${userId} today`);
            return;
        }

        // Create notification message
        let message = '';
        let priority: 'low' | 'medium' | 'high' = 'medium';

        if (daysUntilReorder === 0) {
            message = `⚠️ Time to reorder sensors! You have ${currentInventory} sensors left.`;
            priority = 'high';
        } else if (daysUntilReorder === 1) {
            message = `📦 Reorder sensors tomorrow! You have ${currentInventory} sensors remaining.`;
            priority = 'high';
        } else {
            message = `📅 Reorder sensors in ${daysUntilReorder} days. Current inventory: ${currentInventory} sensors.`;
            priority = 'medium';
        }

        // Insert notification
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type: 'reorder_reminder',
                title: 'Sensor Reorder Reminder',
                message,
                priority,
                link: '/dashboard/inventory',
                read: false,
            });

        if (error) {
            console.error('Error creating notification:', error);
        } else {
            console.log(`Sent reorder notification to user ${userId}: ${message}`);
        }
    } catch (error) {
        console.error('Error sending reorder notification:', error);
    }
}

/**
 * API endpoint to manually trigger reorder check (for testing)
 */
export async function GET() {
    try {
        await checkReorderReminders();
        return Response.json({ success: true, message: 'Reorder reminders checked' });
    } catch (error) {
        console.error('Error in reorder reminders API:', error);
        return Response.json(
            { success: false, error: 'Failed to check reorder reminders' },
            { status: 500 }
        );
    }
}
