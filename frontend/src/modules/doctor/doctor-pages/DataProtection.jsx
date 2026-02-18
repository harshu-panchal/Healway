import { IoLockClosedOutline, IoShieldCheckmarkOutline, IoKeyOutline, IoArrowBackOutline, IoCheckmarkCircleOutline, IoGlobeOutline, IoDocumentTextOutline } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const DataProtection = () => {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    setIsVisible(true)
  }, [])
  
  return (
    <div className="hidden lg:block min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0077C2] to-indigo-600 text-white shadow-xl transform hover:scale-110 transition-transform duration-300">
                <IoLockClosedOutline className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#0077C2] to-indigo-600 bg-clip-text text-transparent">
                  Data Protection
                </h1>
                <p className="text-sm text-slate-600 mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  How we protect your data
                </p>
              </div>
            </div>
          </div>

          {/* Content with Animations */}
          <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/50 p-10 space-y-10 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Overview */}
            <section>
              <div className="bg-gradient-to-r from-[#0077C2] via-indigo-600 to-[#0077C2] rounded-2xl p-8 text-white shadow-2xl">
                <div className="flex items-start gap-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <IoShieldCheckmarkOutline className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-3">Our Data Protection Commitment</h2>
                    <p className="text-slate-200 leading-relaxed text-lg">
                      At Healway, we take data protection seriously. We implement comprehensive security 
                      measures and follow industry best practices to ensure your personal and professional 
                      information remains secure and confidential.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Security Measures */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0077C2] to-indigo-600 text-white shadow-lg">
                  <IoKeyOutline className="h-6 w-6" />
                </div>
                Security Measures
              </h2>
              <div className="space-y-4">
                {[
                  { icon: IoLockClosedOutline, title: 'Encryption', desc: 'All sensitive data is encrypted using AES-256 encryption, both in transit (TLS/SSL) and at rest. This ensures that even if data is intercepted, it cannot be read without the encryption keys.', bg: 'from-blue-50 via-white to-blue-50', border: 'border-blue-500', iconBg: 'bg-blue-500' },
                  { icon: IoShieldCheckmarkOutline, title: 'Access Controls', desc: 'Multi-factor authentication and role-based access controls ensure that only authorized users can access sensitive information. All access attempts are logged and monitored.', bg: 'from-emerald-50 via-white to-emerald-50', border: 'border-emerald-500', iconBg: 'bg-emerald-500' },
                  { icon: IoDocumentTextOutline, title: 'Regular Security Audits', desc: 'We conduct regular security audits, penetration testing, and vulnerability assessments to identify and address potential security issues before they can be exploited.', bg: 'from-purple-50 via-white to-purple-50', border: 'border-purple-500', iconBg: 'bg-purple-500' },
                  { icon: IoShieldCheckmarkOutline, title: 'Secure Infrastructure', desc: 'Our infrastructure is hosted on secure, compliant cloud platforms with redundant backups and disaster recovery procedures in place.', bg: 'from-amber-50 via-white to-amber-50', border: 'border-amber-500', iconBg: 'bg-amber-500' }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className={`bg-gradient-to-r ${item.bg} rounded-2xl p-6 border-l-4 ${item.border} shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.iconBg} text-white shadow-lg`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">{item.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-[#0077C2] to-indigo-600 rounded-full"></div>
                Data Retention & Deletion
              </h2>
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 border-2 border-slate-200 shadow-lg">
                <p className="text-slate-700 mb-6 text-lg font-medium">
                  We retain your data only for as long as necessary to provide our services and comply 
                  with legal obligations:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Active Accounts', desc: 'Data is retained while your account is active' },
                    { label: 'Account Closure', desc: 'You can request account deletion at any time' },
                    { label: 'Legal Requirements', desc: 'Some data may be retained to comply with legal obligations' },
                    { label: 'Medical Records', desc: 'Patient records are retained as required by healthcare regulations' }
                  ].map((item, idx) => (
                    <div 
                      key={idx}
                      className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                      <h4 className="font-semibold text-slate-800 mb-2">{item.label}</h4>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-[#0077C2] to-indigo-600 rounded-full"></div>
                Your Data Protection Rights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: 'Right to Access', desc: 'You can request a copy of all personal data we hold about you.', icon: IoDocumentTextOutline, bg: 'from-blue-50 to-white', border: 'border-blue-200', iconBg: 'bg-blue-500' },
                  { title: 'Right to Rectification', desc: 'You can request correction of inaccurate or incomplete data.', icon: IoCheckmarkCircleOutline, bg: 'from-emerald-50 to-white', border: 'border-emerald-200', iconBg: 'bg-emerald-500' },
                  { title: 'Right to Erasure', desc: 'You can request deletion of your data under certain circumstances.', icon: IoLockClosedOutline, bg: 'from-red-50 to-white', border: 'border-red-200', iconBg: 'bg-red-500' },
                  { title: 'Right to Portability', desc: 'You can request your data in a structured, machine-readable format.', icon: IoGlobeOutline, bg: 'from-purple-50 to-white', border: 'border-purple-200', iconBg: 'bg-purple-500' }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className={`bg-gradient-to-br ${item.bg} rounded-2xl p-6 border-2 ${item.border} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg} text-white mb-4 group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">{item.title}</h3>
                    <p className="text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* International Standards */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                  <IoGlobeOutline className="h-6 w-6" />
                </div>
                Compliance with International Standards
              </h2>
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl p-8 border-2 border-slate-200 shadow-lg">
                <p className="text-slate-700 mb-6 text-lg font-medium">
                  Healway complies with international data protection standards including:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { name: 'HIPAA', desc: 'US Healthcare', icon: IoShieldCheckmarkOutline, iconBg: 'bg-emerald-500' },
                    { name: 'GDPR', desc: 'European Union', icon: IoShieldCheckmarkOutline, iconBg: 'bg-blue-500' },
                    { name: 'ISO 27001', desc: 'Security Management', icon: IoShieldCheckmarkOutline, iconBg: 'bg-purple-500' }
                  ].map((item, idx) => (
                    <div 
                      key={idx}
                      className="text-center p-6 bg-white rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                    >
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${item.iconBg} text-white mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                        <item.icon className="h-8 w-8" />
                      </div>
                      <p className="text-lg font-bold text-slate-800 mb-1">{item.name}</p>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-gradient-to-br from-[#0077C2] to-[var(--color-primary-dark)] rounded-2xl p-8 text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <IoShieldCheckmarkOutline className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold">Data Protection Officer</h2>
              </div>
              <p className="text-slate-200 mb-6 text-lg">
                For questions or concerns about data protection, contact our Data Protection Officer:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <p className="text-sm text-slate-300 mb-1">Email</p>
                  <p className="font-semibold">dpo@healway.com</p>
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

export default DataProtection
