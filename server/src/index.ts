import 'dotenv/config'

import { app } from './app'
import { env } from './config/env'
import { bootstrapDatabase } from './lib/bootstrap'

const port = env.PORT

const start = async () => {
  try {
    await bootstrapDatabase()
    app.listen(port, () => {
      console.log(`API ready on http://localhost:${port}`)
    })
  } catch (error) {
    console.error('Failed to initialize database', error)
    process.exit(1)
  }
}

void start()
