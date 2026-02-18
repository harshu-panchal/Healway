import { useState, useEffect, useRef } from 'react'
import { IoCallOutline, IoVideocamOutline } from 'react-icons/io5'
import { getSocket } from '../../utils/socketClient'
import { openCallPopup } from '../../utils/callService'
import { useToast } from '../../contexts/ToastContext'
import { useCall } from '../../contexts/CallContext'
import ringtoneSound from '../../assets/sounds/ringtone-030-437513.mp3'

const IncomingCallNotification = () => {
  const [incomingCall, setIncomingCall] = useState(null) // { callId, appointmentId, doctorName, callType }
  const [isProcessing, setIsProcessing] = useState(false)
  const toast = useToast()
  const { startCall } = useCall()
  // Track ended callIds to prevent showing notifications for already-ended calls
  const endedCallIdsRef = useRef(new Set())
  // Audio ref for ringtone
  const ringtoneRef = useRef(null)

  useEffect(() => {
    console.log('📞 [IncomingCallNotification] Component mounted, setting up listeners...')
    console.log('📞 [IncomingCallNotification] Current window location:', window.location.href)

    let socket = getSocket()
    let cleanupFunctions = []

    // Function to set up listeners
    const setupListeners = (socketInstance) => {
      if (!socketInstance) {
        console.warn('📞 [IncomingCallNotification] Cannot setup listeners - no socket instance')
        return
      }

      console.log('📞 [IncomingCallNotification] Setting up event listeners')
      console.log('📞 [IncomingCallNotification] Socket connected:', socketInstance.connected)
      console.log('📞 [IncomingCallNotification] Socket ID:', socketInstance.id)
      console.log('📞 [IncomingCallNotification] Socket URL:', socketInstance.io?.uri)

      // Listen for incoming call invites via custom event (from NotificationContext)
      const handleCallInviteEvent = (event) => {
        const data = event.detail
        console.log('📞 [IncomingCallNotification] ====== RECEIVED call:invite VIA WINDOW EVENT ======')
        console.log('📞 [IncomingCallNotification] Event data:', data)
        console.log('📞 [IncomingCallNotification] Current incomingCall state:', incomingCall)

        // Check if this call was already ended before showing notification
        if (data.callId && endedCallIdsRef.current.has(data.callId)) {
          console.log('📞 [IncomingCallNotification] Call was already ended, ignoring invite:', data.callId)
          return
        }

        // Always set incoming call (allow override if new call comes in)
        const newIncomingCall = {
          callId: data.callId,
          appointmentId: data.appointmentId,
          doctorName: data.doctorName || 'Doctor',
          callType: data.callType || 'audio'
        }
        console.log('📞 [IncomingCallNotification] Setting incoming call:', newIncomingCall)
        setIncomingCall(newIncomingCall)
      }

      // Listen for call errors
      const handleCallErrorEvent = (event) => {
        const data = event.detail
        console.error('📞 [IncomingCallNotification] Call error via event:', data)
        toast.error(data.message || 'Call error occurred')
        setIncomingCall(null)
        setIsProcessing(false)
      }

      // Also listen directly on socket as fallback
      const handleCallInvite = (data) => {
        console.log('📞 [IncomingCallNotification] ====== RECEIVED call:invite DIRECTLY FROM SOCKET ======')
        console.log('📞 [IncomingCallNotification] Event data:', data)
        console.log('📞 [IncomingCallNotification] Socket connected:', socketInstance?.connected)
        console.log('📞 [IncomingCallNotification] Socket ID:', socketInstance?.id)

        // Check if this call was already ended before showing notification
        if (data.callId && endedCallIdsRef.current.has(data.callId)) {
          console.log('📞 [IncomingCallNotification] Call was already ended, ignoring invite:', data.callId)
          return
        }

        // Always set incoming call (allow override if new call comes in)
        const newIncomingCall = {
          callId: data.callId,
          appointmentId: data.appointmentId,
          doctorName: data.doctorName || 'Doctor',
          callType: data.callType || 'audio'
        }
        console.log('📞 [IncomingCallNotification] Setting incoming call from socket:', newIncomingCall)
        setIncomingCall(newIncomingCall)
      }

      const handleCallError = (data) => {
        console.error('📞 [IncomingCallNotification] Call error directly:', data)
        toast.error(data.message || 'Call error occurred')
        setIncomingCall(null)
        setIsProcessing(false)
      }

      // Listen for call ended (if doctor ends before patient accepts)
      const handleCallEnded = (data) => {
        console.log('📞 [IncomingCallNotification] Call ended:', data)
        console.log('📞 [IncomingCallNotification] Current incomingCall state:', incomingCall)

        // Track ended callId even if we don't have an active incoming call yet
        // This prevents showing notification if invite arrives after ended event
        if (data && data.callId) {
          endedCallIdsRef.current.add(data.callId)
          console.log('📞 [IncomingCallNotification] Tracked ended callId:', data.callId)

          // Clean up old ended callIds periodically (keep last 100)
          if (endedCallIdsRef.current.size > 100) {
            const callIdsArray = Array.from(endedCallIdsRef.current)
            // Remove oldest entries (keep last 50)
            callIdsArray.slice(0, callIdsArray.length - 50).forEach(callId => {
              endedCallIdsRef.current.delete(callId)
            })
            console.log('📞 [IncomingCallNotification] Cleaned up old ended callIds, kept last 50')
          }
        }

        setIncomingCall((current) => {
          // Close notification if:
          // 1. CallId matches exactly, OR
          // 2. We have an incoming call and no callId in data (to handle edge cases), OR
          // 3. We have an incoming call and it's the only active call (defensive check)
          if (current) {
            const callIdMatches = data && data.callId && current.callId === data.callId
            const shouldClose = callIdMatches || !data?.callId || !current.callId

            if (shouldClose) {
              console.log('📞 [IncomingCallNotification] Closing notification - call ended by doctor')
              // Stop ringtone when call is ended
              if (ringtoneRef.current) {
                ringtoneRef.current.pause()
                ringtoneRef.current.currentTime = 0
                console.log('📞 [IncomingCallNotification] Ringtone stopped (call ended)')
              }
              toast.info('Call was ended by the doctor')
              setIsProcessing(false)
              return null
            }
          }
          return current
        })
      }

      // Listen for call ended via window event (from NotificationContext)
      const handleCallEndedEvent = (event) => {
        const data = event.detail
        console.log('📞 [IncomingCallNotification] Call ended via window event:', data)
        handleCallEnded(data)
      }

      // Listen to both custom events and socket events
      window.addEventListener('call:invite', handleCallInviteEvent)
      window.addEventListener('call:error', handleCallErrorEvent)
      window.addEventListener('call:ended', handleCallEndedEvent)
      socketInstance.on('call:invite', handleCallInvite)
      socketInstance.on('call:error', handleCallError)
      socketInstance.on('call:ended', handleCallEnded)

      // Store cleanup functions
      cleanupFunctions.push(() => {
        console.log('📞 [IncomingCallNotification] Cleaning up listeners')
        socketInstance.off('call:invite', handleCallInvite)
        socketInstance.off('call:error', handleCallError)
        socketInstance.off('call:ended', handleCallEnded)
        window.removeEventListener('call:invite', handleCallInviteEvent)
        window.removeEventListener('call:error', handleCallErrorEvent)
        window.removeEventListener('call:ended', handleCallEndedEvent)
      })
    }

    // Try to get socket immediately
    if (socket) {
      if (socket.connected) {
        setupListeners(socket)
      } else {
        console.warn('⚠️ Socket exists but not connected yet. Waiting for connection...')
        const connectHandler = () => {
          console.log('✅ Socket connected, setting up listeners')
          setupListeners(socket)
          socket.off('connect', connectHandler)
        }
        socket.on('connect', connectHandler)
        cleanupFunctions.push(() => socket.off('connect', connectHandler))
      }
    } else {
      console.warn('⚠️ Socket not available for call notifications. Will retry...')
      // Retry after a short delay in case socket is still initializing
      const retryTimer = setTimeout(() => {
        const retrySocket = getSocket()
        if (retrySocket) {
          console.log('✅ Socket available on retry')
          socket = retrySocket
          if (retrySocket.connected) {
            setupListeners(retrySocket)
          } else {
            retrySocket.on('connect', () => {
              console.log('✅ Socket connected on retry, setting up listeners')
              setupListeners(retrySocket)
            })
          }
        } else {
          console.error('❌ Socket still not available after retry')
        }
      }, 1000)
      cleanupFunctions.push(() => clearTimeout(retryTimer))
    }

    return () => {
      // Execute all cleanup functions
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [toast]) // Only depend on toast, not incomingCall to avoid re-setting listeners

  // Periodic cleanup of old ended callIds (every 5 minutes)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (endedCallIdsRef.current.size > 50) {
        const callIdsArray = Array.from(endedCallIdsRef.current)
        // Remove oldest entries (keep last 25)
        callIdsArray.slice(0, callIdsArray.length - 25).forEach(callId => {
          endedCallIdsRef.current.delete(callId)
        })
        console.log('📞 [IncomingCallNotification] Periodic cleanup: removed old ended callIds, kept last 25')
      }
    }, 5 * 60 * 1000) // Every 5 minutes

    return () => {
      clearInterval(cleanupInterval)
    }
  }, [])

  // Play ringtone when incoming call is received
  useEffect(() => {
    if (incomingCall && !isProcessing) {
      // Initialize audio if not already done
      if (!ringtoneRef.current) {
        ringtoneRef.current = new Audio(ringtoneSound)
        ringtoneRef.current.loop = true
        ringtoneRef.current.volume = 0.7 // Set volume to 70%
      }

      // Play ringtone
      const playRingtone = async () => {
        try {
          ringtoneRef.current.currentTime = 0 // Reset to start
          await ringtoneRef.current.play()
          console.log('📞 [IncomingCallNotification] Ringtone started')
        } catch (error) {
          console.warn('📞 [IncomingCallNotification] Could not play ringtone:', error)
          // Some browsers require user interaction before playing audio
          // This is okay - the notification will still show
        }
      }

      playRingtone()

      // Cleanup: stop ringtone when component unmounts or call is cleared
      return () => {
        if (ringtoneRef.current) {
          ringtoneRef.current.pause()
          ringtoneRef.current.currentTime = 0
          console.log('📞 [IncomingCallNotification] Ringtone stopped')
        }
      }
    } else {
      // Stop ringtone if no incoming call
      if (ringtoneRef.current && !ringtoneRef.current.paused) {
        ringtoneRef.current.pause()
        ringtoneRef.current.currentTime = 0
        console.log('📞 [IncomingCallNotification] Ringtone stopped (no incoming call)')
      }
    }
  }, [incomingCall, isProcessing])

  const handleAcceptCall = async () => {
    if (!incomingCall || isProcessing) return

    // Stop ringtone immediately when accepting
    if (ringtoneRef.current) {
      ringtoneRef.current.pause()
      ringtoneRef.current.currentTime = 0
      console.log('📞 [IncomingCallNotification] Ringtone stopped (call accepted)')
    }

    const socket = getSocket()
    if (!socket || !socket.connected) {
      toast.error('Not connected to server. Please refresh the page.')
      setIncomingCall(null)
      return
    }

    setIsProcessing(true)
    const currentCallId = incomingCall.callId // Store callId to avoid stale closure

    try {
      console.log('📞 [IncomingCallNotification] Patient emitting call:accept for callId:', currentCallId)

      // Set up call:accepted listener BEFORE emitting (to avoid race condition)
      let acceptedHandler = null
      let timeoutId = null

      acceptedHandler = (data) => {
        console.log('📞 [IncomingCallNotification] Received call:accepted event:', data)
        if (data.callId === currentCallId) {
          console.log('📞 [IncomingCallNotification] Call accepted, opening popup:', data.callId)

          // Clear timeout
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }

          // Remove listener
          socket.off('call:accepted', acceptedHandler)

          // Open call popup
          try {
            const doctorName = incomingCall?.doctorName || 'Doctor'
            // Pass callType to openCallPopup which will pass it to startCall
            startCall(currentCallId, doctorName, incomingCall.callType)
            toast.success('Joining call...')
          } catch (error) {
            console.error('Error opening call popup:', error)
            toast.error(error.message || 'Failed to start call')
          }

          // Close modal
          setIncomingCall(null)
          setIsProcessing(false)
        }
      }

      // Set up listener BEFORE emitting
      socket.once('call:accepted', acceptedHandler)

      // Set up timeout
      timeoutId = setTimeout(() => {
        console.warn('📞 [IncomingCallNotification] Call acceptance timeout')
        socket.off('call:accepted', acceptedHandler)
        if (isProcessing) {
          toast.error('Call acceptance timeout. Please try again.')
          setIncomingCall(null)
          setIsProcessing(false)
        }
      }, 10000)

      // Also listen for errors
      const errorHandler = (data) => {
        console.error('📞 [IncomingCallNotification] Call error during accept:', data)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        socket.off('call:accepted', acceptedHandler)
        socket.off('call:error', errorHandler)
        socket.off('call:ended', endedHandler)
        toast.error(data.message || 'Failed to accept call')
        setIncomingCall(null)
        setIsProcessing(false)
      }

      // Listen for call:ended in case doctor ends call while patient is accepting
      const endedHandler = (data) => {
        console.log('📞 [IncomingCallNotification] Call ended while accepting:', data)
        if (data && data.callId === currentCallId) {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          socket.off('call:accepted', acceptedHandler)
          socket.off('call:error', errorHandler)
          socket.off('call:ended', endedHandler)
          toast.info('Call was ended by the doctor')
          setIncomingCall(null)
          setIsProcessing(false)
        }
      }

      socket.once('call:error', errorHandler)
      socket.once('call:ended', endedHandler)

      // Emit call:accept event (backend doesn't use callback, so we just emit)
      socket.emit('call:accept', { callId: currentCallId })
      console.log('📞 [IncomingCallNotification] call:accept event emitted, waiting for call:accepted...')

    } catch (error) {
      console.error('Error accepting call:', error)
      toast.error(error.message || 'Failed to accept call')
      setIncomingCall(null)
      setIsProcessing(false)
    }
  }

  const handleDeclineCall = () => {
    if (!incomingCall || isProcessing) return

    // Stop ringtone immediately when declining
    if (ringtoneRef.current) {
      ringtoneRef.current.pause()
      ringtoneRef.current.currentTime = 0
      console.log('📞 [IncomingCallNotification] Ringtone stopped (call declined)')
    }

    const socket = getSocket()
    if (!socket || !socket.connected) {
      toast.error('Not connected to server. Please refresh the page.')
      setIncomingCall(null)
      return
    }

    setIsProcessing(true)
    const currentCallId = incomingCall.callId // Store to avoid stale closure

    try {
      console.log('📞 [IncomingCallNotification] Patient emitting call:decline for callId:', currentCallId)

      // Set up timeout to prevent infinite "Processing..." state
      const timeoutId = setTimeout(() => {
        console.warn('📞 [IncomingCallNotification] Call decline timeout')
        setIncomingCall(null)
        setIsProcessing(false)
        toast.error('Request timeout. Please try again.')
      }, 10000)

      // Emit call:decline event
      socket.emit('call:decline', { callId: currentCallId }, (response) => {
        clearTimeout(timeoutId) // Clear timeout on response

        if (response && response.error) {
          console.error('📞 [IncomingCallNotification] Server error:', response.error)
          toast.error(response.error)
        } else {
          console.log('📞 [IncomingCallNotification] Call declined successfully')
          toast.info('Call declined')
        }

        setIncomingCall(null)
        setIsProcessing(false)
      })

      // Also listen for call:declined event as fallback
      const declinedHandler = (data) => {
        if (data.callId === currentCallId) {
          console.log('📞 [IncomingCallNotification] Received call:declined event')
          clearTimeout(timeoutId)
          socket.off('call:declined', declinedHandler)
          setIncomingCall(null)
          setIsProcessing(false)
          toast.info('Call declined')
        }
      }

      socket.once('call:declined', declinedHandler)
    } catch (error) {
      console.error('Error declining call:', error)
      toast.error(error.message || 'Failed to decline call')
      setIncomingCall(null)
      setIsProcessing(false)
    }
  }

  if (!incomingCall) {
    return null
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-title"
      aria-describedby="call-description"
    >
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          {/* Pulsing Call Icon */}
          <div className="w-24 h-24 bg-blue-100 rounded-full mx-auto mb-6 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-blue-200 rounded-full animate-ping opacity-75"></div>
            <div className="absolute inset-0 bg-blue-300 rounded-full animate-pulse opacity-50"></div>
            {incomingCall.callType === 'video' ? (
              <IoVideocamOutline className="text-4xl text-blue-600 relative z-10" />
            ) : (
              <IoCallOutline className="text-4xl text-blue-600 relative z-10" />
            )}
          </div>

          {/* Call Information */}
          <h3
            id="call-title"
            className="text-2xl font-bold text-slate-900 mb-2"
          >
            Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call
          </h3>
          <p className="text-lg text-slate-700 mb-1 font-semibold">
            {incomingCall.doctorName}
          </p>
          <p
            id="call-description"
            className="text-sm text-slate-500 mb-8"
          >
            wants to start a {incomingCall.callType === 'video' ? 'video' : 'voice'} call
          </p>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleDeclineCall}
              disabled={isProcessing}
              className="flex-1 rounded-xl bg-red-500 px-6 py-4 text-white font-semibold hover:bg-red-600 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              aria-label="Decline call"
            >
              {isProcessing ? 'Processing...' : 'Decline'}
            </button>
            <button
              onClick={handleAcceptCall}
              disabled={isProcessing}
              className="flex-1 rounded-xl bg-green-500 px-6 py-4 text-white font-semibold hover:bg-green-600 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              aria-label="Join call"
            >
              {isProcessing ? 'Joining...' : 'Join'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IncomingCallNotification

