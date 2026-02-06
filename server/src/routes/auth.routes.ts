import { Router } from 'express'

import { currentUser, googleSignIn, login, register } from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/google', googleSignIn)
router.get('/me', requireAuth, currentUser)

export default router
