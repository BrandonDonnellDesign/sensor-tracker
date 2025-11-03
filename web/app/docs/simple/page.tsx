'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SimpleDocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const response = await fetch('/api/v1/docs');
        const data = await response.json();
        setSpec(data);
      } catch (err) {
        console.error('Failed to fetch API spec:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-xl text-blue-100 mb-6">
            {spec?.info?.description || 'Community API for Sensor Tracker'}
          </p>
          <div className="flex gap-4">
            <Link 
              href="/docs" 
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Interactive Docs
            </Link>
            <a 
              href="/api/v1/docs" 
              className="bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenAPI Spec
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Base URL</h3>
                <code className="bg-gray-100 px-3 py-1 rounded text-sm">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1
                </code>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Authentication</h3>
                <p className="text-gray-600 mb-2">Include your API key in the request header:</p>
                <code className="bg-gray-100 px-3 py-1 rounded text-sm block">
                  X-API-Key: your-api-key-here
                </code>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {spec?.paths && Object.entries(spec.paths).map(([path, methods]) => (
              <div key={path} className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  <code className="text-blue-600">{path}</code>
                </h3>
                
                {Object.entries(methods as any).map(([method, details]: [string, any]) => (
                  <div key={method} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                        method === 'get' ? 'bg-green-100 text-green-800' :
                        method === 'post' ? 'bg-blue-100 text-blue-800' :
                        method === 'put' ? 'bg-yellow-100 text-yellow-800' :
                        method === 'delete' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {method}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {details.summary}
                      </span>
                    </div>
                    
                    {details.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {details.description}
                      </p>
                    )}
                    
                    {details.parameters && details.parameters.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Parameters: {(details as any).parameters.map((p: any) => p.name).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-blue-900 mb-3">Example Request</h2>
            <pre className="bg-blue-900 text-blue-100 p-4 rounded text-sm overflow-x-auto">
{`curl -H "X-API-Key: your-key" \\
  "${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1/community/tips?limit=5"`}
            </pre>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              For full interactive documentation with request testing:
            </p>
            <Link 
              href="/docs" 
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Interactive Docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}