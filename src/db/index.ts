import { SCHEMA_SQL } from './schema.js';

/**
 * Capa de datos mínima con dos backends:
 *  - Postgres real (pg) vía DATABASE_URL — producción (Supabase/Vercel).
 *  - PGlite (Postgres embebido, WASM) — desarrollo local y tests, sin servidor.
 * Mismo dialecto SQL y mismos placeholders ($1, $2...) en ambos.
 */
export interface DB {
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
}

export async function openDb(databaseUrl?: string, pgliteDir?: string): Promise<DB> {
  if (databaseUrl) {
    const { default: pg } = await import('pg');
    // BIGINT (OID 20) llega como string por defecto: lo queremos como number.
    pg.types.setTypeParser(20, (v: string) => parseInt(v, 10));
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 1, // serverless: una conexión por instancia; el pooler de Supabase multiplexa
      ssl: databaseUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
    });
    const db: DB = {
      query: async (text, params) => {
        const res = await pool.query(text, params);
        return { rows: res.rows as any[] };
      },
      close: () => pool.end(),
    };
    await db.query(SCHEMA_SQL);
    return db;
  }

  const { PGlite } = await import('@electric-sql/pglite');
  if (pgliteDir) {
    const fs = await import('node:fs');
    fs.mkdirSync(pgliteDir, { recursive: true });
  }
  const lite = pgliteDir ? new PGlite(pgliteDir) : new PGlite(); // con dir persiste; sin dir, en memoria (tests)
  const db: DB = {
    query: async (text, params) => {
      const res = await lite.query(text, params);
      return { rows: res.rows as any[] };
    },
    close: () => lite.close(),
  };
  await lite.exec(SCHEMA_SQL);
  return db;
}

/** Azúcar: primera fila o null. */
export async function one<T>(db: DB, text: string, params?: any[]): Promise<T | null> {
  const { rows } = await db.query<T>(text, params);
  return rows[0] ?? null;
}
