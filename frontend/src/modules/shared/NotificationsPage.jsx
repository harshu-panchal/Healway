import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  IoArrowBackOutline,
  IoNotificationsOutline,
  IoCheckmarkCircleOutline,
  IoTrashOutline,
  IoTimeOutline,
} from 'react-icons/io5'
import { useNotification } from '../../contexts/NotificationContext'
import { useToast } from '../../contexts/ToastContext'
import { ApiClient } from '../../utils/apiClient'

const NotificationsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotification()
  const toast = useToast()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'unread', 'read'
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Get current module from route
  const currentModule = useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/patient')) return 'patient'
    if (path.startsWith('/doctor')) return 'doctor'
    if (path.startsWith('/admin')) return 'admin'
    return 'patient'
  }, [location.pathname])

  // Map module to API path
  const getApiPath = () => {
    const modulePathMap = {
      patient: 'patients',
      doctor: 'doctors',
      admin: 'admin',
    }
    return modulePathMap[currentModule] || currentModule
  }

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum = 1, filterType = 'all') => {
    try {
      setLoading(true)
      const apiPath = getApiPath()
      const moduleApiClient = new ApiClient(currentModule)
      const params = {
        page: pageNum,
        limit: 20,
      }

      if (filterType === 'unread') {
        params.read = 'false'
      } else if (filterType === 'read') {
        params.read = 'true'
      }

      const response = await moduleApiClient.get(`/${apiPath}/notifications`, params)

      if (response?.success) {
        const newNotifications = response.data?.items || []

        if (pageNum === 1) {
          setNotifications(newNotifications)
        } else {
          setNotifications((prev) => [...prev, ...newNotifications])
        }

        const pagination = response.data?.pagination || {}
        setHasMore(pagination.page < pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [currentModule, toast])

  // Load notifications when component mounts or filter changes
  useEffect(() => {
    setPage(1)
    fetchNotifications(1, filter)
  }, [filter, fetchNotifications])

  // Load more notifications
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchNotifications(nextPage, filter)
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id)
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notification._id ? { ...notif, read: true, readAt: new Date() } : notif
        )
      )
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      toast.success('All notifications marked as read')
      // Refresh notifications
      fetchNotifications(1, filter)
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Failed to mark all as read')
    }
  }

  // Handle delete
  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId)
      setNotifications((prev) => prev.filter((notif) => notif._id !== notificationId))
      toast.success('Notification deleted')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    }
  }

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  return (
    <section className="flex flex-col gap-4 pb-20 pt-4">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <IoArrowBackOutline className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
            <p className="text-xs text-slate-600">
              {unreadNotifications.length} unread • {notifications.length} total
            </p>
          </div>
        </div>
        {unreadNotifications.length > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
          >
            <IoCheckmarkCircleOutline className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-semibold transition ${filter === 'all'
              ? 'border-b-2 border-primary text-primary'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-semibold transition ${filter === 'unread'
              ? 'border-b-2 border-primary text-primary'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Unread ({unreadNotifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('read')}
          className={`px-4 py-2 text-sm font-semibold transition ${filter === 'read'
              ? 'border-b-2 border-primary text-primary'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Read ({readNotifications.length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {loading && notifications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <IoNotificationsOutline className="mx-auto h-12 w-12 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-600">No notifications</p>
            <p className="text-xs text-slate-500 mt-1">
              {filter === 'unread'
                ? 'You have no unread notifications'
                : filter === 'read'
                  ? 'You have no read notifications'
                  : 'You have no notifications yet'}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <article
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer ${!notification.read
                  ? 'border-primary bg-blue-50/50'
                  : 'border-slate-200'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3
                      className={`text-sm font-semibold ${!notification.read ? 'text-slate-900' : 'text-slate-700'
                        }`}
                    >
                      {notification.title}
                    </h3>
                    {!notification.read && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-primary mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <IoTimeOutline className="h-3 w-3" />
                      <span>{formatTime(notification.createdAt)}</span>
                    </div>
                    {notification.priority && notification.priority !== 'low' && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                          notification.priority
                        )}`}
                      >
                        {notification.priority}
                      </span>
                    )}
                    {notification.type && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        {notification.type}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(notification._id)
                  }}
                  className="shrink-0 text-slate-400 hover:text-red-500 transition-colors p-1"
                  aria-label="Delete notification"
                >
                  <IoTrashOutline className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && notifications.length > 0 && (
        <div className="text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </section>
  )
}

export default NotificationsPage

