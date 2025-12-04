import { createClient } from '@/lib/supabase-server';
import { GmailService } from './gmail-service';
import { parserRegistry } from './parsers/registry';
import { orderMatcher } from './order-matcher';

/**
 * Sync Gmail emails for a specific user
 * This is the core sync logic used by both manual sync and cron jobs
 */
export async function syncGmailForUser(userId: string) {
    const supabase = await createClient();

    // Initialize Gmail service
    const gmailService = await GmailService.create(userId);

    if (!gmailService) {
        throw new Error('Gmail not connected or token expired');
    }

    // Search for order emails (Amazon, Dexcom, CVS, Walgreens, US Med, Edgepark, Omnipod)
    // Includes keywords for orders, shipping, delivery, tracking, invoices, and replacements
    const query = 'subject:(order OR confirmation OR shipped OR delivery OR tracking OR invoice OR replacement OR "your supply") (amazon OR dexcom OR cvs OR walgreens OR "us med" OR edgepark OR omnipod OR insulet OR theomnipodteam) newer_than:90d';
    const messages = await gmailService.searchEmails(query, 20);

    const results = [];
    const unparsed = [];

    for (const msg of messages) {
        const content = gmailService.parseMessageContent(msg);

        // Check if this email was already processed and created an order
        const { data: existingParsedEmail } = await (supabase as any)
            .from('parsed_emails')
            .select('order_id, parsing_status')
            .eq('gmail_message_id', msg.id)
            .single();

        // Skip if already successfully processed and created an order
        if (existingParsedEmail?.order_id && existingParsedEmail?.parsing_status === 'success') {
            console.log(`Skipping already processed email: ${msg.id}`);
            results.push({
                id: msg.id,
                subject: content.subject,
                from: content.from,
                status: 'skipped',
                action: { action: 'skipped', reason: 'Already processed' },
                snippet: content.snippet
            });
            continue;
        }

        // Try to parse the email
        const parsedOrder = parserRegistry.parse(content);
        let orderId = null;
        let parsingStatus = 'failed';
        let matchResult = null;

        if (parsedOrder) {
            parsingStatus = 'success';
            try {
                // Match or create order
                matchResult = await orderMatcher.processOrder(userId, parsedOrder);
                orderId = matchResult.orderId;
            } catch (error) {
                console.error('Error processing order:', error);
                parsingStatus = 'failed';
            }
        } else {
            // Log unparsed email for debugging
            unparsed.push({
                id: msg.id,
                subject: content.subject,
                from: content.from,
                date: content.date,
                snippet: content.snippet
            });
        }

        // Save to parsed_emails table
        const { error: saveError } = await (supabase as any)
            .from('parsed_emails')
            .upsert({
                user_id: userId,
                gmail_message_id: msg.id,
                subject: content.subject,
                from_address: content.from,
                received_date: content.date.toISOString(),
                parsed_data: parsedOrder ? JSON.stringify(parsedOrder) : null,
                parsing_status: parsingStatus,
                confidence_score: parsedOrder?.confidence,
                order_id: orderId,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'gmail_message_id',
                ignoreDuplicates: false
            });

        if (!saveError && parsedOrder) {
            results.push({
                id: msg.id,
                subject: content.subject,
                from: content.from,
                status: parsingStatus,
                action: matchResult,
                snippet: content.body.substring(0, 500), // First 500 chars for debug page
            });
        }
    }

    // Update last sync time
    await (supabase as any)
        .from('email_connections')
        .update({ last_sync: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('provider', 'gmail');

    return {
        success: true,
        emailsProcessed: results.length,
        results,
        unparsed,
        totalFound: messages.length
    };
}
