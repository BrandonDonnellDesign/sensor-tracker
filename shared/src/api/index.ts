// API client configuration and endpoints

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

export interface ApiClient {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, data?: any): Promise<T>;
  put<T>(endpoint: string, data?: any): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
  upload<T>(endpoint: string, file: File | Blob, data?: any): Promise<T>;
}

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me'
  },
  
  // Sensors
  SENSORS: {
    LIST: '/sensors',
    CREATE: '/sensors',
    GET: (id: string) => `/sensors/${id}`,
    UPDATE: (id: string) => `/sensors/${id}`,
    DELETE: (id: string) => `/sensors/${id}`
  },
  
  // Photos
  PHOTOS: {
    UPLOAD: '/photos/upload',
    GET: (id: string) => `/photos/${id}`,
    DELETE: (id: string) => `/photos/${id}`,
    BY_SENSOR: (sensorId: string) => `/sensors/${sensorId}/photos`
  },
  
  // Sync
  SYNC: {
    SENSORS: '/sync/sensors',
    PHOTOS: '/sync/photos',
    STATUS: '/sync/status'
  }
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;