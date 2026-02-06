import { Pool, type QueryResult, type QueryResultRow } from 'pg'

import { env } from '../config/env'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<QueryResult<T>> => {
    return pool.query<T>(text, params)
  },
  connect: () => pool.connect(),
  close: () => pool.end(),
}

process.on('SIGINT', async () => {
  await pool.end()
  process.exit(0)
})
