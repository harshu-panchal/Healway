import { useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  IoHomeOutline,
  IoPeopleOutline,
  IoPersonCircleOutline,
  IoMenuOutline,
  IoHelpCircleOutline,
  IoReceiptOutline,
  IoArchiveOutline,
  IoMegaphoneOutline,
} from 'react-icons/io5'
import healwayLogo from '../../../assets/logo/healway-logo.png'
import PatientSidebar from './PatientSidebar'
import { useToast } from '../../../contexts/ToastContext'
import NotificationBell from '../../../components/NotificationBell'

// All nav items for sidebar and desktop navbar (includes Support)
// This is used for: Sidebar (mobile menu) and Desktop top navbar
// All nav items for sidebar and desktop navbar (includes Support)
// This is used for: Sidebar (mobile menu) and Desktop top navbar
const allNavItems = [
  { id: 'home', label: 'Home', to: '/patient/dashboard', Icon: IoHomeOutline },
  { id: 'announcements', label: 'Announcements', to: '/patient/announcements', Icon: IoMegaphoneOutline },
  { id: 'doctors', label: 'Doctors', to: '/patient/doctors', Icon: IoPeopleOutline },
  { id: 'transactions', label: 'Transactions', to: '/patient/transactions', Icon: IoReceiptOutline },
  { id: 'support', label: 'Support', to: '/patient/support', Icon: IoHelpCircleOutline },
  { id: 'profile', label: 'Profile', to: '/patient/profile', Icon: IoPersonCircleOutline },
]

// Nav items for mobile bottom navbar ONLY (excludes Support)
// Note: Sidebar uses allNavItems, bottom nav uses navItems
const navItems = allNavItems.filter((item) => item.id !== 'support')

const PatientNavbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const toggleButtonRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Hide top header only on dashboard page
  const isDashboardPage = location.pathname === '/patient/dashboard' || location.pathname === '/patient/'
  // Hide navbar completely on login page
  const isLoginPage = location.pathname === '/patient/login'

  const mobileLinkBase =
    'flex flex-col flex-1 items-center justify-center gap-0.5 px-1 py-1 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2'
  const mobileLinkFocusStyle = { '--tw-ring-color': 'rgba(0, 119, 194, 0.7)' }

  const mobileIconWrapper =
    'flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all duration-200'

  const desktopLinkBase =
    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
  const desktopLinkFocusStyle = { '--tw-ring-color': 'rgba(0, 119, 194, 0.7)' }

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
      // Import logout function from patientService
      const { logoutPatient } = await import('../patient-services/patientService')
      await logoutPatient()
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Error during logout:', error)
      // Clear tokens manually if API call fails
      const { clearPatientTokens } = await import('../patient-services/patientService')
      clearPatientTokens()
      toast.success('Logged out successfully')
    }
    // Navigate to login page
    setTimeout(() => {
      navigate('/patient/login', { replace: true })
    }, 500)
  }

  return (
    <>
      {/* Top Header - Hidden on dashboard and login pages */}
      {!isDashboardPage && !isLoginPage && (
        <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-white/95 px-4 pt-[calc(0.75rem+var(--app-safe-top))] pb-3 backdrop-blur shadow md:px-6">
          <div className="flex items-center">
            <img
              src={healwayLogo}
              alt="Healway"
              className="h-8 w-auto object-contain"
              loading="lazy"
            />
          </div>
          <nav className="hidden items-center gap-2 rounded-full bg-white/90 px-2 py-1 shadow-lg ring-1 ring-slate-200 md:flex" style={{ boxShadow: '0 10px 15px -3px var(--color-primary-surface), 0 4px 6px -2px rgba(0, 119, 194, 0.05)' }}>
            {allNavItems.map(({ id, label, to, Icon }) => (
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

      <PatientSidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        navItems={allNavItems}
        onLogout={handleLogout}
      />

      {/* Mobile Bottom Navbar - Uses navItems (excludes Support) */}
      {!isLoginPage && (
        <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around gap-1 border-t border-slate-200 bg-white/95 px-3 pt-2 pb-[calc(0.5rem+var(--app-safe-bottom))] backdrop-blur md:hidden">
          {navItems.map(({ id, label, to, Icon }) => (
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
                    style={isActive ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 6px -1px var(--color-primary-border), 0 2px 4px -1px var(--color-primary-surface)' } : {}}
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

export default PatientNavbar

