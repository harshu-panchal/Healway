import { useNavigate, useLocation } from 'react-router-dom'
import { IoPersonCircleOutline, IoMenuOutline, IoCloseOutline } from 'react-icons/io5'
import { useState, useRef, useEffect } from 'react'
import AdminSidebar from './AdminSidebar'
import { logoutAdmin } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'
import NotificationBell from '../../../components/NotificationBell'

const AdminNavbar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const profileRef = useRef(null)
  
  const isLoginPage = location.pathname === '/admin/login'

  const handleLogout = async () => {
    try {
      await logoutAdmin()
      toast.success('Logged out successfully')
      navigate('/admin/login', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
      // Even if API call fails, clear tokens and redirect
      navigate('/admin/login', { replace: true })
    }
  }

  const handleProfileClick = () => {
    navigate('/admin/profile')
    setIsProfileOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileOpen])

  if (isLoginPage) {
    return null
  }

  return (
    <>
      <header 
        className="fixed left-0 right-0 top-0 z-30 bg-white border-b border-slate-200 shadow-sm lg:left-64"
      >
        <div className="px-4 pt-[calc(1.25rem+var(--app-safe-top))] pb-4 md:px-6">
          {/* Top Section - Admin Info */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Toggle menu"
              >
                {isSidebarOpen ? (
                  <IoCloseOutline className="text-xl" aria-hidden="true" />
                ) : (
                  <IoMenuOutline className="text-xl" aria-hidden="true" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-tight mb-0.5">
                  Admin Dashboard
                </h1>
                <p className="text-sm font-normal text-slate-600 leading-tight">
                  Healthcare Platform Management • <span className="text-slate-900 font-medium">Active</span>
                </p>
              </div>
            </div>
            
            {/* Right side - Notifications and Profile */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              
              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Profile menu"
                >
                  <IoPersonCircleOutline className="h-6 w-6 text-slate-600" aria-hidden="true" />
                  <span className="hidden sm:inline">Admin</span>
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={handleProfileClick}
                        className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        View Profile
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
      />
    </>
  )
}

export default AdminNavbar
