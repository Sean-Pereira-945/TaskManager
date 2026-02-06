import { useCallback, useEffect, useRef } from 'react'

type GoogleButtonProps = {
  disabled?: boolean
  onCredential: (credential: string) => void
}

type Google = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
      prompt: () => void
    }
  }
}

declare global {
  interface Window {
    google?: Google
  }
}

const scriptId = 'google-identity-services'
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const GoogleSignInButton = ({ disabled, onCredential }: GoogleButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const initialize = useCallback((google: Google | undefined) => {
    if (!googleClientId || !google?.accounts?.id || !containerRef.current) return
    containerRef.current.innerHTML = ''
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: ({ credential }) => onCredential(credential),
    })
    google.accounts.id.renderButton(containerRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      type: 'standard',
    })
  }, [onCredential, googleClientId])

  useEffect(() => {
    if (!googleClientId || disabled) return

    if (window.google?.accounts?.id) {
      initialize(window.google)
      return
    }

    const existingScript = document.getElementById(scriptId)
    if (existingScript) {
      const handleLoad = () => initialize(window.google)
      existingScript.addEventListener('load', handleLoad)
      return () => existingScript.removeEventListener('load', handleLoad)
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.id = scriptId
    const handleLoad = () => initialize(window.google)
    script.addEventListener('load', handleLoad)
    document.head.append(script)

    return () => {
      script.removeEventListener('load', handleLoad)
    }
  }, [disabled, initialize])

  if (!googleClientId) {
    return null
  }

  return <div ref={containerRef} className="google-signin" />
}

export default GoogleSignInButton
