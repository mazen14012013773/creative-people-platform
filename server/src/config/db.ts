import 'dotenv/config';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to connect to PostgreSQL.');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

export const query = async <Row extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[],
): Promise<QueryResult<Row>> => pool.query<Row>(text, params);

export const getClient = async (): Promise<PoolClient> => pool.connect();

