import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoLogoFacebook,
  IoLogoYoutube,
  IoLogoInstagram,
  IoLogoTwitter,
  IoLogoLinkedin,
  IoMailOutline,
  IoCallOutline,
  IoLogoWhatsapp,
  IoArrowForwardOutline,
  IoPersonOutline,
} from 'react-icons/io5'
import { FaUserMd } from 'react-icons/fa'
import healwayLogo from '../../../assets/logo/healway-logo.png'
import { getPublicFooterSettings } from '../../../services/publicSettingsService'

const defaultFooterSettings = {
  brandImage: '',
  description: 'Your trusted partner in healthcare. Simplifying access to quality medical services, connecting patients with doctors all in one platform.',
  supportPhone: '+91 1234567890',
  supportEmail: 'support@healway.com',
  whatsappNumber: '911234567890',
  facebookUrl: 'https://facebook.com',
  twitterUrl: '',
  linkedinUrl: '',
  instagramUrl: 'https://instagram.com',
  youtubeUrl: 'https://youtube.com',
}

const normalizePhoneForTel = (value) => {
  const cleaned = String(value || '').replace(/[^\d+]/g, '')
  return cleaned || '+911234567890'
}

const normalizeWhatsappNumber = (value) => {
  return String(value || '').replace(/\D/g, '') || '911234567890'
}

const WebFooter = () => {
  const navigate = useNavigate()
  const [footerSettings, setFooterSettings] = useState(defaultFooterSettings)
  const [activeRoleMenu, setActiveRoleMenu] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadFooterSettings = async () => {
      try {
        const response = await getPublicFooterSettings()
        if (!isMounted) return

        setFooterSettings((prev) => ({
          ...prev,
          ...(response || {}),
        }))
      } catch (error) {
        console.error('Failed to load footer settings:', error)
      }
    }

    loadFooterSettings()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!activeRoleMenu) return undefined

    const handleOutsideClick = (event) => {
      const clickedInsideMenu = event.target.closest('[data-legal-menu]')
      if (!clickedInsideMenu) {
        setActiveRoleMenu(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [activeRoleMenu])

  const socialLinks = useMemo(() => {
    return [
      { icon: IoLogoFacebook, label: 'Facebook', href: footerSettings.facebookUrl, color: 'hover:text-blue-500' },
      { icon: IoLogoTwitter, label: 'Twitter', href: footerSettings.twitterUrl, color: 'hover:text-sky-400' },
      { icon: IoLogoLinkedin, label: 'LinkedIn', href: footerSettings.linkedinUrl, color: 'hover:text-blue-600' },
      { icon: IoLogoInstagram, label: 'Instagram', href: footerSettings.instagramUrl, color: 'hover:text-pink-500' },
      { icon: IoLogoYoutube, label: 'YouTube', href: footerSettings.youtubeUrl, color: 'hover:text-red-500' },
    ].filter((item) => item.href)
  }, [footerSettings.facebookUrl, footerSettings.twitterUrl, footerSettings.linkedinUrl, footerSettings.instagramUrl, footerSettings.youtubeUrl])

  const patientLinks = [
    {
      icon: IoPersonOutline,
      label: 'Patient Signup',
      action: () => navigate('/onboarding', { state: { initialMode: 'signup', initialRole: 'patient' } }),
    },
  ]

  const doctorLinks = [
    {
      icon: FaUserMd,
      label: 'Doctor',
      action: () => navigate('/onboarding', { state: { initialMode: 'signup', initialRole: 'doctor' } }),
    },
  ]

  const openLegalPage = (type, role) => {
    setActiveRoleMenu(null)

    if (type === 'privacy') {
      navigate(role === 'doctor' ? '/doctor/privacy-policy' : '/privacy')
      return
    }

    navigate(role === 'doctor' ? '/doctor/terms-of-service' : '/terms')
  }

  const supportLinks = [
    { label: 'Contact Us', action: () => navigate('/contact-us') },
    { label: 'FAQ', action: () => navigate('/faq') },
    { label: 'Help Center', action: () => navigate('/help-center') },
    { label: 'Privacy Policy', type: 'privacy' },
    { label: 'Terms of Service', type: 'terms' },
  ]

  const contactInfo = [
    {
      icon: IoCallOutline,
      text: footerSettings.supportPhone || defaultFooterSettings.supportPhone,
      link: `tel:${normalizePhoneForTel(footerSettings.supportPhone)}`,
      color: 'text-blue-400',
    },
    {
      icon: IoMailOutline,
      text: footerSettings.supportEmail || defaultFooterSettings.supportEmail,
      link: `mailto:${footerSettings.supportEmail || defaultFooterSettings.supportEmail}`,
      color: 'text-green-400',
    },
    {
      icon: IoLogoWhatsapp,
      text: 'WhatsApp Support',
      link: `https://wa.me/${normalizeWhatsappNumber(footerSettings.whatsappNumber)}`,
      color: 'text-green-500',
    },
  ]

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#10b981] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-8 sm:px-6 lg:px-8">
        <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          <div className="space-y-4 lg:col-span-2">
            <div className="mb-4 flex min-h-[56px] items-center">
              <img
                src={footerSettings.brandImage || healwayLogo}
                alt="Healway"
                className={`w-auto object-contain ${footerSettings.brandImage ? 'max-h-16' : 'h-10 brightness-0 invert filter'}`}
              />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-300">
              {footerSettings.description || defaultFooterSettings.description}
            </p>

            <div className="space-y-2 pt-2">
              {contactInfo.map((contact, index) => (
                <a
                  key={index}
                  href={contact.link}
                  target={contact.link.startsWith('http') ? '_blank' : undefined}
                  rel={contact.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group flex items-center gap-3 text-sm text-slate-300 transition-colors hover:text-white"
                >
                  <contact.icon className={`h-5 w-5 ${contact.color} transition-transform group-hover:scale-110`} />
                  <span>{contact.text}</span>
                  {contact.link.startsWith('http') && (
                    <IoArrowForwardOutline className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </a>
              ))}
            </div>

            {socialLinks.length > 0 && (
              <div className="pt-4">
                <h4 className="mb-3 text-sm font-semibold text-white">Follow Us</h4>
                <div className="flex items-center gap-3">
                  {socialLinks.map(({ icon: Icon, label, href, color }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:border-white/20 hover:bg-white/20 ${color}`}
                      aria-label={label}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <span className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400"></span>
              For Patients
            </h4>
            <ul className="space-y-2.5">
              {patientLinks.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={link.action}
                    className="group flex cursor-pointer items-center gap-2 text-sm text-slate-300 transition-all duration-200 hover:text-white"
                  >
                    {link.icon && <link.icon className="h-4 w-4 shrink-0" />}
                    <span>{link.label}</span>
                    <IoArrowForwardOutline className="h-3 w-3 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <span className="h-6 w-1 rounded-full bg-gradient-to-b from-green-400 to-emerald-400"></span>
              For Doctors
            </h4>
            <ul className="space-y-2.5">
              {doctorLinks.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={link.action}
                    className="group flex w-full cursor-pointer items-center gap-2 text-left text-sm text-slate-300 transition-all duration-200 hover:text-white"
                  >
                    {link.icon && <link.icon className="h-4 w-4 shrink-0" />}
                    <span className="flex-1">{link.label}</span>
                    <IoArrowForwardOutline className="h-3 w-3 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <span className="h-6 w-1 rounded-full bg-gradient-to-b from-purple-400 to-pink-400"></span>
              Support
            </h4>
            <ul className="space-y-2.5">
              {supportLinks.map((link, index) => (
                <li key={index} className="relative" data-legal-menu>
                  <button
                    onClick={() => {
                      if (link.type) {
                        setActiveRoleMenu((prev) => (prev === `support-${link.type}` ? null : `support-${link.type}`))
                        return
                      }
                      link.action()
                    }}
                    className="group flex cursor-pointer items-center gap-2 text-sm text-slate-300 transition-all duration-200 hover:text-white"
                  >
                    <IoArrowForwardOutline className="h-3 w-3 -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    <span>{link.label}</span>
                  </button>
                  {link.type && activeRoleMenu === `support-${link.type}` && (
                    <div className="mt-2 flex w-40 flex-col gap-1 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-xl">
                      <button
                        onClick={() => openLegalPage(link.type, 'patient')}
                        className="rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                      >
                        Patient
                      </button>
                      <button
                        onClick={() => openLegalPage(link.type, 'doctor')}
                        className="rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                      >
                        Doctor
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-800/50 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-sm text-slate-400 md:text-left">
              &copy; {new Date().getFullYear()} Healway. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <div className="relative" data-legal-menu>
                <button
                  onClick={() => setActiveRoleMenu((prev) => (prev === 'bottom-privacy' ? null : 'bottom-privacy'))}
                  className="transition-colors hover:text-white"
                >
                  Privacy Policy
                </button>
                {activeRoleMenu === 'bottom-privacy' && (
                  <div className="absolute bottom-full right-0 mb-2 flex w-40 flex-col gap-1 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-xl">
                    <button
                      onClick={() => openLegalPage('privacy', 'patient')}
                      className="rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      Patient
                    </button>
                    <button
                      onClick={() => openLegalPage('privacy', 'doctor')}
                      className="rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      Doctor
                    </button>
                  </div>
                )}
              </div>
              <span className="text-slate-600">•</span>
              <div className="relative" data-legal-menu>
                <button
                  onClick={() => setActiveRoleMenu((prev) => (prev === 'bottom-terms' ? null : 'bottom-terms'))}
                  className="transition-colors hover:text-white"
                >
                  Terms of Service
                </button>
                {activeRoleMenu === 'bottom-terms' && (
                  <div className="absolute bottom-full right-0 mb-2 flex w-40 flex-col gap-1 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-xl">
                    <button
                      onClick={() => openLegalPage('terms', 'patient')}
                      className="rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      Patient
                    </button>
                    <button
                      onClick={() => openLegalPage('terms', 'doctor')}
                      className="rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      Doctor
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default WebFooter
