import { NavLink, useNavigate } from 'react-router-dom'
import {
  IoHomeOutline,
  IoPersonCircleOutline,
  IoNotificationsOutline,
  IoWalletOutline,
  IoDocumentTextOutline,
  IoPeopleOutline,
  IoHelpCircleOutline,
  IoLogOutOutline,
  IoMegaphoneOutline,
  IoTimeOutline,
} from 'react-icons/io5'
import healwayLogo from '../../../assets/logo/healway-logo.png'
import { useToast } from '../../../contexts/ToastContext'
import NotificationBell from '../../../components/NotificationBell'

const navItems = [
  { id: 'home', label: 'Dashboard', to: '/doctor/dashboard', Icon: IoHomeOutline },
  { id: 'appointments', label: 'Appointments', to: '/doctor/appointments', Icon: IoTimeOutline },
  { id: 'consultations', label: 'Consultations', to: '/doctor/consultations', Icon: IoDocumentTextOutline },
  { id: 'patients', label: 'Patients', to: '/doctor/patients', Icon: IoPeopleOutline },
  { id: 'wallet', label: 'Wallet', to: '/doctor/wallet', Icon: IoWalletOutline },
  { id: 'support', label: 'Support', to: '/doctor/support', Icon: IoHelpCircleOutline },
  { id: 'profile', label: 'Profile', to: '/doctor/profile', Icon: IoPersonCircleOutline },
]

const DoctorHeader = () => {
  const navigate = useNavigate()
  const toast = useToast()

  // Session state detection mechanism
  const isSessionActive = () => {
    const savedConsultation = localStorage.getItem('doctorSelectedConsultation')
    if (savedConsultation) {
      try {
        const parsed = JSON.parse(savedConsultation)
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
    ? navItems.filter(item => item.id !== 'patients')
    : navItems

  const handleLogout = async () => {
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
    // Force navigation to login page
    setTimeout(() => {
      window.location.href = '/doctor/login'
    }, 500)
  }

  return (
    <header className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <NavLink to="/doctor/dashboard" className="flex items-center">
              <img
                src={healwayLogo}
                alt="Healway"
                className="h-10 w-auto object-contain"
                loading="lazy"
              />
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {filteredNavItems.map(({ id, label, to, Icon }) => (
              <NavLink
                key={id}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
                end={id === 'home'}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Side - Notifications & Profile */}
          <div className="flex items-center gap-4">
            <NotificationBell />

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <IoLogOutOutline className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default DoctorHeader

