import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { asyncHandler } from '@/lib/api-error-handler';
import { dexcomSyncSchema } from '@/lib/validation-schemas';

export const POST = asyncHandler(async (request: NextRequest) => {
  const body = await request.json();
  
  // Validate request body
  const { userId } = dexcomSyncSchema.parse(body);
    
    // Use service role to bypass RLS
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Call the sync function
    const { data, error } = await supabase.rpc('sync_dexcom_user', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Error syncing Dexcom data:', error);
      return NextResponse.json(
        { error: 'Failed to sync Dexcom data', details: error.message },
        { status: 500 }
      );
    }
    
    const result = data as any;
    
    // Check if token needs refresh
    if (!result.success && (result.error_code === 'TOKEN_EXPIRED' || result.error_code === 'TOKEN_EXPIRED_API')) {
      console.log('Token expired, attempting automatic refresh...');
      
      try {
        // Call the token refresh edge function
        const refreshResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dexcom-refresh-token`,
          {
            method: 'POST',
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
          }
        );
        
        const refreshResult = await refreshResponse.json();
        
        if (refreshResponse.ok && refreshResult.success) {
          console.log('Token refreshed successfully, retrying sync...');
          
          // Retry the sync with refreshed token
          const { data: retryData, error: retryError } = await supabase.rpc('sync_dexcom_user', {
            p_user_id: userId
          });
          
          if (retryError) {
            console.error('Error on retry sync:', retryError);
            return NextResponse.json(
              { error: 'Failed to sync after token refresh', details: retryError.message },
              { status: 500 }
            );
          }
          
          const retryResult = retryData as any;
          
          if (!retryResult.success) {
            return NextResponse.json(
              { error: retryResult.error || 'Sync failed after token refresh' },
              { status: 400 }
            );
          }
          
          // Add flag to indicate token was refreshed
          retryResult.token_auto_refreshed = true;
          
          return NextResponse.json(retryResult);
        } else {
          console.error('Token refresh failed:', refreshResult);
          return NextResponse.json(
            { 
              error: 'Token expired and refresh failed', 
              details: refreshResult.error,
              needs_manual_refresh: true 
            },
            { status: 401 }
          );
        }
      } catch (refreshError) {
        console.error('Error during token refresh:', refreshError);
        return NextResponse.json(
          { 
            error: 'Token expired and refresh attempt failed', 
            details: refreshError instanceof Error ? refreshError.message : 'Unknown error',
            needs_manual_refresh: true 
          },
          { status: 401 }
        );
      }
    }
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result);
});
