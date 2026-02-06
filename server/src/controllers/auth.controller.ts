import type { RequestHandler } from 'express'
import { OAuth2Client } from 'google-auth-library'

import { env } from '../config/env'
import { db } from '../lib/db'
import { asyncHandler } from '../utils/asyncHandler'
import { HttpError } from '../utils/httpError'
import { hashPassword, verifyPassword } from '../utils/password'
import { signAccessToken } from '../utils/token'
import type { AuthUser, UserRow } from '../types/user'
import {
  googleSignInSchema,
  loginSchema,
  registerSchema,
} from './auth.schemas'

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null

type AuthResponse = {
  token: string
  user: AuthUser
}

const toAuthUser = (row: UserRow): AuthUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
})

const buildAuthResponse = (row: UserRow): AuthResponse => {
  const user = toAuthUser(row)
  const token = signAccessToken(user)
  return { token, user }
}

const findUserByEmail = async (email: string) => {
  const { rows } = await db.query<UserRow>(
    `SELECT id, email, password_hash, name, provider, provider_id, created_at, updated_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email.toLowerCase()],
  )
  return rows[0] ?? null
}

export const register: RequestHandler = asyncHandler(async (req, res) => {
  const payload = registerSchema.parse(req.body)
  const email = payload.email.toLowerCase()

  const existing = await findUserByEmail(email)
  if (existing) {
    throw new HttpError(409, 'Account already exists')
  }

  const passwordHash = await hashPassword(payload.password)
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (email, password_hash, name, provider)
     VALUES ($1, $2, $3, 'local')
     RETURNING id, email, password_hash, name, provider, provider_id, created_at, updated_at`,
    [email, passwordHash, payload.name ?? null],
  )

  res.status(201).json({ data: buildAuthResponse(rows[0]) })
})

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body)
  const email = payload.email.toLowerCase()

  const user = await findUserByEmail(email)
  if (!user || !user.password_hash) {
    throw new HttpError(401, 'Invalid email or password')
  }

  const valid = await verifyPassword(payload.password, user.password_hash)
  if (!valid) {
    throw new HttpError(401, 'Invalid email or password')
  }

  res.json({ data: buildAuthResponse(user) })
})

export const googleSignIn: RequestHandler = asyncHandler(async (req, res) => {
  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    throw new HttpError(500, 'Google authentication is not configured')
  }

  const payload = googleSignInSchema.parse(req.body)
  const ticket = await googleClient.verifyIdToken({
    idToken: payload.idToken,
    audience: env.GOOGLE_CLIENT_ID,
  })
  const googleProfile = ticket.getPayload()

  if (!googleProfile?.email || !googleProfile.sub) {
    throw new HttpError(400, 'Unable to verify Google account')
  }

  const email = googleProfile.email.toLowerCase()
  const providerId = googleProfile.sub
  const displayName = googleProfile.name ?? null

  let user = await findUserByEmail(email)

  if (user) {
    const { rows } = await db.query<UserRow>(
      `UPDATE users
       SET provider = 'google', provider_id = $1, name = COALESCE(name, $2), updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, password_hash, name, provider, provider_id, created_at, updated_at`,
      [providerId, displayName, user.id],
    )
    user = rows[0]
  } else {
    const { rows } = await db.query<UserRow>(
      `INSERT INTO users (email, name, provider, provider_id)
       VALUES ($1, $2, 'google', $3)
       RETURNING id, email, password_hash, name, provider, provider_id, created_at, updated_at`,
      [email, displayName, providerId],
    )
    user = rows[0]
  }

  res.json({ data: buildAuthResponse(user) })
})

export const currentUser: RequestHandler = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required')
  }
  res.json({ data: req.user })
})
