import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * POST /api/v1/glooko/upload
 * 
 * Upload a Glooko export ZIP file for automatic processing
 * 
 * Authentication: Bearer token (API key or JWT)
 * Content-Type: multipart/form-data
 * 
 * Form fields:
 * - file: ZIP file containing Glooko export data
 * 
 * Response:
 * {
 *   "success": true,
 *   "uploadId": "uuid",
 *   "filename": "glooko_export.zip",
 *   "status": "processing",
 *   "message": "File uploaded and processing started"
 * }
 * 
 * Example using curl:
 * curl -X POST https://your-domain.com/api/v1/glooko/upload \
 *   -H "Authorization: Bearer YOUR_API_KEY" \
 *   -F "file=@/path/to/glooko_export.zip"
 * 
 * Example using JavaScript:
 * const formData = new FormData();
 * formData.append('file', fileInput.files[0]);
 * 
 * const response = await fetch('/api/v1/glooko/upload', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer YOUR_API_KEY'
 *   },
 *   body: formData
 * });
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user - support both session auth and API key
    const supabase = await createClient();
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Try session auth first
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // Get auth header for potential API key auth
    const authHeader = req.headers.get('authorization');

    // If session auth fails, try API key from Authorization header
    if (authError || !user) {
      if (authHeader?.startsWith('Bearer ')) {
        const apiKey = authHeader.substring(7);
        
        // Hash the API key for lookup
        const crypto = await import('crypto');
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        
        // Look up user by API key hash (use admin client to bypass RLS)
        const { data: apiKeyData, error: apiKeyError } = await supabaseAdmin
          .from('api_keys')
          .select('user_id, is_active, expires_at')
          .eq('key_hash', keyHash)
          .eq('is_active', true)
          .maybeSingle();

        if (!apiKeyError && apiKeyData) {
          // Check if key is expired
          if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
            return NextResponse.json(
              { 
                success: false,
                error: 'Unauthorized',
                message: 'API key has expired'
              },
              { status: 401 }
            );
          }
          
          // Update last_used_at (use admin client to bypass RLS)
          await supabaseAdmin
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('key_hash', keyHash);
          
          user = { id: apiKeyData.user_id } as any;
        }
      }
    }

    if (!user) {
      
      // Provide helpful error message based on what was attempted
      let message = 'Authentication required.';
      if (authHeader?.startsWith('Bearer ')) {
        message = 'Invalid or expired API key. Please generate a new API key in Settings → API Keys, or check that you copied the full key (starts with sk_).';
      } else {
        message = 'Please log in or provide a valid API key in the Authorization header (Bearer sk_...). Generate API keys in Settings → API Keys.';
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          message
        },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No file provided',
          message: 'Please provide a ZIP file in the "file" field'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = (file as File).name || 'unknown';
    if (!fileName.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid file type',
          message: 'Only ZIP files are accepted'
        },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          success: false,
          error: 'File too large',
          message: 'Maximum file size is 50MB'
        },
        { status: 400 }
      );
    }

    // Forward to the existing Glooko import endpoint with internal auth header
    const importFormData = new FormData();
    importFormData.append('file', file, fileName);

    // Call the internal import API with special internal auth header
    const importResponse = await fetch(`${req.nextUrl.origin}/api/insulin/import/glooko`, {
      method: 'POST',
      body: importFormData,
      headers: {
        'x-internal-user-id': user.id, // Internal header for API-authenticated requests
        'x-internal-auth': process.env.SUPABASE_SERVICE_ROLE_KEY || '', // Verify it's an internal call
      },
    });

    const importResult = await importResponse.json();

    if (!importResponse.ok) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Import failed',
          message: importResult.error || 'Failed to process Glooko data',
          details: importResult
        },
        { status: 500 }
      );
    }

    // Return success response with import stats
    return NextResponse.json({
      success: true,
      filename: fileName,
      size: file.size,
      imported: importResult.imported || 0,
      skipped: importResult.skipped || 0,
      duplicates: importResult.duplicates || 0,
      basalImported: importResult.basalImported || 0,
      basalDuplicates: importResult.basalDuplicates || 0,
      message: 'File processed successfully',
      details: importResult
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}



// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
