/**
 * Custom hook for request cancellation
 * Automatically cancels all pending requests when component unmounts
 * 
 * Usage:
 * const { signal, cancel } = useRequestCancellation()
 * const data = await apiClient.get('/endpoint', {}, signal)
 */
import { useEffect, useRef } from 'react'

export const useRequestCancellation = () => {
  const abortControllerRef = useRef(null)

  useEffect(() => {
    // Create new AbortController on mount
    abortControllerRef.current = new AbortController()

    // Cleanup: cancel all pending requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      // Create a new controller for future requests
      abortControllerRef.current = new AbortController()
    }
  }

  return {
    signal: abortControllerRef.current?.signal || null,
    cancel,
    isAborted: abortControllerRef.current?.signal?.aborted || false,
  }
}

export default useRequestCancellation
