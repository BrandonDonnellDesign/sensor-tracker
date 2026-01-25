import { NextRequest, NextResponse } from 'next/server';
import { OpenFoodFactsAPI } from '@/lib/api-config';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const barcode = searchParams.get('barcode');

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    // Generate barcode variants
    const generateBarcodeVariants = (barcode: string): string[] => {
      const variants = [barcode];
      
      // Remove leading zeros
      const withoutLeadingZeros = barcode.replace(/^0+/, '');
      if (withoutLeadingZeros !== barcode && withoutLeadingZeros.length > 0) {
        variants.push(withoutLeadingZeros);
      }
      
      // Add leading zeros to make it different standard lengths
      const standardLengths = [8, 12, 13, 14];
      for (const length of standardLengths) {
        if (barcode.length < length) {
          const paddedBarcode = barcode.padStart(length, '0');
          if (!variants.includes(paddedBarcode)) {
            variants.push(paddedBarcode);
          }
        }
      }
      
      // Try without leading zero if it starts with 0
      if (barcode.startsWith('0') && barcode.length > 1) {
        const withoutFirstZero = barcode.substring(1);
        if (!variants.includes(withoutFirstZero)) {
          variants.push(withoutFirstZero);
        }
      }
      
      return variants;
    };

    const barcodeVariants = generateBarcodeVariants(barcode);
    
    // Try different API endpoints
    const apiEndpoints = [
      { name: 'World API v2', getUrl: OpenFoodFactsAPI.productUrl },
      { name: 'US API v2', getUrl: OpenFoodFactsAPI.productUrlUS },
      { name: 'World API v0', getUrl: OpenFoodFactsAPI.productUrlV0 }
    ];
    
    const results = [];
    
    for (const variant of barcodeVariants) {
      for (const endpoint of apiEndpoints) {
        try {
          const url = endpoint.getUrl(variant);
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'CGMTracker/1.0 (https://cgmtracker.com)'
            }
          });
          
          const result = {
            barcode: variant,
            endpoint: endpoint.name,
            url,
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            found: false,
            productName: null,
            error: null
          };
          
          if (response.ok) {
            try {
              const data = await response.json();
              if (data.product && data.status === 1) {
                result.found = true;
                result.productName = data.product.product_name || 'Unknown';
              }
            } catch (jsonError) {
              result.error = 'Invalid JSON response';
            }
          }
          
          results.push(result);
          
          // If we found a product, we can stop here for this variant
          if (result.found) {
            break;
          }
        } catch (error) {
          results.push({
            barcode: variant,
            endpoint: endpoint.name,
            url: endpoint.getUrl(variant),
            status: 0,
            statusText: 'Network Error',
            contentType: null,
            found: false,
            productName: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return NextResponse.json({
      originalBarcode: barcode,
      variants: barcodeVariants,
      results,
      summary: {
        totalAttempts: results.length,
        successfulAttempts: results.filter(r => r.found).length,
        foundProduct: results.find(r => r.found)?.productName || null
      }
    });
  } catch (error) {
    console.error('Error in barcode debug:', error);
    return NextResponse.json(
      { error: 'Failed to debug barcode', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}