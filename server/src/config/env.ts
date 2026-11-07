import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_PATH: z.string().min(1).default('./data/mansa.db'),
  DATABASE_URL: z.string().trim().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  SUPABASE_PUBLIC_STORAGE_BUCKET: z.string().trim().min(1).default('public-assets'),
  SUPABASE_PRIVATE_STORAGE_BUCKET: z.string().trim().min(1).default('mabdeen-private'),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  EMAIL_USER: z.string().trim().optional(),
  EMAIL_PASS: z.string().trim().optional(),
  EMAIL_FROM: z.string().trim().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:');
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;
