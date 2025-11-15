/**
 * Environment variable validation
 * Run this at application startup to ensure all required variables are set
 */

interface EnvConfig {
  required: string[];
  optional: string[];
}

const envConfig: EnvConfig = {
  required: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'ENCRYPTION_KEY',
  ],
  optional: [
    'SUPABASE_SERVICE_ROLE_KEY',
    'DEXCOM_CLIENT_ID',
    'DEXCOM_CLIENT_SECRET',
    'DEXCOM_REDIRECT_URI',
    'MYFITNESSPAL_CLIENT_ID',
    'MYFITNESSPAL_CLIENT_SECRET',
    'NEXT_PUBLIC_SITE_URL',
    'CRON_SECRET',
  ],
};

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Validate required environment variables
 * @throws {EnvValidationError} if required variables are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of envConfig.required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check optional but recommended variables
  for (const key of envConfig.optional) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  // Throw error if required variables are missing
  if (missing.length > 0) {
    throw new EnvValidationError(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n\n` +
      `Please check your .env.local file and ensure all required variables are set.`
    );
  }

  // Log warnings for optional variables (only in development)
  if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️  Optional environment variables not set:\n' +
      warnings.map(k => `  - ${k}`).join('\n')
    );
  }

  // Validate encryption key length
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
    throw new EnvValidationError(
      'ENCRYPTION_KEY must be at least 32 characters long for security'
    );
  }

  // Validate URLs
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    } catch {
      throw new EnvValidationError(
        'NEXT_PUBLIC_SUPABASE_URL must be a valid URL'
      );
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully');
  }
}

/**
 * Get environment variable with type safety
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  
  if (!value && !defaultValue) {
    throw new EnvValidationError(`Environment variable ${key} is not set`);
  }
  
  return value || defaultValue!;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}
