import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';
import { revokeApiKey, deleteApiKey } from '@/lib/api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
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
    
    const { keyId } = await params;
    const body = await request.json();
    const { action, name } = body;
    
    if (action === 'revoke') {
      await revokeApiKey(keyId, user.id);
      
      return NextResponse.json({
        data: { message: 'API key revoked successfully' },
        meta: { apiVersion: '1.0.0' }
      });
    }
    
    if (action === 'rename' && name) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'validation_error', message: 'Valid name is required' },
          { status: 400 }
        );
      }
      
      if (name.length > 100) {
        return NextResponse.json(
          { error: 'validation_error', message: 'Name must be less than 100 characters' },
          { status: 400 }
        );
      }
      
      const supabase = createClient();
      const { error } = await supabase
        .from('api_keys')
        .update({ name: name.trim() })
        .eq('id', keyId)
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      return NextResponse.json({
        data: { message: 'API key renamed successfully' },
        meta: { apiVersion: '1.0.0' }
      });
    }
    
    return NextResponse.json(
      { error: 'validation_error', message: 'Invalid action or missing parameters' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Update API key error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
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
    
    const { keyId } = await params;
    
    await deleteApiKey(keyId, user.id);
    
    return NextResponse.json({
      data: { message: 'API key deleted successfully' },
      meta: { apiVersion: '1.0.0' }
    });
    
  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}