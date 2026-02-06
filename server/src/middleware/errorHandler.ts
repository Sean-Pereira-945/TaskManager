import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

import { env } from '../config/env'
import { HttpError } from '../utils/httpError'

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  const errorMessage = `Route ${req.method} ${req.originalUrl} was not found`
  next(new HttpError(404, errorMessage))
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      issues: err.issues,
    })
  }

  const statusCode = err instanceof HttpError ? err.statusCode : 500
  const payload: Record<string, unknown> = {
    message: err.message || 'Internal server error',
  }

  if (env.NODE_ENV !== 'production') {
    payload.stack = err.stack
  }

  return res.status(statusCode).json(payload)
}
