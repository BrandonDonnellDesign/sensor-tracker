import { schedule } from '@netlify/functions';

// Reorder reminder logic
async function checkReorderReminders() {
    try {
        // Call your Next.js API route
        const response = await fetch(`${process.env.URL}/api/cron/reorder-reminders`);

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('Reorder reminders checked:', data);
        return data;
    } catch (error) {
        console.error('Error checking reorder reminders:', error);
        throw error;
    }
}

// Run daily at 9 AM UTC
const handler = schedule('0 9 * * *', async () => {
    try {
        await checkReorderReminders();
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Reorder reminders checked successfully' })
        };
    } catch (error) {
        console.error('Error in scheduled reorder check:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to check reorder reminders' })
        };
    }
});

export { handler };
