import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(state?: string): string {
    const oauth2Client = createOAuth2Client();

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent', // Force consent to get refresh token
        state: state || '',
    });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string) {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
        refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
}

/**
 * Create Gmail client with credentials
 */
export function createGmailClient(accessToken: string) {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
        access_token: accessToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Get user's email address
 */
export async function getUserEmail(accessToken: string): Promise<string> {
    const gmail = createGmailClient(accessToken);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return profile.data.emailAddress || '';
}
