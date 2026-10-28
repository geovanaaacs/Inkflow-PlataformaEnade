import sql from "mssql/msnodesqlv8.js";
import { env } from "../config/env.js";

/*
 * SQL Server connection via ODBC (msnodesqlv8): Windows authentication and
 * shared memory, so the local server works as installed (no TCP, no SQL login).
 */

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getPool(): Promise<sql.ConnectionPool> {
  // msnodesqlv8 takes the raw ODBC connection string (not in @types/mssql).
  const config = { connectionString: env.DB_CONNECTION_STRING } as unknown as sql.config;
  poolPromise ??= new sql.ConnectionPool(config)
    .connect()
    .catch((error: unknown) => {
      poolPromise = null; // allow a retry on the next request
      throw error;
    });
  return poolPromise;
}

export type QueryInputs = Record<string, unknown>;

function bind(request: sql.Request, inputs: QueryInputs): sql.Request {
  for (const [name, value] of Object.entries(inputs)) request.input(name, value);
  return request;
}

/** Runs a parameterized statement (`@name` placeholders) and returns its rows. */
export async function query<T>(statement: string, inputs: QueryInputs = {}): Promise<T[]> {
  const request = bind((await getPool()).request(), inputs);
  const result = await request.query<T>(statement);
  return result.recordset ?? [];
}

export async function queryOne<T>(statement: string, inputs: QueryInputs = {}): Promise<T | null> {
  const rows = await query<T>(statement, inputs);
  return rows[0] ?? null;
}

/** Runs several statements atomically. `run` behaves like `query`, inside the transaction. */
export async function withTransaction<T>(
  work: (run: <R>(statement: string, inputs?: QueryInputs) => Promise<R[]>) => Promise<T>
): Promise<T> {
  const transaction = new sql.Transaction(await getPool());
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const result = await work(async <R>(statement: string, inputs: QueryInputs = {}) => {
      const response = await bind(new sql.Request(transaction), inputs).query<R>(statement);
      return response.recordset ?? [];
    });
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (!poolPromise) return;
  const pool = await poolPromise.catch(() => null);
  poolPromise = null;
  await pool?.close();
}

/** Local calendar day in Brasília, the same rule as UserAnswers.AnsweredOn. */
export const TODAY_SQL = "CONVERT(DATE, SYSDATETIMEOFFSET() AT TIME ZONE 'E. South America Standard Time')";
