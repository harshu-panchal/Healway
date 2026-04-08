import { useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  IoHomeOutline,
  IoPersonCircleOutline,
  IoMenuOutline,
  IoWalletOutline,
  IoDocumentTextOutline,
  IoPeopleOutline,
  IoHelpCircleOutline,
  IoMegaphoneOutline,
  IoTimeOutline,
} from 'react-icons/io5'
import healwayLogo from '../../../assets/logo/healway-logo.png'
import DoctorSidebar from './DoctorSidebar'
import { useToast } from '../../../contexts/ToastContext'
import NotificationBell from '../../../components/NotificationBell'

const allNavItems = [
  { id: 'home', label: 'Dashboard', to: '/doctor/dashboard', Icon: IoHomeOutline },
  { id: 'queue', label: 'Queue', to: '/doctor/queue', Icon: IoTimeOutline },
  { id: 'consultations', label: 'Consultations', to: '/doctor/consultations', Icon: IoDocumentTextOutline },
  { id: 'patients', label: 'Patients', to: '/doctor/patients', Icon: IoPeopleOutline },
  { id: 'announcements', label: 'Announcements', to: '/doctor/announcements', Icon: IoMegaphoneOutline },
  { id: 'wallet', label: 'Wallet', to: '/doctor/wallet', Icon: IoWalletOutline },
  { id: 'support', label: 'Support', to: '/doctor/support', Icon: IoHelpCircleOutline },
  { id: 'profile', label: 'Profile', to: '/doctor/profile', Icon: IoPersonCircleOutline },
]

// Navbar items for mobile bottom nav (without Support and Announcements)
const navbarItems = allNavItems.filter((item) => item.id !== 'support' && item.id !== 'announcements')

const DoctorNavbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const toggleButtonRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Session state detection mechanism
  const isSessionActive = () => {
    // Check for active consultation in localStorage
    const savedConsultation = localStorage.getItem('doctorSelectedConsultation')
    if (savedConsultation) {
      try {
        const parsed = JSON.parse(savedConsultation)
        // If status is in-progress and not completed, session is active
        return parsed && parsed.status === 'in-progress'
      } catch (e) {
        return false
      }
    }
    return false
  }

  const sessionActive = isSessionActive()

  // Filter navItems based on session state
  const filteredNavItems = sessionActive
    ? allNavItems.filter(item => item.id !== 'patients')
    : allNavItems

  // Header nav keeps existing session-aware behavior.
  const navbarItems = filteredNavItems.filter((item) => item.id !== 'support' && item.id !== 'announcements' && item.id !== 'queue')

  // Bottom nav should remain stable with 5 items for consistent mobile UX.
  const bottomNavbarItems = allNavItems.filter((item) => item.id !== 'support' && item.id !== 'announcements' && item.id !== 'queue')

  // Hide header on dashboard and login pages
  const isDashboardPage = location.pathname === '/doctor/dashboard' || location.pathname === '/doctor/'
  const isLoginPage = location.pathname === '/doctor/login'

  const mobileLinkBase =
    'flex flex-col flex-1 items-center justify-center gap-0.5 px-1 py-1 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[rgba(0,119,194,0.7)] focus-visible:ring-offset-2'

  const mobileIconWrapper =
    'flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all duration-200'

  const desktopLinkBase =
    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,119,194,0.7)] focus-visible:ring-offset-2'

  const handleSidebarToggle = () => {
    if (isSidebarOpen) {
      handleSidebarClose()
    } else {
      setIsSidebarOpen(true)
    }
  }

  const handleSidebarClose = () => {
    toggleButtonRef.current?.focus({ preventScroll: true })
    setIsSidebarOpen(false)
  }

  const handleLogout = async () => {
    handleSidebarClose()
    try {
      const { logoutDoctor } = await import('../doctor-services/doctorService')
      await logoutDoctor()
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Error during logout:', error)
      // Clear tokens manually if API call fails
      const { clearDoctorTokens } = await import('../doctor-services/doctorService')
      clearDoctorTokens()
      toast.success('Logged out successfully')
    }
    // Force navigation to login page - full page reload to clear all state
    setTimeout(() => {
      window.location.href = '/doctor/login'
    }, 500)
  }

  return (
    <>
      {!isDashboardPage && !isLoginPage && (
        <header className="lg:hidden fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-white/95 px-4 pt-[calc(0.75rem+var(--app-safe-top))] pb-3 backdrop-blur shadow md:px-6">
          <div className="flex items-center">
            <img
              src={healwayLogo}
              alt="Healway"
              className="h-8 w-auto object-contain"
              loading="lazy"
            />
          </div>
          <nav className="hidden items-center gap-2 rounded-full bg-white/90 px-2 py-1 shadow-lg shadow-[rgba(0,119,194,0.1)] ring-1 ring-slate-200 md:flex lg:hidden">
            {navbarItems.map(({ id, label, to, Icon }) => (
              <NavLink
                key={id}
                to={to}
                className={({ isActive }) =>
                  `${desktopLinkBase} ${isActive ? 'text-white shadow-sm' : 'hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
                style={({ isActive }) => isActive ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 1px 2px 0 var(--color-primary-border)' } : {}}
                end={id === 'home'}
              >
                {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
                <span>{label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-red-500 transition-all duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Logout
            </button>
          </nav>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <NotificationBell />
            </div>
            <button
              type="button"
              ref={toggleButtonRef}
              className="md:hidden"
              aria-label="Toggle navigation menu"
              onClick={handleSidebarToggle}
            >
              <IoMenuOutline className="text-2xl text-slate-600" aria-hidden="true" />
            </button>
          </div>
        </header>
      )}

      <DoctorSidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        navItems={filteredNavItems}
        onLogout={handleLogout}
      />

      {!isLoginPage && (
        <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around gap-1 border-t border-slate-200 bg-white/95 px-3 pt-2 pb-[calc(0.5rem+var(--app-safe-bottom))] backdrop-blur md:hidden">
          {bottomNavbarItems.map(({ id, label, to, Icon }) => (
            <NavLink
              key={id}
              to={to}
              className={({ isActive }) =>
                `${mobileLinkBase} ${isActive ? '' : 'text-slate-400 hover:text-slate-600'
                }`
              }
              style={({ isActive }) => isActive ? { color: 'var(--color-primary)' } : {}}
              end={id === 'home'}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`${mobileIconWrapper} ${isActive
                      ? 'text-white shadow-md'
                      : 'bg-slate-100 text-slate-500'
                      }`}
                    style={isActive ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 6px -1px var(--color-primary-border)' } : {}}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className={`text-[9px] font-semibold leading-none ${isActive ? '' : 'text-slate-400'}`} style={isActive ? { color: 'var(--color-primary)' } : {}}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  )
}

export default DoctorNavbar

