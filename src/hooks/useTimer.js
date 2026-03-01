import { useState, useRef, useCallback, useEffect } from 'react'

// Wall-clock timer hook — uses Date.now() delta for accuracy.
// Interval ticks drive re-renders but elapsed is always computed
// from the real clock, so tab backgrounding doesn't cause drift.

export default function useTimer() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const startedAtRef = useRef(null)
  const pausedDurationRef = useRef(0)
  const pausedAtRef = useRef(null)
  const intervalRef = useRef(null)

  const computeElapsed = useCallback(() => {
    if (!startedAtRef.current) return 0
    const now = Date.now()
    return Math.floor((now - startedAtRef.current - pausedDurationRef.current) / 1000)
  }, [])

  const play = useCallback(() => {
    if (startedAtRef.current === null) {
      // First play
      startedAtRef.current = Date.now()
      pausedDurationRef.current = 0
    } else if (pausedAtRef.current !== null) {
      // Resume from pause
      pausedDurationRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = null
    }
    setRunning(true)
  }, [])

  const pause = useCallback(() => {
    pausedAtRef.current = Date.now()
    setRunning(false)
  }, [])

  const stop = useCallback(() => {
    // Account for final pause gap if currently paused
    if (pausedAtRef.current !== null) {
      pausedDurationRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = null
    }
    clearInterval(intervalRef.current)
    setRunning(false)
    const finalElapsed = computeElapsed()
    setElapsed(finalElapsed)
    return finalElapsed
  }, [computeElapsed])

  // Restore from saved state (for resume after page refresh)
  const restore = useCallback((savedState) => {
    if (!savedState) return
    startedAtRef.current = savedState.startedAt
    pausedDurationRef.current = savedState.pausedDuration || 0
    if (savedState.pausedAt) {
      // Was paused — add time since the save to paused duration
      pausedAtRef.current = savedState.pausedAt
      pausedDurationRef.current += Date.now() - savedState.pausedAt
      pausedAtRef.current = Date.now()
    }
    setElapsed(computeElapsed())
  }, [computeElapsed])

  // Get state for persistence
  const getTimerState = useCallback(() => ({
    startedAt: startedAtRef.current,
    pausedDuration: pausedDurationRef.current,
    pausedAt: pausedAtRef.current,
  }), [])

  // Tick effect — drives re-renders at 1Hz while running
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(computeElapsed())
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, computeElapsed])

  return { elapsed, running, play, pause, stop, restore, getTimerState }
}
