import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Pool, type PoolClient } from 'pg';

type SqliteTable = { name: string };
type SqliteForeignKey = { table: string };
type SqliteColumn = { name: string };
type SqliteRow = Record<string, unknown>;

const quoteIdentifier = (identifier: string): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unexpected database identifier: ${identifier}`);
  }
  return `"${identifier}"`;
};

const orderTablesByForeignKeys = (sqlite: DatabaseSync, tables: string[]): string[] => {
  const remaining = new Map<string, Set<string>>();
  const knownTables = new Set(tables);

  for (const table of tables) {
    const foreignKeys = sqlite.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(table)})`).all() as unknown as SqliteForeignKey[];
    remaining.set(table, new Set(foreignKeys.map((key) => key.table).filter((name) => knownTables.has(name))));
  }

  const ordered: string[] = [];
  while (remaining.size) {
    const ready = [...remaining.entries()]
      .filter(([, dependencies]) => dependencies.size === 0)
      .map(([table]) => table)
      .sort();

    if (!ready.length) {
      throw new Error(`SQLite tables contain a foreign key cycle: ${[...remaining.keys()].join(', ')}`);
    }

    for (const table of ready) {
      ordered.push(table);
      remaining.delete(table);
    }
    for (const dependencies of remaining.values()) {
      for (const table of ready) dependencies.delete(table);
    }
  }

  return ordered;
};

const transferTable = async (
  client: PoolClient,
  sqlite: DatabaseSync,
  table: string,
): Promise<number> => {
  const identifier = quoteIdentifier(table);
  const sourceColumns = sqlite.prepare(`PRAGMA table_info(${identifier})`).all() as unknown as SqliteColumn[];
  const targetColumnsResult = await client.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  );
  const targetColumnNames = new Set(targetColumnsResult.rows.map((row) => row.column_name));
  const columns = sourceColumns.map((column) => column.name).filter((column) => targetColumnNames.has(column));

  if (!columns.length) return 0;

  const rows = sqlite.prepare(`SELECT ${columns.map(quoteIdentifier).join(', ')} FROM ${identifier}`).iterate() as Iterable<SqliteRow>;
  const batchSize = 100;
  let batch: SqliteRow[] = [];
  let migratedCount = 0;

  const flushBatch = async (): Promise<void> => {
    if (!batch.length) return;
    const parameters: unknown[] = [];
    const tuples = batch.map((row, rowIndex) => {
      const placeholders = columns.map((column, columnIndex) => {
        parameters.push(row[column]);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    await client.query(
      `INSERT INTO ${identifier} (${columns.map(quoteIdentifier).join(', ')})
       VALUES ${tuples.join(', ')}
       ON CONFLICT DO NOTHING`,
      parameters,
    );
    migratedCount += batch.length;
    batch = [];
  };

  for (const row of rows) {
    batch.push(row);
    if (batch.length === batchSize) await flushBatch();
  }
  await flushBatch();

  return migratedCount;
};

const resetSerialSequences = async (client: PoolClient, tables: string[]): Promise<void> => {
  for (const table of tables) {
    const result = await client.query<{ column_name: string }>(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = $1
          AND column_default LIKE 'nextval(%'`,
      [table],
    );

    for (const { column_name: column } of result.rows) {
      const tableIdentifier = quoteIdentifier(table);
      const columnIdentifier = quoteIdentifier(column);
      await client.query(
        `SELECT setval(
           pg_get_serial_sequence($1, $2),
           COALESCE(MAX(${columnIdentifier}), 1),
           COUNT(*) > 0
         ) FROM ${tableIdentifier}`,
        [`${table}`, column],
      );
    }
  }
};

const main = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');

  const sqlitePath = path.resolve(process.cwd(), process.env.SQLITE_PATH || process.env.DATABASE_PATH || './data/mansa.db');
  const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  const schema = await readFile(schemaPath, 'utf8');
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 15_000,
  });

  try {
    const client = await pool.connect();
    try {
      await client.query(schema);

      const tableRows = sqlite.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      ).all() as unknown as SqliteTable[];
      const tables = orderTablesByForeignKeys(sqlite, tableRows.map((row) => row.name));

      await client.query('BEGIN');
      try {
        for (const table of tables) {
          const count = await transferTable(client, sqlite, table);
          console.log(`Migrated ${table}: ${count} source rows`);
        }
        await resetSerialSequences(client, tables);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      client.release();
    }
  } finally {
    sqlite.close();
    await pool.end();
  }
};

main().catch((error: unknown) => {
  console.error('SQLite to PostgreSQL migration failed:', error);
  process.exitCode = 1;
});
