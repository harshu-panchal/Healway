import { io } from 'socket.io-client'

// Get API base URL from environment variable
// Note: VITE_API_BASE_URL should include /api suffix (e.g., http://localhost:5000/api)
// Socket.IO needs the base URL without /api, so we remove it
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const SOCKET_URL = API_BASE_URL.replace('/api', '').replace(/\/$/, '') // Remove /api and trailing slash

let socketInstance = null
let connectionErrorCount = 0
let lastErrorLogTime = 0
let hasShownServerUnavailableWarning = false // Track if we've already shown the warning
const ERROR_LOG_THROTTLE = 30000 // Only log errors every 30 seconds (increased to reduce spam)
const MAX_ERROR_COUNT_BEFORE_SILENT = 1 // After 1 error, reduce logging

/**
 * Get authentication token from storage
 * @param {string} module - Module name (patient, doctor, admin)
 * @returns {string|null} Auth token or null
 */
const getAuthToken = (module) => {
  return (
    localStorage.getItem(`${module}AuthToken`) ||
    localStorage.getItem(`${module}AccessToken`) ||
    sessionStorage.getItem(`${module}AuthToken`) ||
    sessionStorage.getItem(`${module}AccessToken`) ||
    null
  )
}

/**
 * Initialize Socket.IO connection
 * @param {string} module - Module name (patient, doctor, admin)
 * @returns {object} Socket instance
 */
export const initSocket = (module) => {
  // Disconnect existing socket if any
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }

  const token = getAuthToken(module)

  if (!token) {
    console.warn(`No auth token found for ${module}, cannot connect to Socket.IO`)
    return null
  }

  // Validate token format
  if (typeof token !== 'string' || token.trim().length === 0) {
    console.warn(`Invalid token format for ${module}, cannot connect to Socket.IO`)
    return null
  }

  // Only log connection attempt if it's the first time or after a long delay
  if (connectionErrorCount === 0) {
    console.log(`🔌 Attempting Socket.IO connection for ${module} to:`, SOCKET_URL)
  }

  socketInstance = io(SOCKET_URL, {
    auth: {
      token: token.trim(), // Ensure token is trimmed
    },
    transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 45000, // Increase timeout for slower connections
    forceNew: true,
    withCredentials: true,
    autoConnect: true,
    // Suppress connection errors in console when server is not available
    rejectUnauthorized: false, // For development only
  })

  socketInstance.on('connect', () => {
    // Reset error count and warning flag on successful connection
    connectionErrorCount = 0
    lastErrorLogTime = 0
    hasShownServerUnavailableWarning = false
    console.log(`✅ Socket.IO connected for ${module}`, {
      id: socketInstance.id,
      transport: socketInstance.io.engine.transport.name,
    })
  })

  socketInstance.on('disconnect', (reason) => {
    // Only log if it's not a normal disconnect
    if (reason !== 'io client disconnect') {
      console.log(`⚠️ Socket.IO disconnected for ${module}:`, reason)
    }
  })

  socketInstance.on('connect_error', (error) => {
    connectionErrorCount++
    const now = Date.now()
    const isConnectionRefused = error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('xhr poll error') ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.type === 'TransportError' ||
      error.description === 0 ||
      error.code === 'ECONNREFUSED'

    // Throttle error logging - only log every ERROR_LOG_THROTTLE ms
    const shouldLog = (now - lastErrorLogTime) > ERROR_LOG_THROTTLE || connectionErrorCount <= MAX_ERROR_COUNT_BEFORE_SILENT

    if (shouldLog && connectionErrorCount <= MAX_ERROR_COUNT_BEFORE_SILENT) {
      lastErrorLogTime = now

      if (isConnectionRefused) {
        // Server is not available - log once with helpful message, then suppress completely
        if (!hasShownServerUnavailableWarning && connectionErrorCount === 1) {
          console.warn(`⚠️ Socket.IO: Backend server not available (${SOCKET_URL}). Make sure the backend server is running on port 5000. Socket will retry silently in the background.`)
          hasShownServerUnavailableWarning = true
        }
        // Suppress all subsequent connection refused errors completely
        return
      } else if (error.message?.includes('Authentication error')) {
        console.warn('⚠️ Socket.IO: Authentication failed. Please check your login token.')
      } else if (error.message?.includes('timeout')) {
        console.warn('⚠️ Socket.IO: Connection timeout. Check your network connection.')
      } else if (connectionErrorCount === 1) {
        // Only log first non-connection error
        console.warn(`⚠️ Socket.IO connection error for ${module}:`, error.message || 'Unknown error')
      }
    }

    // After MAX_ERROR_COUNT_BEFORE_SILENT errors, stop logging to reduce console spam
    // Socket.IO will continue trying to reconnect in the background
  })

  // Handle reconnection attempts
  socketInstance.on('reconnect_attempt', (attemptNumber) => {
    // Only log first few attempts to avoid spam
    if (attemptNumber <= 3) {
      console.log(`🔄 Socket.IO reconnection attempt ${attemptNumber} for ${module}`)
    }
  })

  socketInstance.on('reconnect', (attemptNumber) => {
    // Reset error count on successful reconnection
    connectionErrorCount = 0
    lastErrorLogTime = 0
    console.log(`✅ Socket.IO reconnected for ${module} after ${attemptNumber} attempts`)
  })

  socketInstance.on('reconnect_error', (error) => {
    // Silently handle reconnection errors - they're expected when server is down
    // Suppress all connection refused errors
    const isConnectionRefused = error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('xhr poll error') ||
      error.message?.includes('ERR_CONNECTION_REFUSED') ||
      error.code === 'ECONNREFUSED'

    // Don't log connection refused errors - they're expected when server is not running
    if (isConnectionRefused) {
      return // Suppress these errors completely
    }

    // Only log non-connection errors
    if (connectionErrorCount <= MAX_ERROR_COUNT_BEFORE_SILENT) {
      const now = Date.now()
      if ((now - lastErrorLogTime) > ERROR_LOG_THROTTLE) {
        console.warn(`⚠️ Socket.IO reconnection error for ${module}:`, error.message)
        lastErrorLogTime = now
      }
    }
  })

  socketInstance.on('reconnect_failed', () => {
    // Only log once when reconnection completely fails
    if (connectionErrorCount <= MAX_ERROR_COUNT_BEFORE_SILENT) {
      console.warn(`⚠️ Socket.IO reconnection failed for ${module}. Backend server may be offline.`)
    }
  })

  return socketInstance
}

/**
 * Get current Socket.IO instance
 * @returns {object|null} Socket instance or null
 */
export const getSocket = () => {
  return socketInstance
}

/**
 * Disconnect Socket.IO
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    try {
      socketInstance.disconnect()
    } catch (error) {
      console.warn('Error disconnecting socket:', error)
    } finally {
      socketInstance = null
    }
  }
}

export default {
  initSocket,
  getSocket,
  disconnectSocket,
}
