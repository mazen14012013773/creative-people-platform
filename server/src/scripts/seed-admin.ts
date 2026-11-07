import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool, query } from '../config/db';

const BCRYPT_ROUNDS = 12;

const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const main = async (): Promise<void> => {
  const adminName = process.env.ADMIN_NAME?.trim() || 'مدير المنصة';
  const adminEmail = requireEnv('ADMIN_EMAIL').toLowerCase();
  const adminPassword = requireEnv('ADMIN_PASSWORD');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error('ADMIN_EMAIL must be a valid email address');
  }

  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  }

  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  await query(
    `INSERT INTO users (id, name, email, password_hash, role, is_active, is_featured)
     VALUES ($1, $2, $3, $4, 'Admin', 1, 0)
     ON CONFLICT (email) DO UPDATE SET
       name = excluded.name,
       password_hash = excluded.password_hash,
       role = 'Admin',
       is_active = 1,
       updated_at = CURRENT_TIMESTAMP RETURNING id`,
    [randomUUID(), adminName, adminEmail, passwordHash],
  );

  const admin = (await query('SELECT id, email, role FROM users WHERE email = $1', [adminEmail])).rows[0] as { id: string; email: string; role: string } | undefined;

  if (!admin) {
    throw new Error('Admin account could not be created');
  }

  console.log(`Admin account ready: ${admin.email} (${admin.id})`);
  console.log('Keep ADMIN_PASSWORD safe and remove it from shared environments.');
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
