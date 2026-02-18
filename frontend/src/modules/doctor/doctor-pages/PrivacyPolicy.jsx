import { IoShieldCheckmarkOutline, IoLockClosedOutline, IoDocumentTextOutline, IoArrowBackOutline, IoCheckmarkCircleOutline, IoPersonOutline, IoWalletOutline, IoChatbubbleOutline, IoStarOutline } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const PrivacyPolicy = () => {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    setIsVisible(true)
  }, [])
  
  return (
    <div className="hidden lg:block min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      <div className="relative z-10">
        {/* Back Button */}
        <div className="max-w-5xl mx-auto px-8 pt-8">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:text-primary hover:bg-white/80 transition-all duration-300 hover:shadow-md mb-6"
          >
            <IoArrowBackOutline className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back</span>
          </button>
        </div>
        
        <div className="max-w-5xl mx-auto px-8 pb-16">
          {/* Animated Header */}
          <div className={`mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0077C2] to-[var(--color-primary-dark)] text-white shadow-xl transform hover:scale-110 transition-transform duration-300">
                <IoShieldCheckmarkOutline className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#0077C2] to-blue-600 bg-clip-text text-transparent">
                  Privacy Policy
                </h1>
                <p className="text-sm text-slate-600 mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Last updated: January 2025
                </p>
              </div>
            </div>
          </div>

          {/* Content with Animations */}
          <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/50 p-10 space-y-10 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Introduction */}
          <section className="group">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0077C2] to-blue-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                <IoDocumentTextOutline className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Introduction</h2>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-l-4 border-primary shadow-sm">
              <p className="text-slate-700 leading-relaxed text-lg">
                At <span className="font-semibold text-primary">Healway</span>, we are committed to protecting your privacy and ensuring the security of your personal and medical information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform as a healthcare professional.
              </p>
            </div>
          </section>

          {/* Information We Collect */}
          <section className="group">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-[#0077C2] to-blue-600 rounded-full"></div>
              Information We Collect
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
                    <IoPersonOutline className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800">Personal Information</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'Name, contact details, and professional credentials',
                    'Medical license numbers and certifications',
                    'Bank account details for payment processing',
                    'Profile information and clinic details'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-700 group/item">
                      <IoCheckmarkCircleOutline className="h-5 w-5 text-blue-600 shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white">
                    <IoDocumentTextOutline className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800">Usage Data</h3>
                </div>
                <ul className="space-y-3">
                  {[
                    'Platform usage patterns and interactions',
                    'Device information and IP addresses',
                    'Cookies and tracking technologies'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-700 group/item">
                      <IoCheckmarkCircleOutline className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-[#0077C2] to-blue-600 rounded-full"></div>
              How We Use Your Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: IoDocumentTextOutline, text: 'Provide and maintain healthcare platform services', bg: 'from-blue-50 to-white', border: 'border-blue-100', iconBg: 'bg-blue-500' },
                { icon: IoWalletOutline, text: 'Process payments and manage your wallet', bg: 'from-emerald-50 to-white', border: 'border-emerald-100', iconBg: 'bg-emerald-500' },
                { icon: IoChatbubbleOutline, text: 'Communicate about appointments and consultations', bg: 'from-purple-50 to-white', border: 'border-purple-100', iconBg: 'bg-purple-500' },
                { icon: IoStarOutline, text: 'Improve our services and user experience', bg: 'from-amber-50 to-white', border: 'border-amber-100', iconBg: 'bg-amber-500' },
                { icon: IoShieldCheckmarkOutline, text: 'Comply with legal and regulatory requirements', bg: 'from-indigo-50 to-white', border: 'border-indigo-100', iconBg: 'bg-indigo-500' },
                { icon: IoLockClosedOutline, text: 'Ensure platform security and prevent fraud', bg: 'from-red-50 to-white', border: 'border-red-100', iconBg: 'bg-red-500' }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className={`bg-gradient-to-br ${item.bg} rounded-xl p-5 border ${item.border} shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.iconBg} text-white mb-3 group-hover:scale-110 transition-transform`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="text-slate-700 font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                <IoLockClosedOutline className="h-6 w-6" />
              </div>
              Data Security
            </h2>
            <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 rounded-2xl p-6 border-l-4 border-emerald-500 mb-6">
              <p className="text-slate-700 leading-relaxed text-lg font-medium">
                We implement industry-standard security measures to protect your information:
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'End-to-end encryption for sensitive data',
                'Regular security audits and updates',
                'Secure data storage and backup systems',
                'Access controls and authentication protocols',
                'HIPAA-compliant infrastructure'
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-4 bg-white rounded-xl p-4 border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white group-hover:scale-110 transition-transform">
                    <IoCheckmarkCircleOutline className="h-5 w-5" />
                  </div>
                  <p className="text-slate-700 font-medium">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <div className="h-1 w-12 bg-gradient-to-r from-[#0077C2] to-blue-600 rounded-full"></div>
              Your Rights
            </h2>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-purple-100">
              <p className="text-slate-700 leading-relaxed text-lg font-semibold mb-6">
                You have the right to:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'Access and review your personal information',
                  'Request corrections to inaccurate data',
                  'Request deletion of your account and data',
                  'Opt-out of marketing communications',
                  'File a complaint regarding data handling'
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 group"
                  >
                    <IoCheckmarkCircleOutline className="h-6 w-6 text-purple-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <p className="text-slate-700 font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact Us */}
          <section className="bg-gradient-to-br from-[#0077C2] to-[var(--color-primary-dark)] rounded-2xl p-8 text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <IoChatbubbleOutline className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold">Contact Us</h2>
            </div>
            <p className="text-slate-200 mb-6 text-lg">
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <p className="text-sm text-slate-300 mb-1">Email</p>
                <p className="font-semibold">privacy@healway.com</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <p className="text-sm text-slate-300 mb-1">Phone</p>
                <p className="font-semibold">+1 (555) 123-4567</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                <p className="text-sm text-slate-300 mb-1">Address</p>
                <p className="font-semibold text-sm">123 Healthcare Avenue</p>
              </div>
            </div>
          </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy

