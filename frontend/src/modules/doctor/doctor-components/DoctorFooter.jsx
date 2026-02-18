import { NavLink } from 'react-router-dom'
import {
  IoLogoFacebook,
  IoLogoTwitter,
  IoLogoLinkedin,
  IoLogoInstagram,
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoDocumentTextOutline,
  IoHelpCircleOutline,
  IoShieldCheckmarkOutline,
  IoLockClosedOutline,
  IoMedicalOutline,
} from 'react-icons/io5'
import healwayLogo from '../../../assets/logo/healway-logo.png'

const footerLinks = {
  quickLinks: [
    { label: 'Dashboard', to: '/doctor/dashboard' },
    { label: 'Consultations', to: '/doctor/consultations' },
    { label: 'Patients', to: '/doctor/patients' },
    { label: 'Appointments', to: '/doctor/appointments' },
    { label: 'Wallet', to: '/doctor/wallet' },
    { label: 'Profile', to: '/doctor/profile' },
  ],
  resources: [
    { label: 'Support', to: '/doctor/support' },
    { label: 'Privacy Policy', to: '/doctor/privacy-policy' },
    { label: 'Terms of Service', to: '/doctor/terms-of-service' },
    { label: 'Medical Guidelines', to: '/doctor/medical-guidelines' },
    { label: 'FAQs', to: '/doctor/faq' },
  ],
  legal: [
    { label: 'Privacy Policy', to: '/doctor/privacy-policy' },
    { label: 'Terms & Conditions', to: '/doctor/terms-of-service' },
    { label: 'HIPAA Compliance', to: '/doctor/hipaa-compliance' },
    { label: 'Data Protection', to: '/doctor/data-protection' },
  ],
}

const socialLinks = [
  { icon: IoLogoFacebook, label: 'Facebook', href: '#' },
  { icon: IoLogoTwitter, label: 'Twitter', href: '#' },
  { icon: IoLogoLinkedin, label: 'LinkedIn', href: '#' },
  { icon: IoLogoInstagram, label: 'Instagram', href: '#' },
]

const DoctorFooter = () => {
  const handleLinkClick = () => {
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="hidden lg:block bg-gradient-to-b from-[#0077C2] to-[var(--color-primary-dark)] text-white mt-auto">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info & Logo */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <img
                src={healwayLogo}
                alt="Healway"
                className="h-10 w-auto object-contain brightness-0 invert mb-4"
                loading="lazy"
              />
            </div>
            <p className="text-sm text-slate-200 leading-relaxed mb-6 max-w-md">
              Your trusted healthcare platform connecting doctors and patients for better healthcare services. 
              Empowering medical professionals with advanced tools and seamless patient management.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <IoCallOutline className="h-5 w-5 text-white flex-shrink-0" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-200">
                <IoMailOutline className="h-5 w-5 text-white flex-shrink-0" />
                <span>support@healway.com</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <IoLocationOutline className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
                <span>123 Healthcare Avenue, Medical District, City 12345</span>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-200">Follow Us:</span>
              <div className="flex items-center gap-3">
                {socialLinks.map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 hover:scale-110"
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <IoMedicalOutline className="h-5 w-5" />
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    onClick={handleLinkClick}
                    className="text-sm text-slate-200 hover:text-white transition-colors duration-200 flex items-center gap-2 group cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-white transition-colors"></span>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <IoDocumentTextOutline className="h-5 w-5" />
              Resources
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <NavLink
                    to={link.to}
                    onClick={handleLinkClick}
                    className="text-sm text-slate-200 hover:text-white transition-colors duration-200 flex items-center gap-2 group cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-white transition-colors"></span>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Security */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <IoShieldCheckmarkOutline className="h-5 w-5" />
              Legal & Security
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <NavLink
                    to={link.to}
                    onClick={() => handleLinkClick(link.to)}
                    className="text-sm text-slate-200 hover:text-white transition-colors duration-200 flex items-center gap-2 group cursor-pointer"
                  >
                    <IoLockClosedOutline className="h-3.5 w-3.5 text-slate-400 group-hover:text-white transition-colors" />
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            
            {/* Security Badge */}
            <div className="mt-6 p-3 rounded-lg bg-white/10 border border-white/20">
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <IoShieldCheckmarkOutline className="h-4 w-4 text-green-400" />
                <span>HIPAA Compliant & Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-[var(--color-primary-dark)]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span>© {new Date().getFullYear()} Healway. All rights reserved.</span>
            </div>

            {/* Additional Links */}
            <div className="flex items-center gap-6 text-sm">
              <NavLink
                to="/doctor/support"
                onClick={handleLinkClick}
                className="text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <IoHelpCircleOutline className="h-4 w-4" />
                <span>Need Help?</span>
              </NavLink>
              <span className="text-slate-500">|</span>
              <NavLink
                to="/doctor/privacy-policy"
                onClick={handleLinkClick}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Privacy
              </NavLink>
              <span className="text-slate-500">|</span>
              <NavLink
                to="/doctor/terms-of-service"
                onClick={handleLinkClick}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Terms
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default DoctorFooter

