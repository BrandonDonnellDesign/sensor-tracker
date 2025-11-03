'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import '@/styles/swagger-ui-fixes.css';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

interface SwaggerWrapperProps {
  spec: any;
  [key: string]: any;
}

export function SwaggerWrapper({ spec, ...props }: SwaggerWrapperProps) {
  const suppressedWarnings = useRef(false);

  useEffect(() => {
    // Suppress React warnings for swagger-ui-react only once
    if (!suppressedWarnings.current && typeof window !== 'undefined') {
      const originalConsoleError = console.error;
      
      console.error = (...args) => {
        // Filter out specific swagger-ui-react warnings
        const message = typeof args[0] === 'string' ? args[0] : '';
        
        // Comprehensive warning suppression for swagger-ui-react
        if (
          message.includes('UNSAFE_componentWillReceiveProps') ||
          message.includes('componentWillReceiveProps') ||
          (message.includes('ModelCollapse') && message.includes('strict mode')) ||
          (message.includes('unsafe-component-lifecycles') && message.includes('ModelCollapse'))
        ) {
          // Completely suppress these warnings - don't call original console.error
          return;
        }
        
        // For all other errors, use the original console.error
        originalConsoleError.apply(console, args);
      };
      
      suppressedWarnings.current = true;
    }

    // Inject CSS directly into the document head
    if (typeof window !== 'undefined') {
      const styleId = 'swagger-ui-text-fix';
      let existingStyle = document.getElementById(styleId);
      
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .swagger-ui * {
            color: #3b4151 !important;
          }
          .swagger-ui .info .title {
            color: #3b4151 !important;
            font-weight: 600 !important;
          }
          .swagger-ui .info .description,
          .swagger-ui .info .description p {
            color: #3b4151 !important;
          }
          .swagger-ui .opblock .opblock-summary-description,
          .swagger-ui .opblock .opblock-summary-path {
            color: #3b4151 !important;
          }
          .swagger-ui .opblock-description-wrapper p {
            color: #3b4151 !important;
          }
          .swagger-ui .parameter__name,
          .swagger-ui .parameter__type {
            color: #3b4151 !important;
          }
          .swagger-ui .response-col_description__inner div {
            color: #3b4151 !important;
          }
          .swagger-ui .model .property,
          .swagger-ui .prop-type {
            color: #3b4151 !important;
          }
          .swagger-ui table thead tr td,
          .swagger-ui table thead tr th,
          .swagger-ui table tbody tr td {
            color: #3b4151 !important;
          }
          .swagger-ui .opblock-tag {
            color: #3b4151 !important;
            font-weight: 600 !important;
          }
          .swagger-ui .tab li {
            color: #3b4151 !important;
          }
          .swagger-ui .btn {
            background: #4990e2 !important;
            color: white !important;
            border: none !important;
          }
          .swagger-ui .btn:hover {
            background: #357abd !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  if (!spec) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading API specification...</div>
      </div>
    );
  }

  return (
    <div className="swagger-ui-wrapper">
      <SwaggerUI 
        spec={spec}
        docExpansion="list"
        defaultModelsExpandDepth={2}
        defaultModelExpandDepth={2}
        displayOperationId={false}
        displayRequestDuration={true}
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
        tryItOutEnabled={true}
        {...props}
      />
    </div>
  );
}