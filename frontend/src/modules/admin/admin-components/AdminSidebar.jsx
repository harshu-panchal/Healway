import { NavLink, useLocation } from 'react-router-dom'
import { IoLogOutOutline, IoBarChartOutline, IoCloseOutline } from 'react-icons/io5'
import {
  IoPeopleOutline,
  IoMedicalOutline,
  IoWalletOutline,
  IoShieldCheckmarkOutline,
  IoHelpCircleOutline,
  IoMegaphoneOutline,
} from 'react-icons/io5'

const sidebarNavItems = [
  { id: 'overview', label: 'Overview', to: '/admin/dashboard', Icon: IoBarChartOutline },
  { id: 'verification', label: 'Verification', to: '/admin/verification', Icon: IoShieldCheckmarkOutline },
  { id: 'doctors', label: 'Doctors', to: '/admin/doctors', Icon: IoMedicalOutline },
  { id: 'patients', label: 'Patients', to: '/admin/users', Icon: IoPeopleOutline },
  { id: 'specialization', label: 'Specialization', to: '/admin/specialization', Icon: IoPeopleOutline },
  { id: 'service', label: 'Services', to: '/admin/services', Icon: IoMegaphoneOutline },
  { id: 'wallet', label: 'Wallet', to: '/admin/wallet', Icon: IoWalletOutline },
  { id: 'announcements', label: 'Announcements', to: '/admin/announcements', Icon: IoMegaphoneOutline },
  { id: 'support', label: 'Support', to: '/admin/support', Icon: IoHelpCircleOutline },
]

const AdminSidebar = ({ isOpen, onClose, onLogout }) => {
  const location = useLocation()
  const isLoginPage = location.pathname === '/admin/login'

  if (isLoginPage) {
    return null
  }

  // Overlay for mobile
  const overlayClasses = `fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`

  // Sidebar classes - hidden on mobile by default, visible on lg screens
  const sidebarClasses = `fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary text-white transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }`

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={overlayClasses}
        onClick={onClose}
        aria-hidden={!isOpen}
        role="presentation"
      />

      {/* Sidebar */}
      <aside
        className={sidebarClasses}
        aria-hidden={isLoginPage}
      >
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-6 border-b border-white/20">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-white">Healway</h1>
            <p className="mt-1 text-sm text-white/70">Admin Dashboard</p>
          </div>
          {/* Close button for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Close menu"
          >
            <IoCloseOutline className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 px-3 py-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">
          {sidebarNavItems.map(({ id, label, to, Icon }) => {
            const isActive = location.pathname === to || (id === 'overview' && location.pathname === '/admin/dashboard')
            return (
              <NavLink
                key={id}
                to={to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {Icon && <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />}
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Logout - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-white/20 px-3 py-4 bg-primary">
          <button
            type="button"
            onClick={() => {
              onClose?.()
              onLogout?.()
            }}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <IoLogOutOutline className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default AdminSidebar
