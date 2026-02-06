import type { RequestHandler } from 'express'

import { verifyAccessToken } from '../utils/token'
import { HttpError } from '../utils/httpError'

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authentication required'))
  }

  const token = header.slice(7)
  try {
    const user = verifyAccessToken(token)
    req.user = user
    return next()
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'))
  }
}
