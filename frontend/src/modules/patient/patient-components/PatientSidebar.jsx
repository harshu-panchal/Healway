import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { IoCloseOutline, IoLogOutOutline } from 'react-icons/io5'

const PatientSidebar = ({ isOpen, onClose, navItems = [], onLogout }) => {
  const closeButtonRef = useRef(null)
  const overlayClasses = `fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${
    isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
  }`

  const sidebarClasses = `fixed inset-y-0 right-0 z-50 flex w-4/5 max-w-xs transform flex-col bg-white p-5 shadow-xl transition-transform duration-200 ${
    isOpen ? 'translate-x-0' : 'translate-x-full'
  }`

  const linkBaseClasses =
    'flex items-center gap-3 rounded-xl px-3 py-2 text-base font-medium text-slate-600 transition-colors duration-200'

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus({ preventScroll: true })
    }
  }, [isOpen, navItems])

  return (
    <>
      <div className={overlayClasses} role="presentation" onClick={onClose} aria-hidden={!isOpen} />

      <aside
        className={sidebarClasses}
        aria-hidden={!isOpen}
        aria-modal="true"
        role="dialog"
        inert={!isOpen}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
          <button
            type="button"
            ref={closeButtonRef}
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-500 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Close menu"
            onClick={onClose}
          >
            <IoCloseOutline aria-hidden="true" />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {navItems.map(({ id, label, to, Icon }) => (
            <NavLink
              key={id}
              to={to}
              className={({ isActive }) =>
                `${linkBaseClasses} ${
                  isActive ? 'text-primary' : 'hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: 'var(--color-primary-surface)' } : {}}
              onClick={onClose}
              end={id === 'home'}
            >
              {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {onLogout ? (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <button
              type="button"
              className={`${linkBaseClasses} w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700`}
              onClick={() => {
                onClose?.()
                onLogout()
              }}
            >
              <IoLogOutOutline className="h-5 w-5" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        ) : null}
      </aside>
    </>
  )
}

export default PatientSidebar

