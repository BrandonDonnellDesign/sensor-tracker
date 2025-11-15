/**
 * API Configuration
 * Centralized configuration for external API endpoints
 */



/**
 * Dexcom API Configuration
 */
export const DexcomAPI = {
  // Base URLs
  baseUrl: process.env.DEXCOM_API_BASE_URL || 'https://api.dexcom.com/v3',
  authBaseUrl: process.env.DEXCOM_AUTH_BASE_URL || 'https://api.dexcom.com/v2',
  
  // OAuth endpoints
  tokenUrl: `${process.env.DEXCOM_AUTH_BASE_URL || 'https://api.dexcom.com/v2'}/oauth2/token`,
  authorizeUrl: `${process.env.DEXCOM_AUTH_BASE_URL || 'https://api.dexcom.com/v2'}/oauth2/login`,
  
  // Data endpoints
  glucoseReadingsUrl: (startDate: string, endDate: string) => 
    `${process.env.DEXCOM_API_BASE_URL || 'https://api.dexcom.com/v3'}/users/self/egvs?startDate=${startDate}&endDate=${endDate}`,
  
  // Credentials
  clientId: process.env.DEXCOM_CLIENT_ID,
  clientSecret: process.env.DEXCOM_CLIENT_SECRET,
  redirectUri: process.env.DEXCOM_REDIRECT_URI,
  
  // Check if configured
  isConfigured: () => !!(
    process.env.DEXCOM_CLIENT_ID && 
    process.env.DEXCOM_CLIENT_SECRET && 
    process.env.DEXCOM_REDIRECT_URI
  ),
} as const;

/**
 * OpenFoodFacts API Configuration
 */
export const OpenFoodFactsAPI = {
  // Base URLs
  worldBaseUrl: 'https://world.openfoodfacts.org',
  usBaseUrl: 'https://us.openfoodfacts.org',
  
  // Endpoints
  searchUrl: (query: string, pageSize: number = 20) => 
    `https://us.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page_size=${pageSize}&json=true&sort_by=popularity`,
  
  productUrl: (barcode: string) => 
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
  
  // No authentication required for OpenFoodFacts
  isConfigured: () => true,
} as const;

/**
 * MyFitnessPal API Configuration
 */
export const MyFitnessPalAPI = {
  // Base URL
  baseUrl: process.env.MYFITNESSPAL_API_BASE_URL || 'https://api.myfitnesspal.com',
  
  // OAuth endpoints
  tokenUrl: process.env.MYFITNESSPAL_TOKEN_URL || 'https://api.myfitnesspal.com/oauth2/token',
  authorizeUrl: process.env.MYFITNESSPAL_AUTHORIZE_URL || 'https://www.myfitnesspal.com/oauth2/authorize',
  
  // Credentials
  clientId: process.env.MYFITNESSPAL_CLIENT_ID,
  clientSecret: process.env.MYFITNESSPAL_CLIENT_SECRET,
  redirectUri: process.env.MYFITNESSPAL_REDIRECT_URI,
  
  // Check if configured
  isConfigured: () => !!(
    process.env.MYFITNESSPAL_CLIENT_ID && 
    process.env.MYFITNESSPAL_CLIENT_SECRET && 
    process.env.MYFITNESSPAL_REDIRECT_URI
  ),
} as const;

/**
 * FreeStyle Libre API Configuration
 */
export const FreeStyleAPI = {
  // Base URL
  baseUrl: process.env.FREESTYLE_API_BASE_URL || 'https://api.libreview.io',
  
  // Endpoints
  loginUrl: `${process.env.FREESTYLE_API_BASE_URL || 'https://api.libreview.io'}/llu/auth/login`,
  connectionsUrl: `${process.env.FREESTYLE_API_BASE_URL || 'https://api.libreview.io'}/llu/connections`,
  
  // Check if configured (no OAuth, uses username/password)
  isConfigured: () => true,
} as const;

/**
 * Internal API Configuration
 */
export const InternalAPI = {
  // Site URL
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  
  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  
  // Check if configured
  isConfigured: () => !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
} as const;

/**
 * Get all API configuration status
 */
export function getAPIConfigStatus() {
  return {
    dexcom: DexcomAPI.isConfigured(),
    openFoodFacts: OpenFoodFactsAPI.isConfigured(),
    myFitnessPal: MyFitnessPalAPI.isConfigured(),
    freeStyle: FreeStyleAPI.isConfigured(),
    internal: InternalAPI.isConfigured(),
  };
}

/**
 * Check if all required APIs are configured
 */
export function areRequiredAPIsConfigured(): boolean {
  return InternalAPI.isConfigured();
}
