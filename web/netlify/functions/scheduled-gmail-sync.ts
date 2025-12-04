import { schedule } from '@netlify/functions';

export const handler = schedule('0 10 * * *', async () => {
    const { URL } = process.env;
    const cronUrl = `${URL}/api/cron/gmail-sync`;

    console.log(`Triggering daily Gmail sync at ${cronUrl}`);

    try {
        const response = await fetch(cronUrl, {
            headers: {
                Authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
        });

        const data = await response.json();
        console.log('Gmail sync result:', data);

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error('Error triggering Gmail sync:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to trigger sync' }),
        };
    }
});
