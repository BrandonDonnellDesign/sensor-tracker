import { z } from 'zod';

// Common validation patterns
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const uuidSchema = z.string().uuid('Invalid UUID format');

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Sensor schemas
export const sensorSchema = z.object({
  serial_number: z.string().min(1, 'Serial number is required'),
  date_added: z.string().datetime('Invalid date format'),
  location: z.string().optional(),
  notes: z.string().optional(),
  sensor_model_id: uuidSchema.optional(),
  is_problematic: z.boolean().default(false),
});

export const updateSensorSchema = sensorSchema.partial();

// Food logging schemas
export const foodLogSchema = z.object({
  food_item_id: uuidSchema,
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  logged_at: z.string().datetime('Invalid date format').optional(),
  notes: z.string().optional(),
});

// Admin schemas
export const systemHealthActionSchema = z.object({
  actionId: z.enum([
    'cleanup_old_logs',
    'cleanup_expired_sessions', 
    'optimize_database',
    'backup_database',
    'reset_analytics'
  ]),
});

// Dexcom sync schemas
export const dexcomSyncSchema = z.object({
  userId: uuidSchema,
});

// Profile update schemas
export const profileUpdateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  date_format: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MMM DD, YYYY']).optional(),
  time_format: z.enum(['12', '24']).optional(),
  timezone: z.string().optional(),
});

// Notification schemas
export const notificationSchema = z.object({
  type: z.string().min(1, 'Notification type is required'),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  user_id: uuidSchema.optional(),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Search schemas
export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['sensors', 'food', 'all']).default('all'),
  ...paginationSchema.shape,
});

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
});

// Validation helper functions
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateRequestSafe<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Type exports for use in components
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SensorInput = z.infer<typeof sensorSchema>;
export type FoodLogInput = z.infer<typeof foodLogSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;