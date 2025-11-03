import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';
import { createApiKey, getUserApiKeys } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userSupabase = createClient();
    
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Invalid authentication' },
        { status: 401 }
      );
    }
    
    const apiKeys = await getUserApiKeys(user.id);
    
    return NextResponse.json({
      data: apiKeys,
      meta: {
        total: apiKeys.length,
        apiVersion: '1.0.0'
      }
    });
    
  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    

    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required - no bearer token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userSupabase = createClient();
    

    
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);
    

    
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: 'unauthorized', 
          message: 'Invalid authentication',
          debug: {
            authError: authError?.message,
            hasUser: !!user
          }
        },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { name, tier = 'free', expiresInDays } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'validation_error', message: 'API key name is required' },
        { status: 400 }
      );
    }
    
    if (name.length > 100) {
      return NextResponse.json(
        { error: 'validation_error', message: 'API key name must be less than 100 characters' },
        { status: 400 }
      );
    }
    
    if (!['free', 'basic', 'premium'].includes(tier)) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid tier. Must be free, basic, or premium' },
        { status: 400 }
      );
    }
    
    // Check if user already has too many API keys
    let existingKeys;
    try {
      existingKeys = await getUserApiKeys(user.id);
    } catch (dbError) {
      console.error('Database error when checking existing keys:', dbError);
      return NextResponse.json(
        { 
          error: 'database_error', 
          message: 'Database not ready. Please ensure migrations are applied.',
          debug: {
            dbError: dbError instanceof Error ? dbError.message : 'Unknown database error'
          }
        },
        { status: 500 }
      );
    }
    
    const maxKeys = tier === 'free' ? 2 : tier === 'basic' ? 5 : 10;
    
    if (existingKeys.length >= maxKeys) {
      return NextResponse.json(
        { 
          error: 'limit_exceeded', 
          message: `Maximum ${maxKeys} API keys allowed for ${tier} tier` 
        },
        { status: 400 }
      );
    }
    
    // Calculate expiration date
    let expiresAt: Date | undefined;
    if (expiresInDays && typeof expiresInDays === 'number' && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }
    
    let apiKey, rawKey;
    try {
      const result = await createApiKey(
        user.id,
        name.trim(),
        tier,
        expiresAt
      );
      apiKey = result.apiKey;
      rawKey = result.rawKey;
    } catch (createError) {
      console.error('Error creating API key:', createError);
      return NextResponse.json(
        { 
          error: 'creation_failed', 
          message: 'Failed to create API key',
          debug: {
            createError: createError instanceof Error ? createError.message : 'Unknown creation error'
          }
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: {
        ...apiKey,
        key: rawKey // Only return the raw key once during creation
      },
      meta: {
        apiVersion: '1.0.0',
        warning: 'Store this API key securely. It will not be shown again.'
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create API key' },
      { status: 500 }
    );
  }
}