import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { getClient, query } from '../config/db';
import { privateChatFilesDir, privateParentVerificationDir, privateReportEvidenceDir, privateVaultDir, uploadsDir, uploadsTempDir } from '../config/paths';
import { recordAdminAudit } from '../models/admin.model';
import { AppError } from '../utils/app-error';
import { invalidateStatusCache } from './system.service';

const BACKUP_VERSION = 1;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_RESTORE_BYTES = 50 * 1024 * 1024;
interface BackupPayload { meta: { platform: 'mabdeen'; version: number; createdAt: string; tables: Record<string, number> }; tables: Record<string, Array<Record<string, unknown>>> }

const quote = (identifier: string): string => {
  if (!IDENTIFIER.test(identifier)) throw new AppError('Invalid identifier in backup', 422);
  return `"${identifier}"`;
};
const listTables = async (): Promise<string[]> => {
  const result = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name");
  return (result.rows as Array<{ table_name: string }>).map((row) => row.table_name).filter((name) => IDENTIFIER.test(name));
};
const tableColumns = async (table: string): Promise<string[]> => {
  const result = await query('SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position', ['public', table]);
  return (result.rows as Array<{ column_name: string }>).map((row) => row.column_name);
};

export const buildBackup = async (): Promise<BackupPayload> => {
  const tables: BackupPayload['tables'] = {};
  for (const table of await listTables()) tables[table] = (await query(`SELECT * FROM ${quote(table)}`)).rows as Array<Record<string, unknown>>;
  return { meta: { platform: 'mabdeen', version: BACKUP_VERSION, createdAt: new Date().toISOString(), tables: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])) }, tables };
};
export const buildBackupFilename = (date = new Date()): string => `mabdeen-backup-${date.toISOString().slice(0, 10)}.json`;
const parseBackupFile = (raw: Buffer): BackupPayload => {
  if (raw.byteLength > MAX_RESTORE_BYTES) throw new AppError('Backup file exceeds the allowed size', 413);
  let parsed: unknown;
  try { parsed = JSON.parse(raw.toString('utf8')); } catch { throw new AppError('Backup file is not valid JSON', 422); }
  if (!parsed || typeof parsed !== 'object' || !('tables' in parsed) || !parsed.tables || typeof parsed.tables !== 'object' || Array.isArray(parsed.tables)) throw new AppError('Invalid backup structure', 422);
  return parsed as BackupPayload;
};
export interface RestoreResult { restored: Record<string, number>; skippedTables: string[]; droppedColumns: string[] }
export const restoreBackup = async (adminId: string, file: Buffer, reason: string): Promise<RestoreResult> => {
  const payload = parseBackupFile(file);
  const existing = new Set(await listTables());
  const prepared: Array<{ table: string; rows: Array<Record<string, unknown>>; columns: string[] }> = [];
  const skippedTables: string[] = [];
  const droppedColumns: string[] = [];
  for (const [table, rows] of Object.entries(payload.tables)) {
    if (!existing.has(table) || !IDENTIFIER.test(table) || !Array.isArray(rows)) { skippedTables.push(table); continue; }
    const columns = await tableColumns(table);
    for (const row of rows) for (const column of Object.keys(row)) if (!columns.includes(column)) droppedColumns.push(`${table}.${column}`);
    prepared.push({ table, rows, columns: columns.filter((column) => rows.some((row) => Object.hasOwn(row, column))) });
  }
  if (!prepared.length) throw new AppError('No restorable tables found', 422);
  const client = await getClient();
  const restored: Record<string, number> = {};
  try {
    await client.query('BEGIN');
    await client.query('SET CONSTRAINTS ALL DEFERRED');
    for (const { table, rows, columns } of prepared) {
      await client.query(`DELETE FROM ${quote(table)}`);
      if (rows.length && !columns.length) throw new AppError(`No compatible columns in ${table}`, 422);
      for (const row of rows) {
        const values = columns.map((column) => row[column] === undefined ? null : row[column]);
        await client.query(`INSERT INTO ${quote(table)} (${columns.map(quote).join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})`, values);
      }
      restored[table] = rows.length;
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  await recordAdminAudit(adminId, 'system_restore', 'system', 'database', reason, { tables: Object.keys(restored).length, rows: Object.values(restored).reduce((sum, n) => sum + n, 0), skippedTables, droppedColumns });
  invalidateStatusCache();
  return { restored, skippedTables, droppedColumns };
};

const clearDirectory = async (directory: string, preserve = new Set<string>()): Promise<number> => {
  const resolved = path.resolve(directory);
  if (resolved === path.parse(resolved).root || resolved === path.resolve(process.cwd())) throw new AppError('Unsafe cleanup path', 500);
  let entries;
  try { entries = await readdir(resolved, { withFileTypes: true }); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0; throw error; }
  let removed = 0;
  for (const entry of entries) {
    if (preserve.has(entry.name)) continue;
    const target = path.resolve(resolved, entry.name);
    if (!target.startsWith(`${resolved}${path.sep}`)) throw new AppError('Unsafe cleanup path', 500);
    await rm(target, { recursive: true, force: true }); removed++;
  }
  return removed;
};
const clearUploadedFiles = async (adminIds: Set<string>) => {
  let removedEntries = 0; const errors: string[] = [];
  for (const [dir, preserve] of [[uploadsTempDir, new Set<string>()], [privateChatFilesDir, new Set<string>()], [privateVaultDir, new Set<string>()], [privateReportEvidenceDir, new Set<string>()], [privateParentVerificationDir, new Set<string>()], [uploadsDir, new Set(['avatars'])], [path.join(uploadsDir, 'avatars'), adminIds]] as Array<[string, Set<string>]>) {
    try { removedEntries += await clearDirectory(dir, preserve); } catch (error) { errors.push(`${dir}: ${error instanceof Error ? error.message : 'cleanup failed'}`); }
  }
  return { removedEntries, errors };
};
const RESET_SEED_MARKER = '__platform_data_reset';
export const resetOperationalData = async (adminId: string, reason: string) => {
  const tables = await listTables();
  const adminIds = new Set(((await query("SELECT id FROM users WHERE role = 'Admin'")).rows as Array<{ id: string }>).map((row) => row.id));
  const client = await getClient(); const deleted: Record<string, number> = {};
  try {
    await client.query('BEGIN'); await client.query('SET CONSTRAINTS ALL DEFERRED');
    for (const table of tables) { if (table === 'users') continue; deleted[table] = (await client.query(`DELETE FROM ${quote(table)}`)).rowCount ?? 0; }
    deleted.users = (await client.query("DELETE FROM users WHERE role <> 'Admin'")).rowCount ?? 0;
    await client.query('INSERT INTO app_settings (key, value, updated_by) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by', [RESET_SEED_MARKER, '1', adminId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  await recordAdminAudit(adminId, 'system_reset_data', 'system', 'database', reason, { deleted });
  const files = await clearUploadedFiles(adminIds); invalidateStatusCache();
  const keptAdmins = Number((await query("SELECT COUNT(*) AS total FROM users WHERE role = 'Admin'")).rows[0]?.total ?? 0);
  return { deleted, files, keptAdmins };
};
