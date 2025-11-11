'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import 'swagger-ui-react/swagger-ui.css';
import './swagger-custom.css';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

// Suppress known React warnings from swagger-ui-react
// The library uses deprecated lifecycle methods (UNSAFE_componentWillReceiveProps)
// This is a known issue: https://github.com/swagger-api/swagger-ui/issues/7101
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('UNSAFE_componentWillReceiveProps')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/docs')
      .then(res => res.json())
      .then(data => {
        setSpec(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-2">⚠️ Error Loading Documentation</div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">CGM Tracker API Documentation</h1>
          <p className="text-blue-100">
            Interactive API documentation powered by Swagger UI
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <a 
              href="/" 
              className="text-blue-100 hover:text-white underline"
            >
              ← Back to App
            </a>
            <a 
              href="/api/v1/docs" 
              target="_blank"
              className="text-blue-100 hover:text-white underline"
            >
              View Raw JSON
            </a>
          </div>
        </div>
      </div>

      {/* Swagger UI */}
      <div className="swagger-container">
        {spec && <SwaggerUI spec={spec} />}
      </div>

      <style jsx global>{`
        .swagger-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        
        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
          .swagger-container {
            background: #111827;
          }
          
          .swagger-ui {
            filter: invert(0.9) hue-rotate(180deg);
          }
          .swagger-ui .scheme-container {
            filter: invert(1) hue-rotate(180deg);
          }
        }
      `}</style>
    </div>
  );
}
