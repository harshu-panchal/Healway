import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { initSocket, disconnectSocket } from '../utils/socketClient'
import { useToast } from './ToastContext'
import { ApiClient } from '../utils/apiClient'

const NotificationContext = createContext()

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children, module = 'patient' }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Get current user's module from route
  const getCurrentModule = () => {
    const path = location.pathname
    if (path.startsWith('/patient')) return 'patient'
    if (path.startsWith('/doctor')) return 'doctor'
    if (path.startsWith('/admin')) return 'admin'
    return module
  }

  const currentModule = getCurrentModule()

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    // Don't fetch if on login page or no module
    if (!currentModule || location.pathname.includes('/login')) {
      return
    }

    // Check if user is authenticated
    const modulePathMap = {
      patient: 'patients',
      doctor: 'doctors',
      admin: 'admin',
    }
    const apiPath = modulePathMap[currentModule] || currentModule

    // Check if token exists
    const token = localStorage.getItem(`${currentModule}AuthToken`) ||
      localStorage.getItem(`${currentModule}AccessToken`) ||
      sessionStorage.getItem(`${currentModule}AuthToken`) ||
      sessionStorage.getItem(`${currentModule}AccessToken`)

    if (!token) {
      // User not authenticated, don't fetch
      return
    }

    try {
      setIsLoading(true)
      // Create apiClient instance with correct module
      const client = new ApiClient(currentModule)
      const response = await client.get(`/${apiPath}/notifications`, { limit: 20 })
      if (response.success) {
        setNotifications(response.data.items || [])
        setUnreadCount(response.data.unreadCount || 0)
      }
    } catch (error) {
      // Only log non-403/401/429 errors (403/401 means user not authorized, 429 is rate limit)
      if (error.response?.status !== 403 &&
        error.response?.status !== 401 &&
        error.response?.status !== 429) {
        console.error('Error fetching notifications:', error)
      }
      // Don't set error state for auth errors or rate limit errors
      // Rate limit errors will be handled by retry logic
    } finally {
      setIsLoading(false)
    }
  }, [currentModule, location.pathname])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    // Don't fetch if on login page or no module
    if (!currentModule || location.pathname.includes('/login')) {
      return
    }

    // Check if user is authenticated
    const modulePathMap = {
      patient: 'patients',
      doctor: 'doctors',
      admin: 'admin',
    }
    const apiPath = modulePathMap[currentModule] || currentModule

    // Check if token exists
    const token = localStorage.getItem(`${currentModule}AuthToken`) ||
      localStorage.getItem(`${currentModule}AccessToken`) ||
      sessionStorage.getItem(`${currentModule}AuthToken`) ||
      sessionStorage.getItem(`${currentModule}AccessToken`)

    if (!token) {
      // User not authenticated, don't fetch
      return
    }

    try {
      // Create apiClient instance with correct module
      const client = new ApiClient(currentModule)
      const response = await client.get(`/${apiPath}/notifications/unread-count`)
      if (response.success) {
        setUnreadCount(response.data.unreadCount || 0)
      }
    } catch (error) {
      // Only log non-403 errors (403 means user not authorized, which is expected if not logged in)
      if (error.response?.status !== 403 && error.response?.status !== 401) {
        console.error('Error fetching unread count:', error)
      }
    }
  }, [currentModule, location.pathname])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!currentModule) return

    try {
      const modulePathMap = {
        patient: 'patients',
        doctor: 'doctors',
        admin: 'admin',
      }
      const apiPath = modulePathMap[currentModule] || currentModule
      const client = new ApiClient(currentModule)
      await client.patch(`/${apiPath}/notifications/${notificationId}/read`)
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true, readAt: new Date() } : notif
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [currentModule])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!currentModule) return

    try {
      const modulePathMap = {
        patient: 'patients',
        doctor: 'doctors',
        admin: 'admin',
      }
      const apiPath = modulePathMap[currentModule] || currentModule
      const client = new ApiClient(currentModule)
      await client.patch(`/${apiPath}/notifications/read-all`)
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true, readAt: new Date() }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }, [currentModule])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    if (!currentModule) return

    try {
      const modulePathMap = {
        patient: 'patients',
        doctor: 'doctors',
        admin: 'admin',
      }
      const apiPath = modulePathMap[currentModule] || currentModule
      const client = new ApiClient(currentModule)
      await client.delete(`/${apiPath}/notifications/${notificationId}`)
      setNotifications((prev) => prev.filter((notif) => notif._id !== notificationId))
      // Update unread count if notification was unread
      const notification = notifications.find((n) => n._id === notificationId)
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }, [currentModule, notifications])

  // Handle new notification from Socket.IO
  const handleNewNotification = useCallback((data) => {
    const notification = data.notification
    if (notification) {
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)

      // Show toast notification
      toast.info(notification.message || notification.title, {
        onClick: () => {
          if (notification.actionUrl) {
            navigate(notification.actionUrl)
          }
        },
      })
    }
  }, [toast, navigate])

  // Setup Socket.IO connection
  useEffect(() => {
    // Only connect if we're in a module route
    if (!currentModule || location.pathname.includes('/login')) {
      return
    }

    let socket = null
    let mounted = true
    // Declare handlers outside try block so they're accessible in cleanup
    let handleCallInvite = null
    let handleCallError = null
    let handleCallEnded = null

    try {
      socket = initSocket(currentModule)

      if (!socket) {
        return
      }

      if (mounted) {
        setIsConnected(true)
      }

      // Listen for new notifications
      socket.on('notification:new', handleNewNotification)

      // Listen for appointment events (for backward compatibility)
      socket.on('appointment:created', () => {
        fetchUnreadCount()
      })

      socket.on('appointment:payment:confirmed', () => {
        fetchUnreadCount()
      })

      socket.on('token:called', (data) => {
        fetchUnreadCount()

        // If patient is called, save consultation room state for persistence
        if (currentModule === 'patient' && data?.appointmentId) {
          try {
            const consultationState = {
              appointmentId: data.appointmentId,
              tokenNumber: data.tokenNumber || null,
              calledAt: new Date().toISOString(),
              isInConsultation: true,
            }
            localStorage.setItem('patientConsultationRoom', JSON.stringify(consultationState))
            console.log('✅ Patient consultation room state saved:', consultationState)
          } catch (error) {
            console.error('Error saving consultation room state:', error)
          }
        }
      })

      // Listen for token recalled - patient should enter consultation room again
      socket.on('token:recalled', (data) => {
        fetchUnreadCount()

        // If patient is recalled, save consultation room state for persistence
        if (currentModule === 'patient' && data?.appointmentId) {
          try {
            const consultationState = {
              appointmentId: data.appointmentId,
              tokenNumber: data.tokenNumber || null,
              calledAt: new Date().toISOString(),
              isInConsultation: true,
              recalled: true,
            }
            localStorage.setItem('patientConsultationRoom', JSON.stringify(consultationState))
            console.log('✅ Patient consultation room state saved from recall:', consultationState)
          } catch (error) {
            console.error('Error saving consultation room state from recall:', error)
          }
        }
      })

      // Listen for consultation completion to clear state
      socket.on('consultation:completed', () => {
        if (currentModule === 'patient') {
          try {
            localStorage.removeItem('patientConsultationRoom')
            console.log('✅ Patient consultation room state cleared (consultation completed)')
          } catch (error) {
            console.error('Error clearing consultation room state:', error)
          }
        }
      })

      // Note: We DON'T clear consultation room state on 'appointment:skipped'
      // Patient might be recalled, so state should persist

      socket.on('prescription:created', () => {
        fetchUnreadCount()
      })

      socket.on('wallet:credited', () => {
        fetchUnreadCount()
      })

      socket.on('order:completed', () => {
        fetchUnreadCount()
      })

      socket.on('report:created', () => {
        fetchUnreadCount()
      })

      socket.on('request:responded', () => {
        fetchUnreadCount()
      })

      socket.on('request:assigned', () => {
        fetchUnreadCount()
      })

      // Listen for support ticket events
      socket.on('support:ticket:responded', () => {
        fetchUnreadCount()
        fetchNotifications()
      })

      socket.on('support:ticket:status:updated', () => {
        fetchUnreadCount()
        fetchNotifications()
      })

      // Listen for incoming call invites (for patients)
      if (currentModule === 'patient') {
        handleCallInvite = (data) => {
          console.log('📞 [NotificationContext] ====== RECEIVED call:invite ======')
          console.log('📞 [NotificationContext] Event data:', data)
          console.log('📞 [NotificationContext] Socket connected:', socket?.connected)
          console.log('📞 [NotificationContext] Socket ID:', socket?.id)

          // If patientId is specified in broadcast, check if it matches current user
          // (This handles the fallback broadcast case)
          if (data.patientId) {
            // Get current patient ID from token (we'll need to decode it or get from API)
            // For now, accept all invites - the PatientAppointments component will handle filtering
            console.log('📞 [NotificationContext] Broadcast invite received with patientId:', data.patientId)
          }

          // Dispatch custom event so IncomingCallNotification can handle it
          console.log('📞 [NotificationContext] Dispatching call:invite window event')
          window.dispatchEvent(new CustomEvent('call:invite', { detail: data }))

          // Also show a toast notification
          console.log('📞 [NotificationContext] Showing toast notification')
          toast.info(`${data.doctorName || 'Doctor'} is calling you`, {
            duration: 10000,
          })
        }

        handleCallError = (data) => {
          console.error('📞 [NotificationContext] Call error:', data)
          window.dispatchEvent(new CustomEvent('call:error', { detail: data }))
        }

        handleCallEnded = (data) => {
          console.log('📞 [NotificationContext] Call ended:', data)
          window.dispatchEvent(new CustomEvent('call:ended', { detail: data }))
        }

        socket.on('call:invite', handleCallInvite)
        socket.on('call:error', handleCallError)
        socket.on('call:ended', handleCallEnded)
      }

      // Fetch initial notifications
      fetchNotifications()
    } catch (error) {
      console.error('Error initializing socket:', error)
    }

    return () => {
      mounted = false
      if (socket) {
        try {
          socket.off('notification:new', handleNewNotification)
          socket.off('appointment:created')
          socket.off('appointment:payment:confirmed')
          socket.off('token:called')
          socket.off('token:recalled')
          socket.off('prescription:created')
          socket.off('wallet:credited')
          socket.off('order:completed')
          socket.off('report:created')
          socket.off('request:responded')
          socket.off('request:assigned')
          socket.off('support:ticket:responded')
          socket.off('support:ticket:status:updated')
          if (handleCallInvite) {
            socket.off('call:invite', handleCallInvite)
          }
          if (handleCallError) {
            socket.off('call:error', handleCallError)
          }
          if (handleCallEnded) {
            socket.off('call:ended', handleCallEnded)
          }
          disconnectSocket()
        } catch (error) {
          console.error('Error cleaning up socket:', error)
        }
      }
      setIsConnected(false)
    }
  }, [currentModule, location.pathname, handleNewNotification, fetchNotifications, fetchUnreadCount, toast])

  // Refresh notifications when module changes (with debounce to prevent infinite loops)
  useEffect(() => {
    if (currentModule && !location.pathname.includes('/login')) {
      // Add a small delay to prevent rapid re-fetching
      const timeoutId = setTimeout(() => {
        fetchNotifications()
      }, 500) // 500ms debounce

      return () => clearTimeout(timeoutId)
    }
  }, [currentModule]) // Removed location.pathname to avoid re-fetching on every internal navigation within a module

  const value = {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

