import { useEffect, useRef, useState } from 'react'

const OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0.25,
  rootMargin: '0px 0px -10% 0px',
}

/**
 * Adds an IntersectionObserver powered fade/slide-in effect for scroll-based reveals.
 */
export const useScrollReveal = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || isVisible) return

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          obs.unobserve(entry.target)
        }
      })
    }, OBSERVER_OPTIONS)

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [isVisible])

  return { ref, isVisible }
}
