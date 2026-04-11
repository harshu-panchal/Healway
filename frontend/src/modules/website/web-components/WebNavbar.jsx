import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  IoMenuOutline,
  IoCloseOutline,
  IoHomeOutline,
  IoPersonAddOutline,
} from 'react-icons/io5'
import { FaUserMd } from 'react-icons/fa'
import healwayLogo from '../../../assets/logo/healway-logo.png'

const WebNavbar = () => {
  const [scrollY, setScrollY] = useState(0)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setScrollY(currentScrollY)

      if (isMobileMenuOpen || currentScrollY < 10) {
        setIsVisible(true)
      } else {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false)
        } else if (currentScrollY < lastScrollY) {
          setIsVisible(true)
        }
      }

      setLastScrollY(currentScrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, isMobileMenuOpen])

  const baseOpacity = 0.7
  const scrollThreshold = 50
  const scrollOpacity = Math.min(scrollY / scrollThreshold * 0.3, 0.3)
  const opacity = baseOpacity + scrollOpacity

  const baseBlur = 8
  const scrollBlur = Math.min(scrollY / scrollThreshold * 8, 8)
  const blurIntensity = baseBlur + scrollBlur

  const borderOpacity = scrollY > 0 ? Math.min(scrollY / scrollThreshold * 0.4, 0.4) : 0.2

  const navLinks = [
    { label: 'Home', to: '/', icon: IoHomeOutline },
    { label: 'For Patients', to: '#features', icon: null },
    { label: 'For Doctors', to: '#doctors', icon: FaUserMd },
  ]

  const handleNavClick = (e, to) => {
    if (to.startsWith('#')) {
      e.preventDefault()
      const element = document.querySelector(to)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setIsMobileMenuOpen(false)
    } else {
      setIsMobileMenuOpen(false)
    }
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out"
      style={{
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        backgroundColor: `rgba(255, 255, 255, ${opacity})`,
        backdropFilter: `blur(${blurIntensity}px)`,
        WebkitBackdropFilter: `blur(${blurIntensity}px)`,
        borderBottom: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => navigate('/')}
          >
            <img
              src={healwayLogo}
              alt="Healway"
              className="h-13 md:h-13 w-auto object-contain"
              loading="eager"
            />
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <a
                  key={link.label}
                  href={link.to}
                  onClick={(e) => handleNavClick(e, link.to)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${isActive(link.to)
                    ? 'text-primary bg-primary/10'
                    : 'text-slate-700 hover:text-primary hover:bg-slate-100'
                    }`}
                >
                  {Icon && <Icon className="text-base" />}
                  <span>{link.label}</span>
                </a>
              )
            })}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => navigate('/onboarding')}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors shadow-md hover:shadow-lg"
            >
              <IoPersonAddOutline className="text-lg" />
              <span>Get Started</span>
            </button>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <IoCloseOutline className="text-2xl" />
            ) : (
              <IoMenuOutline className="text-2xl" />
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden border-t border-white/20 transition-all duration-500 ease-in-out"
          style={{
            backgroundColor: `rgba(255, 255, 255, ${opacity})`,
            backdropFilter: `blur(${blurIntensity}px)`,
            WebkitBackdropFilter: `blur(${blurIntensity}px)`,
          }}
        >
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <a
                  key={link.label}
                  href={link.to}
                  onClick={(e) => handleNavClick(e, link.to)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive(link.to)
                    ? 'text-primary bg-primary/10'
                    : 'text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  {Icon && <Icon className="text-xl" />}
                  <span>{link.label}</span>
                </a>
              )
            })}
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  navigate('/onboarding')
                  setIsMobileMenuOpen(false)
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg text-base font-semibold hover:bg-primary-dark transition-colors shadow-md"
              >
                <IoPersonAddOutline className="text-xl" />
                <span>Get Started</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default WebNavbar
