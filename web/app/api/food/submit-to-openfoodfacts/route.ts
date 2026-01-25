import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { barcode, productData, imageUrl } = await request.json();

    if (!barcode || !productData) {
      return NextResponse.json(
        { error: 'Barcode and product data are required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Prepare the form data for OpenFoodFacts API
    const formData = new FormData();
    
    // Add all product data fields
    Object.entries(productData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value.toString());
      }
    });

    // Add image if provided
    if (imageUrl) {
      try {
        // Download the image from our storage
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          formData.append('image_front', imageBlob, 'product_image.jpg');
        }
      } catch (imageError) {
        console.warn('Could not attach image to OpenFoodFacts submission:', imageError);
        // Continue without image
      }
    }

    // Submit to OpenFoodFacts API
    const offResponse = await fetch('https://world.openfoodfacts.org/cgi/product_jqm2.pl', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'CGMTracker/1.0 (https://cgmtracker.com)',
      },
    });

    if (!offResponse.ok) {
      throw new Error(`OpenFoodFacts API error: ${offResponse.status} ${offResponse.statusText}`);
    }

    const result = await offResponse.text();
    
    // OpenFoodFacts returns various responses, check for success indicators
    const isSuccess = result.includes('Product saved') || 
                     result.includes('status_verbose') || 
                     offResponse.status === 200;

    if (isSuccess) {
      // Log the successful submission
      await supabase
        .from('openfoodfacts_submissions')
        .insert({
          user_id: user.id,
          barcode,
          product_name: productData.product_name,
          submission_status: 'success',
          response_data: { result: result.substring(0, 1000) } // Truncate response
        })
        .catch(err => console.warn('Could not log OpenFoodFacts submission:', err));

      return NextResponse.json({
        success: true,
        message: `Product successfully submitted to OpenFoodFacts! It should be available for barcode scanning within a few hours.`,
        barcode,
        offUrl: `https://world.openfoodfacts.org/product/${barcode}`
      });
    } else {
      throw new Error('OpenFoodFacts submission failed');
    }
  } catch (error) {
    console.error('Error submitting to OpenFoodFacts:', error);
    
    // Log the failed submission
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('openfoodfacts_submissions')
          .insert({
            user_id: user.id,
            barcode: request.body ? JSON.parse(await request.text()).barcode : 'unknown',
            submission_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .catch(err => console.warn('Could not log failed OpenFoodFacts submission:', err));
      }
    } catch (logError) {
      console.warn('Could not log OpenFoodFacts submission error:', logError);
    }

    return NextResponse.json(
      { 
        error: 'Failed to submit to OpenFoodFacts', 
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'Your product was saved locally, but could not be submitted to OpenFoodFacts. You can try submitting manually later.'
      },
      { status: 500 }
    );
  }
}