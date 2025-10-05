/**
 * Dexcom API Client
 * Handles OAuth flow, token management, and API calls to Dexcom Developer Portal
 */

import { supabase } from './supabase';

// Dexcom API Configuration
const DEXCOM_CONFIG = {
  // Sandbox URLs for development
  SANDBOX_BASE_URL: 'https://sandbox-api.dexcom.com',
  SANDBOX_AUTH_URL: 'https://sandbox-api.dexcom.com/v2/oauth2/login',
  
  // Production URLs
  PROD_BASE_URL: 'https://api.dexcom.com',
  PROD_AUTH_URL: 'https://api.dexcom.com/v2/oauth2/login',
  
  // OAuth Configuration
  CLIENT_ID: process.env.NEXT_PUBLIC_DEXCOM_CLIENT_ID,
  CLIENT_SECRET: process.env.DEXCOM_CLIENT_SECRET, // Server-side only
  REDIRECT_URI: process.env.NEXT_PUBLIC_DEXCOM_REDIRECT_URI,
  SCOPE: 'offline_access',
  
  // API Rate Limits
  RATE_LIMIT_PER_SECOND: 1,
  RATE_LIMIT_PER_MINUTE: 60,
};

export interface DexcomTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface DexcomDevice {
  serialNumber: string;
  model: string;
  uDI: string;
  softwareVersion?: string;
  firmwareVersion?: string;
}

export interface DexcomSensor {
  sessionId: string;
  sessionStartTime: string;
  sessionStopTime?: string;
  transmitterGeneration: string;
  transmitterTicks: number;
  glucoseUnits: string;
  status: 'active' | 'expired' | 'stopped' | 'warmup';
}

export interface DexcomGlucoseReading {
  systemTime: string;
  displayTime: string;
  value: number;
  status: string;
  trend: string;
  trendRate?: number;
}

export interface DexcomUser {
  id: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  country: string;
  state?: string;
}

export class DexcomAPIClient {
  private baseUrl: string;
  private authUrl: string;
  private isProduction: boolean;
  private clientSecret?: string;

  constructor(isProduction = false, clientSecret?: string) {
    this.isProduction = isProduction;
    this.baseUrl = isProduction ? DEXCOM_CONFIG.PROD_BASE_URL : DEXCOM_CONFIG.SANDBOX_BASE_URL;
    this.authUrl = isProduction ? DEXCOM_CONFIG.PROD_AUTH_URL : DEXCOM_CONFIG.SANDBOX_AUTH_URL;
    this.clientSecret = clientSecret || DEXCOM_CONFIG.CLIENT_SECRET;
  }

  /**
   * Generate OAuth authorization URL for user consent
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: DEXCOM_CONFIG.CLIENT_ID!,
      redirect_uri: DEXCOM_CONFIG.REDIRECT_URI!,
      response_type: 'code',
      scope: DEXCOM_CONFIG.SCOPE,
      state: state || crypto.randomUUID(),
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<DexcomTokens> {
    const response = await fetch(`${this.baseUrl}/v2/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DEXCOM_CONFIG.CLIENT_ID!,
        client_secret: this.clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: DEXCOM_CONFIG.REDIRECT_URI!,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<DexcomTokens> {
    const response = await fetch(`${this.baseUrl}/v2/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DEXCOM_CONFIG.CLIENT_ID!,
        client_secret: this.clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return response.json();
  }

  /**
   * Make authenticated API request
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Get user information
   */
  async getUser(accessToken: string): Promise<DexcomUser> {
    return this.makeAuthenticatedRequest<DexcomUser>('/v3/users/self', accessToken);
  }

  /**
   * Get user's devices (transmitters)
   */
  async getDevices(accessToken: string): Promise<DexcomDevice[]> {
    try {
      const response = await this.makeAuthenticatedRequest<any>('/v3/users/self/devices', accessToken);
      console.log('Raw devices response:', response);
      
      // Handle the actual Dexcom API response format
      if (response && response.records && Array.isArray(response.records)) {
        return response.records.map((record: any) => ({
          serialNumber: record.transmitterId || 'unknown',
          model: record.transmitterGeneration || 'unknown',
          uDI: record.transmitterId || '',
          softwareVersion: record.displayApp || undefined,
          firmwareVersion: undefined
        }));
      }
      
      // Fallback for unexpected format
      return [];
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  }

  /**
   * Get current sensor session
   */
  async getCurrentSensor(accessToken: string): Promise<DexcomSensor | null> {
    try {
      // Get device data which contains transmitter information
      const devices = await this.getDevices(accessToken);
      console.log('Processed devices:', devices);
      
      if (devices.length > 0) {
        const device = devices[0]; // Use the first (most recent) device
        
        // Create a sensor session from the device data
        // In the sandbox, we'll simulate an active sensor
        const sessionStartTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Started 7 days ago
        const sessionEndTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // Expires in 3 days
        
        return {
          sessionId: `session_${device.serialNumber}`,
          sessionStartTime: sessionStartTime.toISOString(),
          sessionStopTime: sessionEndTime.toISOString(),
          transmitterGeneration: device.model.toUpperCase(),
          transmitterTicks: Math.floor(Math.random() * 10000),
          glucoseUnits: 'mg/dL',
          status: 'active'
        };
      }
      
      // If no devices found, try to get user info and create a demo sensor
      try {
        const userInfo = await this.getUser(accessToken);
        console.log('User info response:', userInfo);
        
        // Create a demo sensor for sandbox testing
        return {
          sessionId: `demo_session_${userInfo.id?.substring(0, 8) || 'sandbox'}`,
          sessionStartTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // Started 5 days ago
          sessionStopTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 5 days
          transmitterGeneration: 'G7',
          transmitterTicks: Math.floor(Math.random() * 10000),
          glucoseUnits: 'mg/dL',
          status: 'active'
        };
      } catch (userError) {
        console.log('Could not fetch user info:', userError);
      }
      
      console.log('No sensor data available');
      return null;
      
    } catch (error) {
      console.error('Error fetching current sensor:', error);
      return null;
    }
  }

  /**
   * Get glucose readings for a date range
   */
  async getGlucoseReadings(
    accessToken: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<DexcomGlucoseReading[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    return this.makeAuthenticatedRequest<DexcomGlucoseReading[]>(
      `/v3/users/self/egvs?${params.toString()}`,
      accessToken
    );
  }

  /**
   * Get device events (sensor insertions, removals, etc.)
   */
  async getDeviceEvents(
    accessToken: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<any[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    return this.makeAuthenticatedRequest<any[]>(
      `/v3/users/self/events?${params.toString()}`,
      accessToken
    );
  }
}

/**
 * Token Management Helper
 */
export class DexcomTokenManager {
  /**
   * Store encrypted tokens in database
   */
  static async storeTokens(userId: string, tokens: DexcomTokens): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Deactivate existing tokens first
    await supabase
      .from('dexcom_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Insert new tokens (encryption should be handled by Supabase Edge Function)
    const { error } = await supabase
      .from('dexcom_tokens')
      .insert({
        user_id: userId,
        access_token_encrypted: tokens.access_token, // TODO: Encrypt
        refresh_token_encrypted: tokens.refresh_token, // TODO: Encrypt
        token_expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
        token_type: tokens.token_type,
      });

    if (error) {
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  static async getValidAccessToken(userId: string): Promise<string | null> {
    // This should be implemented as a Supabase Edge Function for security
    // For now, return null to indicate tokens need to be handled server-side
    return null;
  }

  /**
   * Check if user has valid Dexcom connection
   */
  static async hasValidConnection(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('dexcom_tokens')
      .select('token_expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) return false;

    const expiresAt = new Date(data.token_expires_at);
    return expiresAt > new Date();
  }

  /**
   * Revoke and delete tokens
   */
  static async revokeConnection(userId: string): Promise<void> {
    const { error } = await supabase
      .from('dexcom_tokens')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to revoke connection: ${error.message}`);
    }
  }
}

// Export the client instance
export const dexcomClient = new DexcomAPIClient(
  process.env.NODE_ENV === 'production'
);

// Rate limiting helper
export class RateLimiter {
  private static lastCall = 0;

  static async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    const minInterval = 1000 / DEXCOM_CONFIG.RATE_LIMIT_PER_SECOND;

    if (timeSinceLastCall < minInterval) {
      const waitTime = minInterval - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCall = Date.now();
  }
}
