import { createClient } from '@/lib/supabase-server';
import { GmailService } from './gmail-service';
import { parserRegistry } from './parsers/registry';
import { orderMatcher } from './order-matcher';
import { gmailErrorLogger } from './error-logger';

/**
 * Sync Gmail emails for a specific user
 * This is the core sync logic used by both manual sync and cron jobs
 */
export async function syncGmailForUser(userId: string) {
    const supabase = await createClient();

    // Initialize Gmail service
    const gmailService = await GmailService.create(userId);

    if (!gmailService) {
        const error = new Error('Gmail not connected or token expired');
        await gmailErrorLogger.logGmailApiError(userId, error, 'initialize');
        throw error;
    }

    // Search for order emails (Amazon Pharmacy, Dexcom, CVS, Walgreens, US Med, Edgepark, Omnipod)
    // Includes keywords for orders, shipping, delivery, tracking, invoices, and replacements
    // Note: Using "from:pharmacy.amazon.com" instead of just "amazon" to avoid non-pharmacy Amazon emails
    const query = 'subject:(order OR confirmation OR shipped OR delivery OR tracking OR invoice OR replacement OR "your supply") (from:pharmacy.amazon.com OR from:amazonpharmacy.com OR dexcom OR cvs OR walgreens OR "us med" OR edgepark OR omnipod OR insulet OR theomnipodteam) newer_than:90d';
    
    let messages;
    try {
        messages = await gmailService.searchEmails(query, 20);
    } catch (error) {
        await gmailErrorLogger.logGmailApiError(userId, error as Error, 'search_emails');
        throw error;
    }

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
                await gmailErrorLogger.logInventoryError(
                    userId,
                    orderId || 'unknown',
                    error as Error,
                    matchResult?.action === 'delivered' ? 'increase' : 'decrease'
                );
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

            // Log parsing failure
            const vendor = content.from.includes('amazon') ? 'Amazon Pharmacy' :
                          content.from.includes('dexcom') ? 'Dexcom' :
                          content.from.includes('cvs') ? 'CVS' :
                          content.from.includes('walgreens') ? 'Walgreens' :
                          content.from.includes('omnipod') || content.from.includes('insulet') ? 'Omnipod' :
                          'Unknown';
            
            // Log parsing error (gracefully handles missing table)
            await gmailErrorLogger.logParsingError(
                userId,
                msg.id,
                vendor,
                new Error('Failed to parse email'),
                content.body.substring(0, 500)
            );

            // Save to unmatched_emails for review (gracefully handles missing table)
            try {
                await (supabase as any)
                    .from('unmatched_emails')
                    .insert({
                        user_id: userId,
                        email_id: msg.id,
                        vendor,
                        subject: content.subject,
                        parsed_data: { from: content.from, snippet: content.snippet },
                        email_date: content.date.toISOString(),
                    });
            } catch (unmatchedError) {
                // Table doesn't exist yet, just log to console
                console.warn('Could not save unmatched email (table may not exist yet):', unmatchedError);
            }
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
