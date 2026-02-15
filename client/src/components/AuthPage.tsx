import { type FormEvent, useState } from 'react'

import { googleSignIn, loginAccount, registerAccount, type AuthResponse } from '../api/auth'
import GoogleSignInButton from './GoogleSignInButton'

type AuthPageProps = {
  onAuthSuccess: (payload: AuthResponse) => void
}

type AuthMode = 'login' | 'register'

type FormState = {
  email: string
  password: string
  name: string
}

const initialForm: FormState = {
  email: '',
  password: '',
  name: '',
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const [mode, setMode] = useState<AuthMode>('login')
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        const response = await loginAccount({ email: form.email.trim(), password: form.password })
        onAuthSuccess(response)
      } else {
        const response = await registerAccount({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim() || undefined,
        })
        onAuthSuccess(response)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process request')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (credential: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await googleSignIn(credential)
      onAuthSuccess(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'))
    setForm(initialForm)
    setError(null)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-grid">
          <section className="auth-hero">
            <p className="eyebrow">Neon Pulse · Secure Access</p>
            <h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1>
            <p className="subtitle">
              {mode === 'login'
                ? 'Sign in to sync your board across devices, keep priorities aligned, and unlock instant delivery signals.'
                : 'Launch a new workspace to capture work, invite collaborators, and power up with Google sign-in.'}
            </p>
          </section>

          <section className="auth-panel">
            {error && <div className="banner error glass">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <label className="auth-field">
                  <span>Name</span>
                  <input
                    type="text"
                    placeholder="Jordan Lee"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    disabled={loading}
                  />
                </label>
              )}

              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  disabled={loading}
                  required
                />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  disabled={loading}
                  minLength={8}
                  required
                />
              </label>

              <button type="submit" disabled={loading}>
                {loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <GoogleSignInButton disabled={loading} onCredential={handleGoogleCredential} />
            {!googleClientId && <small className="auth-note">Add GOOGLE_CLIENT_ID to enable Google sign-in.</small>}

            <p className="auth-toggle">
              {mode === 'login' ? (
                <>
                  Need an account?{' '}
                  <button type="button" className="link" onClick={toggleMode} disabled={loading}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" className="link" onClick={toggleMode} disabled={loading}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
