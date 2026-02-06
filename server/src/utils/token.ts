import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken'

import { env } from '../config/env'
import type { AuthUser } from '../types/user'

const secret: Secret = env.JWT_SECRET as Secret

export const signAccessToken = (user: AuthUser) => {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
  }

  if (user.name) {
    payload.name = user.name
  }

  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] }

  return jwt.sign(payload, secret, options)
}

export const verifyAccessToken = (token: string): AuthUser => {
  const decoded = jwt.verify(token, secret) as JwtPayload & { sub: string }

  return {
    id: decoded.sub,
    email: decoded.email as string,
    name: (decoded.name as string | undefined) ?? null,
  }
}
