/**
 * API Authentication System
 * Handles API keys, JWT tokens, and permission management
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  permissions: string[];
  rateLimit: 'public' | 'authenticated' | 'premium';
  isActive: boolean;
  lastUsed?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  apiKey?: ApiKey;
  permissions: string[];
  rateLimit: 'public' | 'authenticated' | 'premium' | 'admin';
  error?: string;
}

class ApiAuthService {
  /**
   * Authenticate API request
   */
  async authenticateRequest(request: NextRequest): Promise<AuthResult> {
    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');

    // Try API key authentication first
    if (apiKeyHeader) {
      return await this.authenticateApiKey(apiKeyHeader);
    }

    // Try Bearer token authentication
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return await this.authenticateToken(token);
    }

    // No authentication - public access
    return {
      success: true,
      permissions: ['read:public'],
      rateLimit: 'public'
    };
  }

  /**
   * Authenticate using API key
   */
  private async authenticateApiKey(apiKey: string): Promise<AuthResult> {
    try {
      // Hash the API key for lookup (in production, store hashed keys)
      const hashedKey = await this.hashApiKey(apiKey);

      const { data: keyData, error } = await supabase
        .from('api_keys')
        .select(`
          *,
          user:profiles!api_keys_user_id_fkey(id, email, role)
        `)
        .eq('key_hash', hashedKey)
        .eq('is_active', true)
        .single();

      if (error || !keyData) {
        return {
          success: false,
          permissions: [],
          rateLimit: 'public',
          error: 'Invalid API key'
        };
      }

      // Check expiration
      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        return {
          success: false,
          permissions: [],
          rateLimit: 'public',
          error: 'API key expired'
        };
      }

      // Update last used timestamp
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyData.id);

      return {
        success: true,
        user: keyData.user,
        apiKey: {
          id: keyData.id,
          name: keyData.name,
          key: apiKey,
          userId: keyData.user_id,
          permissions: keyData.permissions || [],
          rateLimit: keyData.rate_limit || 'authenticated',
          isActive: keyData.is_active,
          lastUsed: keyData.last_used_at,
          expiresAt: keyData.expires_at,
          createdAt: keyData.created_at
        },
        permissions: keyData.permissions || [],
        rateLimit: keyData.rate_limit || 'authenticated'
      };
    } catch (error) {
      console.error('API key authentication error:', error);
      return {
        success: false,
        permissions: [],
        rateLimit: 'public',
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Authenticate using JWT token
   */
  private async authenticateToken(token: string): Promise<AuthResult> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return {
          success: false,
          permissions: [],
          rateLimit: 'public',
          error: 'Invalid token'
        };
      }

      // Get user profile for role and permissions
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile lookup error:', profileError);
      }

      const role = profile?.role || 'user';
      const permissions = this.getRolePermissions(role);
      const rateLimit = role === 'admin' ? 'admin' : 'authenticated';

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email || '',
          role
        },
        permissions,
        rateLimit
      };
    } catch (error) {
      console.error('Token authentication error:', error);
      return {
        success: false,
        permissions: [],
        rateLimit: 'public',
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Get permissions for a role
   */
  private getRolePermissions(role: string): string[] {
    const rolePermissions = {
      admin: [
        'read:public',
        'read:community',
        'write:community',
        'moderate:community',
        'read:users',
        'write:users',
        'read:analytics',
        'write:analytics'
      ],
      user: [
        'read:public',
        'read:community',
        'write:community:own',
        'read:profile:own',
        'write:profile:own'
      ],
      public: [
        'read:public'
      ]
    };

    return rolePermissions[role as keyof typeof rolePermissions] || rolePermissions.public;
  }

  /**
   * Check if user has required permission
   */
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Admin has all permissions
    if (userPermissions.includes('read:analytics')) {
      return true;
    }

    // Check exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check wildcard permissions
    const [action] = requiredPermission.split(':');
    const wildcardPermission = `${action}:*`;
    
    return userPermissions.includes(wildcardPermission);
  }

  /**
   * Generate API key
   */
  async generateApiKey(userId: string, name: string, permissions: string[], rateLimit: string = 'authenticated'): Promise<string> {
    // Generate random API key
    const apiKey = 'cgm_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const hashedKey = await this.hashApiKey(apiKey);

    // Store in database
    const { error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: hashedKey,
        permissions,
        rate_limit: rateLimit,
        is_active: true,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error('Failed to create API key');
    }

    return apiKey;
  }

  /**
   * Hash API key for secure storage
   */
  private async hashApiKey(apiKey: string): Promise<string> {
    // In production, use a proper hashing algorithm like bcrypt
    // For now, using a simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey + process.env.API_KEY_SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId);

    return !error;
  }

  /**
   * List user's API keys
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return [];
    }

    return data.map(key => ({
      id: key.id,
      name: key.name,
      key: '***' + key.key_hash.slice(-4), // Only show last 4 chars
      userId: key.user_id,
      permissions: key.permissions || [],
      rateLimit: key.rate_limit || 'authenticated',
      isActive: key.is_active,
      lastUsed: key.last_used_at,
      expiresAt: key.expires_at,
      createdAt: key.created_at
    }));
  }
}

// Export singleton instance
export const apiAuthService = new ApiAuthService();