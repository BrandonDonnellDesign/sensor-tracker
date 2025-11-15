import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = process.env.EXTENSION_JWT_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  try {
    // Verify authorization token
    const auth = req.headers.get('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = auth.replace('Bearer ', '');
    let decoded: any;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error('JWT verification failed:', err);
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    const userId = decoded.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${userId}/${timestamp}_glooko.zip`;

    console.log(`Uploading Glooko file for user ${userId}: ${filename}`);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('glooko')
      .upload(filename, buffer, {
        contentType: file.type || 'application/zip',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: 'Upload failed', details: uploadError.message },
        { status: 500 }
      );
    }

    // Create database record
    const { data: uploadRecord, error: dbError } = await supabase
      .from('glooko_uploads')
      .insert({
        user_id: userId,
        path: filename,
        filename: (file as File).name || 'glooko_export.zip',
        size: buffer.length,
        status: 'uploaded',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('glooko').remove([filename]);
      return NextResponse.json(
        { error: 'Failed to create upload record', details: dbError.message },
        { status: 500 }
      );
    }

    console.log(`Successfully uploaded Glooko file: ${uploadRecord.id}`);

    return NextResponse.json({
      ok: true,
      path: filename,
      uploadId: uploadRecord.id,
      message: 'File uploaded successfully. Processing will begin shortly.',
    });
  } catch (error) {
    console.error('Glooko upload error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
