import { useNavigate } from 'react-router-dom'
import { IoNotificationsOutline, IoNotifications } from 'react-icons/io5'
import { useNotification } from '../contexts/NotificationContext'

const NotificationBell = ({ className = '' }) => {
  const { unreadCount } = useNotification()
  const navigate = useNavigate()

  // Get current module from route
  const getCurrentModule = () => {
    const path = window.location.pathname
    if (path.startsWith('/patient')) return 'patient'
    if (path.startsWith('/doctor')) return 'doctor'
    if (path.startsWith('/admin')) return 'admin'
    return 'patient'
  }

  const handleBellClick = () => {
    const module = getCurrentModule()
    navigate(`/${module}/notifications`)
  }

  // Check if className contains 'text-white' for white icon variant
  const isWhiteVariant = className.includes('text-white')
  const iconColorClass = isWhiteVariant ? 'text-white' : (unreadCount > 0 ? 'text-primary' : 'text-slate-500')
  const buttonClass = isWhiteVariant 
    ? 'relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2'
    : 'relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleBellClick}
        className={buttonClass}
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <IoNotifications className={`text-xl ${iconColorClass}`} aria-hidden="true" />
        ) : (
          <IoNotificationsOutline className={`text-xl ${iconColorClass}`} aria-hidden="true" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}

export default NotificationBell

