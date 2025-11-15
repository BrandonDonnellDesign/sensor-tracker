import { NextResponse } from 'next/server';
import { logger } from './logger';

export interface ApiErrorResponse {
  error: string;
  message?: string;
  timestamp: string;
  code?: string;
}

/**
 * Standardized API error response
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
    ...(code && { code }),
  };

  // Log errors (but not client errors like 400, 401, 404)
  if (status >= 500) {
    logger.error('API Error:', { status, message, code });
  }

  return NextResponse.json(response, { status });
}

/**
 * Common API error responses
 */
export const ApiErrors = {
  unauthorized: () => apiError('Unauthorized', 401, 'UNAUTHORIZED'),
  forbidden: () => apiError('Forbidden', 403, 'FORBIDDEN'),
  notFound: (resource?: string) => 
    apiError(resource ? `${resource} not found` : 'Not found', 404, 'NOT_FOUND'),
  badRequest: (message: string) => apiError(message, 400, 'BAD_REQUEST'),
  internalError: (message: string = 'Internal server error') => 
    apiError(message, 500, 'INTERNAL_ERROR'),
  databaseError: (message: string = 'Database error') => 
    apiError(message, 500, 'DATABASE_ERROR'),
  validationError: (message: string) => apiError(message, 422, 'VALIDATION_ERROR'),
};

/**
 * Success response helper
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}
