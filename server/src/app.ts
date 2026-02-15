import cors, { type CorsOptions } from 'cors'
import express from 'express'
import morgan from 'morgan'

import { env } from './config/env'
import { requireAuth } from './middleware/auth'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import authRouter from './routes/auth.routes'
import projectRouter from './routes/project.routes'
import taskRouter from './routes/task.routes'

const allowedOrigins = env.CLIENT_ORIGIN
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOptions: CorsOptions = {
  origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
}

export const app = express()

app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRouter)
app.use('/api/projects', requireAuth, projectRouter)
app.use('/api/tasks', requireAuth, taskRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
