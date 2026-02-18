import { useNavigate } from 'react-router-dom'
import {
  IoLogoFacebook,
  IoLogoTwitter,
  IoLogoLinkedin,
  IoLogoInstagram,
  IoMailOutline,
  IoCallOutline,
  IoLogoWhatsapp,
  IoArrowForwardOutline,
} from 'react-icons/io5'
import {
  FaUserMd,
} from 'react-icons/fa'
import healwayLogo from '../../../assets/logo/healway-logo.png'

const WebFooter = () => {
  const navigate = useNavigate()

  const scrollToSection = (sectionId) => {
    const element = document.querySelector(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const socialLinks = [
    { icon: IoLogoFacebook, label: 'Facebook', href: 'https://facebook.com', color: 'hover:text-blue-500' },
    { icon: IoLogoTwitter, label: 'Twitter', href: 'https://twitter.com', color: 'hover:text-sky-400' },
    { icon: IoLogoLinkedin, label: 'LinkedIn', href: 'https://linkedin.com', color: 'hover:text-blue-600' },
    { icon: IoLogoInstagram, label: 'Instagram', href: 'https://instagram.com', color: 'hover:text-pink-500' },
  ]

  const patientLinks = [
    { label: 'Services', action: () => scrollToSection('#features') },
    { label: 'Book Appointment', action: () => navigate('/onboarding') },
    { label: 'Health Records', action: () => navigate('/onboarding') },
  ]

  const providerLinks = [
    { icon: FaUserMd, label: 'For Doctors', action: () => scrollToSection('#doctors') },
    { label: 'Join as Provider', action: () => navigate('/onboarding') },
  ]

  const supportLinks = [
    { label: 'Contact Us', action: () => scrollToSection('#contact') },
    { label: 'FAQ', action: () => { } },
    { label: 'Help Center', action: () => { } },
    { label: 'Privacy Policy', action: () => { } },
    { label: 'Terms of Service', action: () => { } },
  ]

  const contactInfo = [
    { icon: IoCallOutline, text: '+91 1234567890', link: 'tel:+911234567890', color: 'text-blue-400' },
    { icon: IoMailOutline, text: 'support@healway.com', link: 'mailto:support@healway.com', color: 'text-green-400' },
    { icon: IoLogoWhatsapp, text: 'WhatsApp Support', link: 'https://wa.me/911234567890', color: 'text-green-500' },
  ]

  return (
    <footer className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#10b981] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-10">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-4">
            <img
              src={healwayLogo}
              alt="Healway"
              className="h-10 w-auto object-contain filter brightness-0 invert mb-4"
            />
            <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
              Your trusted partner in healthcare. Simplifying access to quality medical services, connecting patients with doctors all in one platform.
            </p>

            {/* Contact Information */}
            <div className="space-y-2 pt-2">
              {contactInfo.map((contact, index) => (
                <a
                  key={index}
                  href={contact.link}
                  target={contact.link.startsWith('http') ? '_blank' : undefined}
                  rel={contact.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors group"
                >
                  <contact.icon className={`h-5 w-5 ${contact.color} group-hover:scale-110 transition-transform`} />
                  <span>{contact.text}</span>
                  {contact.link.startsWith('http') && (
                    <IoArrowForwardOutline className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </a>
              ))}
            </div>

            {/* Social Media */}
            <div className="pt-4">
              <h4 className="text-sm font-semibold text-white mb-3">Follow Us</h4>
              <div className="flex items-center gap-3">
                {socialLinks.map(({ icon: Icon, label, href, color }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 hover:border-white/20 transition-all duration-200 hover:scale-110 ${color}`}
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* For Patients */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></span>
              For Patients
            </h4>
            <ul className="space-y-2.5">
              {patientLinks.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={link.action}
                    className="text-sm text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-2 group cursor-pointer"
                  >
                    <IoArrowForwardOutline className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* For Providers */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-green-400 to-emerald-400 rounded-full"></span>
              For Providers
            </h4>
            <ul className="space-y-2.5">
              {providerLinks.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={link.action}
                    className="text-sm text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-2 group cursor-pointer w-full text-left"
                  >
                    {link.icon && <link.icon className="h-4 w-4 shrink-0" />}
                    <IoArrowForwardOutline className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all ml-auto" />
                    <span className="flex-1">{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></span>
              Support
            </h4>
            <ul className="space-y-2.5">
              {supportLinks.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={link.action}
                    className="text-sm text-slate-300 hover:text-white transition-all duration-200 flex items-center gap-2 group cursor-pointer"
                  >
                    <IoArrowForwardOutline className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    <span>{link.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800/50 pt-8 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400 text-center md:text-left">
              &copy; {new Date().getFullYear()} Healway. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <button
                onClick={() => { }}
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={() => { }}
                className="hover:text-white transition-colors"
              >
                Terms of Service
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={() => { }}
                className="hover:text-white transition-colors"
              >
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default WebFooter
