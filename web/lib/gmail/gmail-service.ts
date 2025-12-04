import { gmail_v1 } from 'googleapis';
import { createGmailClient, refreshAccessToken } from './oauth-client';
import { createClient } from '@/lib/supabase-server';

export interface GmailMessage {
    id: string;
    threadId: string;
    labelIds?: string[];
    snippet?: string;
    payload?: gmail_v1.Schema$MessagePart;
    internalDate?: string;
}

export interface ParsedEmailMetadata {
    subject: string;
    from: string;
    date: Date;
    body: string;
    snippet?: string;
}

export class GmailService {
    private gmail: gmail_v1.Gmail;

    constructor(accessToken: string) {
        this.gmail = createGmailClient(accessToken);
    }

    /**
     * Initialize service for a user, handling token refresh if needed
     */
    static async create(userId: string): Promise<GmailService | null> {
        const supabase = await createClient();

        // Get connection details
        const { data: connectionData, error } = await supabase
            .from('email_connections')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', 'gmail')
            .single();

        if (error || !connectionData) {
            console.error('No Gmail connection found for user:', userId);
            return null;
        }

        const connection = connectionData as any;

        // Check if token needs refresh (expire in less than 5 minutes)
        const expiryDate = new Date(connection.token_expiry);
        const now = new Date();
        const fiveMinutes = 5 * 60 * 1000;

        let accessToken = connection.access_token;

        if (expiryDate.getTime() - now.getTime() < fiveMinutes) {
            try {
                console.log('Refreshing Gmail access token for user:', userId);
                const tokens = await refreshAccessToken(connection.refresh_token);

                if (tokens.access_token) {
                    accessToken = tokens.access_token;

                    // Update database with new token
                    const newExpiry = tokens.expiry_date
                        ? new Date(tokens.expiry_date)
                        : new Date(Date.now() + 3600 * 1000);

                    await supabase
                        .from('email_connections')
                        .update({
                            access_token: accessToken,
                            token_expiry: newExpiry.toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', connection.id);
                }
            } catch (refreshError) {
                console.error('Failed to refresh token:', refreshError);
                return null;
            }
        }

        return new GmailService(accessToken);
    }

    /**
     * Search for emails matching query
     */
    async searchEmails(query: string, maxResults = 10): Promise<GmailMessage[]> {
        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults,
            });

            const messages = response.data.messages || [];
            const fullMessages: GmailMessage[] = [];

            // Fetch full content for each message
            for (const msg of messages) {
                if (msg.id) {
                    const fullMsg = await this.getMessage(msg.id);
                    if (fullMsg) {
                        fullMessages.push(fullMsg);
                    }
                }
            }

            return fullMessages;
        } catch (error) {
            console.error('Error searching emails:', error);
            return [];
        }
    }

    /**
     * Get full message details
     */
    async getMessage(messageId: string): Promise<GmailMessage | null> {
        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full',
            });

            return response.data as GmailMessage;
        } catch (error) {
            console.error(`Error fetching message ${messageId}:`, error);
            return null;
        }
    }

    /**
     * Extract metadata and body from message
     */
    parseMessageContent(message: GmailMessage): ParsedEmailMetadata {
        const headers = message.payload?.headers || [];

        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const dateStr = headers.find(h => h.name === 'Date')?.value || '';
        const date = dateStr ? new Date(dateStr) : new Date();

        const body = this.extractBody(message.payload);

        return {
            subject,
            from,
            date,
            body,
            snippet: message.snippet || '',
        };
    }

    /**
     * Recursively extract body from message parts
     */
    private extractBody(payload?: gmail_v1.Schema$MessagePart): string {
        if (!payload) return '';

        // If direct body data exists (usually for text/plain or text/html)
        if (payload.body?.data) {
            return Buffer.from(payload.body.data, 'base64').toString();
        }

        // If parts exist, search recursively
        if (payload.parts) {
            // Priority: text/plain -> text/html -> multipart

            // 1. Try to find text/plain
            const plainPart = payload.parts.find(p => p.mimeType === 'text/plain');
            if (plainPart) {
                return this.extractBody(plainPart);
            }

            // 2. Try to find text/html
            const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
            if (htmlPart) {
                return this.extractBody(htmlPart);
            }

            // 3. If multipart (e.g. multipart/alternative), dive into the first part that might have content
            // or just concatenate all parts? Usually we just want the first readable part.
            // For now, let's try to find ANY part that returns content.
            for (const part of payload.parts) {
                const content = this.extractBody(part);
                if (content) return content;
            }
        }

        return '';
    }
}
