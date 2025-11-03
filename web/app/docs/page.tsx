'use client';

import { useEffect, useState } from 'react';
import { SwaggerWrapper } from '@/components/ui/swagger-wrapper';
import 'swagger-ui-react/swagger-ui.css';
import '@/styles/swagger-ui-fixes.css';

export default function DocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const response = await fetch('/api/v1/docs');
        if (!response.ok) {
          throw new Error('Failed to fetch API specification');
        }
        const data = await response.json();
        setSpec(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">API Documentation</h1>
          <p className="text-blue-100 text-lg">
            Interactive documentation for the Sensor Tracker Community API
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="bg-white/20 px-3 py-1 rounded-full">
              Version: {spec?.info?.version}
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full">
              OpenAPI 3.0.0
            </div>
            <div className="bg-white/20 px-3 py-1 rounded-full">
              REST API
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Getting Started:</strong> Use the "Authorize" button below to add your API key or JWT token before testing endpoints.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Quick Test:</strong> Try the <code>/api/v1/community/categories</code> endpoint first - it doesn't require authentication.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="swagger-ui-container" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          <SwaggerWrapper 
            spec={spec}
            requestInterceptor={(request: any) => {
              // Add custom headers or modify requests here if needed
              return request;
            }}
            responseInterceptor={(response: any) => {
              // Handle responses here if needed
              return response;
            }}
          />
        </div>
      </div>

      <footer className="bg-gray-50 border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="mb-2">
            Need help? Contact our API support team at{' '}
            <a href="mailto:api@sensortracker.com" className="text-blue-600 hover:underline">
              api@sensortracker.com
            </a>
          </p>
          <p className="text-sm">
            This documentation is automatically generated from our OpenAPI specification.
          </p>
        </div>
      </footer>
    </div>
  );
}