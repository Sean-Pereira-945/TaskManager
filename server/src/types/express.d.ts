import type { AuthUser } from '../types/user'

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
