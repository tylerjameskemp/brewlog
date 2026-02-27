import { useEffect, useRef } from 'react'

// Screen Wake Lock hook — prevents the phone from sleeping during an active brew.
// Progressive enhancement: fails silently on unsupported browsers.

export default function useWakeLock(active) {
  const wakeLockRef = useRef(null)

  useEffect(() => {
    if (!active) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
      return
    }

    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Silent fail — not all browsers support Wake Lock
      }
    }
    request()

    // Re-acquire on visibility change (wake lock is released when tab is hidden)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active) {
        request()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }
  }, [active])
}
