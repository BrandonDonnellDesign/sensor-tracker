/**
 * Database schema types and interfaces
 */

// Database table schemas
export interface UserTable {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
  last_sync_at?: Date;
}

export interface SensorTable {
  id: string;
  user_id: string;
  serial_number: string;
  lot_number: string;
  date_added: Date;
  is_problematic: boolean;
  issue_notes?: string;
  created_at: Date;
  updated_at: Date;
  synced_at?: Date;
  is_deleted: boolean;
}

export interface PhotoTable {
  id: string;
  sensor_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  cloud_url?: string;
  date_added: Date;
  created_at: Date;
  updated_at: Date;
  synced_at?: Date;
  is_deleted: boolean;
}

// Database query interfaces
export interface DatabaseQuery {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  where?: Record<string, any>;
  data?: Record<string, any>;
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  offset?: number;
}

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T[];
  count?: number;
  error?: string;
}

// Migration interfaces
export interface Migration {
  id: string;
  name: string;
  version: number;
  up: string; // SQL for applying migration
  down: string; // SQL for rolling back migration
  createdAt: Date;
}

export interface MigrationStatus {
  currentVersion: number;
  pendingMigrations: Migration[];
  appliedMigrations: Migration[];
}

// Connection interfaces
export interface DatabaseConfig {
  type: 'postgresql' | 'sqlite' | 'indexeddb';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
}

export interface DatabaseConnection {
  config: DatabaseConfig;
  isConnected: boolean;
  lastActivity: Date;
  query<T = any>(sql: string, params?: any[]): Promise<DatabaseResult<T>>;
  transaction<T = any>(queries: DatabaseQuery[]): Promise<DatabaseResult<T>>;
  close(): Promise<void>;
}

// Index definitions for performance
export interface DatabaseIndex {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
  partial?: string; // WHERE clause for partial index
}

export const DATABASE_INDEXES: DatabaseIndex[] = [
  {
    name: 'idx_sensors_user_id',
    table: 'sensors',
    columns: ['user_id']
  },
  {
    name: 'idx_sensors_updated_at',
    table: 'sensors',
    columns: ['updated_at']
  },
  {
    name: 'idx_sensors_serial_number',
    table: 'sensors',
    columns: ['serial_number']
  },
  {
    name: 'idx_photos_sensor_id',
    table: 'photos',
    columns: ['sensor_id']
  },
  {
    name: 'idx_photos_updated_at',
    table: 'photos',
    columns: ['updated_at']
  },
  {
    name: 'idx_users_email',
    table: 'users',
    columns: ['email'],
    unique: true
  }
];