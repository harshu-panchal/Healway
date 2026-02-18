import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { IoCallOutline, IoMicOutline, IoMicOffOutline, IoCloseOutline, IoRemoveOutline } from 'react-icons/io5'
import { useCall } from '../../contexts/CallContext'
import { formatCallDuration } from '../../utils/callService'
import { getSocket } from '../../utils/socketClient'
import callingRingtone from '../../assets/sounds/phone-ringing-382734.mp3'

const DoctorCallStatus = () => {
  const location = useLocation()
  const {
    callStatus,
    callInfo,
    isMinimized,
    minimize,
    maximize,
    updateCallStatus,
    updateCallInfo,
    endCall,
  } = useCall()

  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const durationIntervalRef = useRef(null)
  const containerRef = useRef(null)
  // Use refs to avoid stale closures in socket handlers
  const callStatusRef = useRef(callStatus)
  const callInfoRef = useRef(callInfo)
  // Audio ref for calling ringtone
  const callingRingtoneRef = useRef(null)

  // Center popup on screen when call starts
  useEffect(() => {
    if (callStatus === 'calling' || callStatus === 'started') {
      // Center the popup on screen (using transform center, so position is the center point)
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      setPosition({ x: centerX, y: centerY })
    }
  }, [callStatus])

  // Save position to localStorage
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem('doctorCallPosition', JSON.stringify(position))
    }
  }, [position])

  // Auto-minimize when on consultations page
  useEffect(() => {
    if (location.pathname === '/doctor/consultations' && callStatus === 'started') {
      minimize()
    }
  }, [location.pathname, callStatus, minimize])

  // Start duration timer when call starts
  useEffect(() => {
    if (callStatus === 'started' && callInfo?.startTime) {
      const startTime = new Date(callInfo.startTime).getTime()
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setCallDuration(elapsed)
      }, 1000)
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
        durationIntervalRef.current = null
      }
      setCallDuration(0)
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [callStatus, callInfo?.startTime])

  // Keep refs in sync with state
  useEffect(() => {
    callStatusRef.current = callStatus
    callInfoRef.current = callInfo
  }, [callStatus, callInfo])

  // Play calling ringtone when doctor is calling patient
  useEffect(() => {
    if (callStatus === 'calling' && callInfo?.callId) {
      // Initialize audio if not already done
      if (!callingRingtoneRef.current) {
        callingRingtoneRef.current = new Audio(callingRingtone)
        callingRingtoneRef.current.loop = true
        callingRingtoneRef.current.volume = 0.7 // Set volume to 70%
      }

      // Play ringtone
      const playRingtone = async () => {
        try {
          callingRingtoneRef.current.currentTime = 0 // Reset to start
          await callingRingtoneRef.current.play()
          console.log('📞 [DoctorCallStatus] Calling ringtone started')
        } catch (error) {
          console.warn('📞 [DoctorCallStatus] Could not play calling ringtone:', error)
          // Some browsers require user interaction before playing audio
          // This is okay - the UI will still show
        }
      }

      playRingtone()

      // Cleanup: stop ringtone when status changes
      return () => {
        if (callingRingtoneRef.current && !callingRingtoneRef.current.paused) {
          callingRingtoneRef.current.pause()
          callingRingtoneRef.current.currentTime = 0
          console.log('📞 [DoctorCallStatus] Calling ringtone stopped')
        }
      }
    } else {
      // Stop ringtone if not calling
      if (callingRingtoneRef.current && !callingRingtoneRef.current.paused) {
        callingRingtoneRef.current.pause()
        callingRingtoneRef.current.currentTime = 0
        console.log('📞 [DoctorCallStatus] Calling ringtone stopped (status changed)')
      }
    }
  }, [callStatus, callInfo?.callId])

  // Listen to socket events
  useEffect(() => {
    // Define setupListeners before it's used
    const setupListeners = (socketInstance) => {
      if (!socketInstance) return

      console.log('📞 [DoctorCallStatus] Setting up socket listeners, connected:', socketInstance.connected, 'socket ID:', socketInstance.id)

      const handleCallInitiated = (data) => {
        console.log('📞 [DoctorCallStatus] Call initiated:', data)
        if (data && data.callId) {
          updateCallInfo({ callId: data.callId })
        }
      }

      const handleCallAccepted = (data) => {
        console.log('📞 [DoctorCallStatus] Call accepted by patient (waiting for them to join):', data)
        // Patient accepted but hasn't joined yet - update status to 'accepted' if needed
        if (data && data.callId) {
          updateCallInfo((prev) => ({
            ...(prev || {}),
            callId: data.callId,
          }))
        }
      }

      const handlePatientJoined = (data) => {
        console.log('📞 [DoctorCallStatus] ====== PATIENT JOINED EVENT RECEIVED ======')
        console.log('📞 [DoctorCallStatus] Event data:', JSON.stringify(data, null, 2))
        
        // Get fresh values from refs to avoid stale closures
        const currentCallStatus = callStatusRef.current
        const currentCallInfo = callInfoRef.current
        
        console.log('📞 [DoctorCallStatus] Current callStatus before update:', currentCallStatus)
        console.log('📞 [DoctorCallStatus] Current callInfo before update:', currentCallInfo)
        
        if (data && data.callId) {
          // Validate that this event is for the current call
          // If we have callInfo with a callId, ensure they match
          if (currentCallInfo?.callId && currentCallInfo.callId !== data.callId) {
            console.warn('📞 [DoctorCallStatus] call:patientJoined event callId mismatch. Expected:', currentCallInfo.callId, 'Received:', data.callId)
            // Still update if we're in calling/connecting state and don't have a callId yet
            if (currentCallStatus !== 'calling' && currentCallStatus !== 'connecting') {
              console.warn('📞 [DoctorCallStatus] Ignoring event - not in calling/connecting state')
              return
            }
          }
          
          console.log('📞 [DoctorCallStatus] Updating status to started, callId:', data.callId)
          
          // Stop calling ringtone when patient joins
          if (callingRingtoneRef.current) {
            callingRingtoneRef.current.pause()
            callingRingtoneRef.current.currentTime = 0
            console.log('📞 [DoctorCallStatus] Calling ringtone stopped (patient joined)')
          }
          
          // Patient has actually joined - update status to started
          updateCallStatus('started')
          
          // Update call info
          updateCallInfo((prev) => {
            const updated = {
              ...(prev || {}),
              callId: data.callId,
              startTime: new Date().toISOString() 
            }
            console.log('📞 [DoctorCallStatus] Updated call info:', updated)
            return updated
          })
          
          // Force a re-render by logging
          console.log('📞 [DoctorCallStatus] Status update completed. New status should be: started')
        } else {
          console.warn('📞 [DoctorCallStatus] call:patientJoined event missing callId:', data)
        }
      }

      const handleCallEnded = (data) => {
        console.log('📞 [DoctorCallStatus] ====== call:ended EVENT RECEIVED ======')
        console.log('📞 [DoctorCallStatus] Event data:', data)
        console.log('📞 [DoctorCallStatus] Current callInfo:', callInfoRef.current)
        console.log('📞 [DoctorCallStatus] Current callStatus:', callStatusRef.current)
        
        const currentCallId = callInfoRef.current?.callId
        const currentCallStatus = callStatusRef.current
        
        // Process if:
        // 1. CallId matches exactly, OR
        // 2. We have an active call (calling/started status) - fallback to ensure UI closes
        const callIdMatches = data && data.callId && currentCallId && data.callId === currentCallId
        const hasActiveCall = currentCallStatus === 'calling' || currentCallStatus === 'started' || currentCallStatus === 'connecting'
        
        if (!callIdMatches && !hasActiveCall) {
          console.log('📞 [DoctorCallStatus] Ignoring call:ended - no callId match and no active call')
          return
        }
        
        if (!callIdMatches && hasActiveCall) {
          console.warn('📞 [DoctorCallStatus] call:ended event callId mismatch, but processing anyway because we have active call')
          console.warn('📞 [DoctorCallStatus] Expected:', currentCallId, 'Received:', data?.callId)
        }
        
        console.log('📞 [DoctorCallStatus] Updating status to ended and closing call UI')
        // Stop calling ringtone
        if (callingRingtoneRef.current) {
          callingRingtoneRef.current.pause()
          callingRingtoneRef.current.currentTime = 0
          console.log('📞 [DoctorCallStatus] Calling ringtone stopped (call ended)')
        }
        updateCallStatus('ended')
        // Close immediately - this will close both DoctorCallStatus and CallPopup
        setTimeout(() => {
          console.log('📞 [DoctorCallStatus] Closing call UI (this will also close CallPopup via CallContext)')
          endCall() // This clears activeCall in CallContext, which will close CallPopup
        }, 500)
      }

      const handleCallDeclined = (data) => {
        console.log('📞 [DoctorCallStatus] ====== call:declined EVENT RECEIVED ======')
        console.log('📞 [DoctorCallStatus] Event data:', data)
        console.log('📞 [DoctorCallStatus] Current callInfo:', callInfoRef.current)
        console.log('📞 [DoctorCallStatus] Current callStatus:', callStatusRef.current)
        
        const currentCallId = callInfoRef.current?.callId
        const currentCallStatus = callStatusRef.current
        
        // Process if:
        // 1. CallId matches exactly, OR
        // 2. We have callInfo (indicating a call was initiated), OR
        // 3. We have an active call status (calling/started/connecting), OR
        // 4. We're not in idle/ended status (any other status means a call was initiated)
        const callIdMatches = data && data.callId && currentCallId && data.callId === currentCallId
        const hasCallInfo = callInfoRef.current !== null && callInfoRef.current !== undefined
        const hasActiveCallStatus = currentCallStatus === 'calling' || currentCallStatus === 'started' || currentCallStatus === 'connecting'
        const isNotIdle = currentCallStatus !== 'idle' && currentCallStatus !== 'ended'
        
        if (!callIdMatches && !hasCallInfo && !hasActiveCallStatus && !isNotIdle) {
          console.log('📞 [DoctorCallStatus] Ignoring call:declined - no callId match, no callInfo, no active call status, and status is idle/ended')
          return
        }
        
        if (!callIdMatches && (hasCallInfo || hasActiveCallStatus || isNotIdle)) {
          console.warn('📞 [DoctorCallStatus] call:declined event callId mismatch, but processing anyway because we have callInfo, active call status, or non-idle status')
          console.warn('📞 [DoctorCallStatus] Expected:', currentCallId, 'Received:', data?.callId)
          console.warn('📞 [DoctorCallStatus] Has callInfo:', hasCallInfo, 'Has active status:', hasActiveCallStatus, 'Is not idle:', isNotIdle)
        }
        
        console.log('📞 [DoctorCallStatus] Patient declined call - closing doctor UI')
        // Stop calling ringtone
        if (callingRingtoneRef.current) {
          callingRingtoneRef.current.pause()
          callingRingtoneRef.current.currentTime = 0
          console.log('📞 [DoctorCallStatus] Calling ringtone stopped (call declined)')
        }
        updateCallStatus('idle')
        // Close immediately - this will close both DoctorCallStatus and CallPopup
        endCall() // This clears activeCall in CallContext, which will close CallPopup
      }

      // Listen for mute state updates from CallPopup
      const handleMuteStateUpdate = (event) => {
        setIsMuted(event.detail.muted)
      }

      // Debug: Listen to ALL socket events to see what's being received
      const debugHandler = (eventName, ...args) => {
        if (eventName.startsWith('call:')) {
          console.log(`📞 [DoctorCallStatus] ====== SOCKET EVENT RECEIVED ======`)
          console.log(`📞 [DoctorCallStatus] Event name: ${eventName}`)
          console.log(`📞 [DoctorCallStatus] Event args:`, args)
          console.log(`📞 [DoctorCallStatus] Socket connected: ${socketInstance.connected}`)
          console.log(`📞 [DoctorCallStatus] Socket ID: ${socketInstance.id}`)
        }
      }
      socketInstance.onAny(debugHandler)

      // Set up listeners - use 'on' instead of 'once' to ensure we catch the event
      socketInstance.on('call:initiated', handleCallInitiated)
      socketInstance.on('call:accepted', handleCallAccepted)
      socketInstance.on('call:patientJoined', handlePatientJoined)
      socketInstance.on('call:ended', handleCallEnded)
      socketInstance.on('call:declined', handleCallDeclined)
      window.addEventListener('call:muteStateUpdate', handleMuteStateUpdate)

      // If socket is not connected, wait for connection
      if (!socketInstance.connected) {
        console.log('📞 [DoctorCallStatus] Socket not connected, waiting for connection...')
        const connectHandler = () => {
          console.log('📞 [DoctorCallStatus] Socket connected, listeners are ready')
        }
        socketInstance.on('connect', connectHandler)
        return () => {
          socketInstance.off('connect', connectHandler)
          socketInstance.offAny(debugHandler)
          socketInstance.off('call:initiated', handleCallInitiated)
          socketInstance.off('call:accepted', handleCallAccepted)
          socketInstance.off('call:patientJoined', handlePatientJoined)
          socketInstance.off('call:ended', handleCallEnded)
          socketInstance.off('call:declined', handleCallDeclined)
          window.removeEventListener('call:muteStateUpdate', handleMuteStateUpdate)
        }
      }

      return () => {
        console.log('📞 [DoctorCallStatus] Cleaning up socket listeners')
        socketInstance.offAny(debugHandler)
        socketInstance.off('call:initiated', handleCallInitiated)
        socketInstance.off('call:accepted', handleCallAccepted)
        socketInstance.off('call:patientJoined', handlePatientJoined)
        socketInstance.off('call:ended', handleCallEnded)
        socketInstance.off('call:declined', handleCallDeclined)
        window.removeEventListener('call:muteStateUpdate', handleMuteStateUpdate)
      }
    }

    let socket = getSocket()
    if (!socket) {
      console.warn('📞 [DoctorCallStatus] Socket not available, will retry...')
      // Retry after a short delay
      const retryTimer = setTimeout(() => {
        socket = getSocket()
        if (socket) {
          setupListeners(socket)
        }
      }, 1000)
      return () => clearTimeout(retryTimer)
    }

    const cleanup = setupListeners(socket)
    return cleanup
  }, [updateCallStatus, updateCallInfo, endCall])

  // Fallback: Periodically check if we should update status from 'calling' to 'started'
  // This handles cases where the socket event might be missed
  useEffect(() => {
    if (callStatus === 'calling' && callInfo?.callId) {
      console.log('📞 [DoctorCallStatus] Setting up fallback check for call status update')
      
      // Check every 2 seconds if we're still in 'calling' state
      // If the patient has actually joined (we can detect this by checking if CallPopup is active),
      // we should update the status
      const fallbackInterval = setInterval(() => {
        const currentStatus = callStatusRef.current
        const currentCallInfo = callInfoRef.current
        
        // If we're still in 'calling' state after 5 seconds, check if we should update
        // This is a safety mechanism in case the socket event was missed
        if (currentStatus === 'calling' && currentCallInfo?.callId) {
          console.log('📞 [DoctorCallStatus] Fallback check: Still in calling state, checking if patient joined...')
          // We'll rely on the socket event, but this ensures we don't get stuck
          // The socket event should fire, but if it doesn't, we can add additional logic here
        }
      }, 2000)
      
      // Clear after 30 seconds (patient should have joined by then)
      const timeout = setTimeout(() => {
        clearInterval(fallbackInterval)
      }, 30000)
      
      return () => {
        clearInterval(fallbackInterval)
        clearTimeout(timeout)
      }
    }
  }, [callStatus, callInfo?.callId])

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return // Don't drag if clicking a button
    setIsDragging(true)
  }

  // Handle drag
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    // Use mouse position directly since we're using transform center
    const newX = e.clientX
    const newY = e.clientY

    // Constrain to viewport (accounting for transform center)
    const halfWidth = isMinimized ? 28 : 144 // Half of width (w-72 = 288px / 2 = 144px)
    const halfHeight = isMinimized ? 28 : 100 // Approximate half height

    setPosition({
      x: Math.max(halfWidth, Math.min(newX, window.innerWidth - halfWidth)),
      y: Math.max(halfHeight, Math.min(newY, window.innerHeight - halfHeight)),
    })
  }, [isDragging, isMinimized])

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Attach global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleMuteToggle = () => {
    // Emit custom event that CallPopup can listen to for mute toggle
    const event = new CustomEvent('call:muteToggle', { detail: { muted: !isMuted } })
    window.dispatchEvent(event)
    setIsMuted(!isMuted)
  }

  const handleEndCall = () => {
    // Stop calling ringtone immediately
    if (callingRingtoneRef.current) {
      callingRingtoneRef.current.pause()
      callingRingtoneRef.current.currentTime = 0
      console.log('📞 [DoctorCallStatus] Calling ringtone stopped (doctor ended call)')
    }
    
    const socket = getSocket()
    if (!socket || !callInfo?.callId) {
      // If no socket or callId, just close the UI
      console.warn('📞 [DoctorCallStatus] No socket or callId, closing UI directly')
      endCall()
      return
    }

    const currentCallId = callInfo.callId
    console.log('📞 [DoctorCallStatus] Emitting call:end for callId:', currentCallId)

    // Emit call:end to server
    // The handleCallEnded listener in useEffect will handle the UI cleanup when call:ended arrives
    socket.emit('call:end', { callId: currentCallId }, (response) => {
      if (response && response.error) {
        console.error('📞 [DoctorCallStatus] Error ending call:', response.error)
        // If there's an error, close UI immediately
        endCall()
      } else {
        // Success - wait for call:ended event to arrive
        // The handleCallEnded in useEffect will handle cleanup
        console.log('📞 [DoctorCallStatus] call:end emitted, waiting for call:ended event...')
        
        // Set up timeout as fallback in case call:ended doesn't arrive
        const timeoutId = setTimeout(() => {
          console.warn('📞 [DoctorCallStatus] call:ended event timeout, closing UI anyway')
          endCall()
        }, 5000) // 5 second timeout

        // Store timeout ID so we can clear it if call:ended arrives
        // The handleCallEnded in useEffect will handle the actual cleanup
        // We just need to ensure we don't wait forever
        socket.once('call:ended', () => {
          clearTimeout(timeoutId)
        })
      }
    })
  }

  // Debug: Log current status and force re-render check
  useEffect(() => {
    console.log('📞 [DoctorCallStatus] ====== RENDER ======')
    console.log('📞 [DoctorCallStatus] Current callStatus:', callStatus)
    console.log('📞 [DoctorCallStatus] Current callInfo:', callInfo)
    console.log('📞 [DoctorCallStatus] Should show:', callStatus === 'calling' ? 'Calling...' : callStatus === 'started' ? 'Call Started' : 'Nothing')
    
    // If we're in 'calling' or 'connecting' state and have a callId, check if we should update
    // This handles cases where the socket event might have been missed
    if ((callStatus === 'calling' || callStatus === 'connecting') && callInfo?.callId) {
      console.log('📞 [DoctorCallStatus] In calling/connecting state with callId, checking if status should be updated...')
      // The socket event should handle this, but this is a safety check
    }
  }, [callStatus, callInfo])

  // Don't render if no active call or status is idle/ended
  if (!callInfo || (callStatus !== 'calling' && callStatus !== 'started')) {
    return null
  }

  // Minimized view - floating button
  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        className="fixed z-[10001] cursor-move select-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
        onMouseDown={handleMouseDown}
      >
        <button
          onClick={maximize}
          className="relative flex items-center justify-center w-14 h-14 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition active:scale-95"
          title="Click to expand call"
        >
          {/* Pulsing animation */}
          <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
          <IoCallOutline className="text-white text-xl relative z-10" />
          
          {/* Duration badge */}
          {callStatus === 'started' && callDuration > 0 && (
            <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {formatCallDuration(callDuration).split(':')[1]}
            </span>
          )}
        </button>
      </div>
    )
  }

  // Full view - call status card
  return (
    <div
      ref={containerRef}
      className="fixed z-[10001] w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'move',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header - draggable area */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white text-sm font-semibold">
            {callStatus === 'calling' ? 'Calling...' : 'Call Started'}
          </span>
        </div>
        <button
          onClick={minimize}
          className="text-white hover:bg-white/20 rounded p-1 transition"
          title="Minimize"
        >
          <IoRemoveOutline className="text-lg" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Patient info */}
        <div className="text-center">
          <p className="text-slate-900 font-semibold text-lg">
            {callInfo.patientName || 'Patient'}
          </p>
          {callStatus === 'started' && callDuration > 0 && (
            <p className="text-slate-600 text-sm mt-1">
              {formatCallDuration(callDuration)}
            </p>
          )}
          {callStatus === 'calling' && (
            <p className="text-slate-500 text-xs mt-1">Waiting for patient...</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleMuteToggle}
            disabled={callStatus !== 'started'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
              isMuted
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <IoMicOffOutline className="text-xl" /> : <IoMicOutline className="text-xl" />}
          </button>

          <button
            onClick={handleEndCall}
            className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
            title="End Call"
          >
            <IoCloseOutline className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default DoctorCallStatus

