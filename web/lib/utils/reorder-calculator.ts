/**
 * Calculate the next reorder date based on inventory and last order date
 * 
 * Logic:
 * - If supply > 30 days: reorder in 30 days from last order
 * - If supply <= 30 days: reorder when supply runs low (3-day buffer)
 */
export function calculateNextReorderDate(
    lastOrderDate: Date,
    currentInventory: number,
    sensorDurationDays: number = 10 // Default for Dexcom G6/G7
): Date {
    const daysOfSupply = currentInventory * sensorDurationDays;

    if (daysOfSupply > 30) {
        // If more than 30 days supply, reorder in 30 days from last order
        const nextReorder = new Date(lastOrderDate);
        nextReorder.setDate(nextReorder.getDate() + 30);
        return nextReorder;
    } else {
        // Otherwise, reorder when supply runs low (keep 3-day buffer)
        const today = new Date();
        const reorderDate = new Date(today);
        reorderDate.setDate(today.getDate() + Math.max(0, daysOfSupply - 3));
        return reorderDate;
    }
}

/**
 * Check if a reorder reminder should be shown
 * Returns true if reorder date is within 3 days
 */
export function shouldShowReorderReminder(nextReorderDate: Date): boolean {
    const today = new Date();
    const daysUntilReorder = Math.ceil(
        (nextReorderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilReorder <= 3 && daysUntilReorder >= 0;
}

/**
 * Get days until reorder date
 */
export function getDaysUntilReorder(nextReorderDate: Date): number {
    const today = new Date();
    return Math.ceil(
        (nextReorderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
}

/**
 * Format reorder date for display
 */
export function formatReorderDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}
