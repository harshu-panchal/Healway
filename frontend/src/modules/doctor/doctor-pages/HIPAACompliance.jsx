import { IoShieldCheckmarkOutline, IoLockClosedOutline, IoCheckmarkCircleOutline, IoArrowBackOutline, IoDocumentTextOutline } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const HIPAACompliance = () => {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    setIsVisible(true)
  }, [])
  
  return (
    <div className="hidden lg:block min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 text-white shadow-xl transform hover:scale-110 transition-transform duration-300">
                <IoShieldCheckmarkOutline className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  HIPAA Compliance
                </h1>
                <p className="text-sm text-slate-600 mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Health Insurance Portability and Accountability Act
                </p>
              </div>
            </div>
          </div>

          {/* Content with Animations */}
          <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/50 p-10 space-y-10 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Overview */}
            <section>
              <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 rounded-2xl p-8 border-l-4 border-emerald-500 shadow-lg">
                <div className="flex items-start gap-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                    <IoShieldCheckmarkOutline className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Our Commitment</h2>
                    <p className="text-slate-700 leading-relaxed text-lg">
                      Healway is fully committed to HIPAA compliance and ensuring the highest standards of 
                      patient data protection. We implement comprehensive security measures to safeguard Protected 
                      Health Information (PHI) in accordance with HIPAA regulations.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Security Measures */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0077C2] to-blue-600 text-white shadow-lg">
                  <IoLockClosedOutline className="h-6 w-6" />
                </div>
                Security Measures
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { icon: IoLockClosedOutline, title: 'Encryption', desc: 'All PHI is encrypted both in transit and at rest using industry-standard encryption protocols.', bg: 'from-blue-50 to-white', border: 'border-blue-200', iconBg: 'bg-blue-500' },
                  { icon: IoShieldCheckmarkOutline, title: 'Access Controls', desc: 'Strict access controls ensure only authorized personnel can access patient information.', bg: 'from-emerald-50 to-white', border: 'border-emerald-200', iconBg: 'bg-emerald-500' },
                  { icon: IoDocumentTextOutline, title: 'Audit Logs', desc: 'Comprehensive audit logs track all access to PHI for compliance monitoring.', bg: 'from-purple-50 to-white', border: 'border-purple-200', iconBg: 'bg-purple-500' },
                  { icon: IoShieldCheckmarkOutline, title: 'Secure Infrastructure', desc: 'Our infrastructure meets HIPAA requirements with regular security assessments.', bg: 'from-indigo-50 to-white', border: 'border-indigo-200', iconBg: 'bg-indigo-500' }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className={`bg-gradient-to-br ${item.bg} rounded-2xl p-6 border-2 ${item.border} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg} text-white mb-4 group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">{item.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Your Responsibilities */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-600 to-green-600 rounded-full"></div>
                Your Responsibilities
              </h2>
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border-2 border-blue-200 shadow-lg">
                <p className="text-slate-700 font-semibold mb-6 text-lg">
                  As a healthcare professional using Healway, you must:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Maintain the confidentiality of patient information',
                    'Use secure passwords and enable two-factor authentication',
                    'Report any suspected security breaches immediately',
                    'Only access PHI for legitimate healthcare purposes',
                    'Follow minimum necessary standards when accessing patient data',
                    'Complete HIPAA training as required'
                  ].map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-3 bg-white rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                      <IoCheckmarkCircleOutline className="h-6 w-6 text-blue-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-700 font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Business Associate Agreement */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-600 to-green-600 rounded-full"></div>
                Business Associate Agreement
              </h2>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border-l-4 border-indigo-500 shadow-sm mb-4">
                <p className="text-slate-700 leading-relaxed text-lg mb-4">
                  Healway operates as a Business Associate under HIPAA. We have executed Business Associate 
                  Agreements (BAAs) with all covered entities using our platform, ensuring compliance with 
                  HIPAA requirements.
                </p>
              </div>
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                <p className="text-sm text-amber-900 font-medium">
                  <strong>Note:</strong> All healthcare providers using Healway are required to sign a BAA 
                  before accessing patient information on the platform.
                </p>
              </div>
            </section>

            {/* Breach Notification */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-600 to-green-600 rounded-full"></div>
                Breach Notification
              </h2>
              <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl p-6 border-2 border-red-200 shadow-md">
                <p className="text-slate-700 leading-relaxed mb-6 text-lg font-medium">
                  In the event of a security breach involving PHI, Healway will:
                </p>
                <div className="space-y-3">
                  {[
                    'Notify affected individuals within 60 days as required by HIPAA',
                    'Report breaches to the Department of Health and Human Services',
                    'Conduct a thorough investigation and implement corrective measures',
                    'Provide ongoing support and communication to affected parties'
                  ].map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-3 bg-white rounded-lg p-4 border border-red-100 hover:shadow-md transition-all duration-300 group"
                    >
                      <IoCheckmarkCircleOutline className="h-6 w-6 text-red-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-700 font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Compliance Certification */}
            <section className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 rounded-2xl p-8 text-white shadow-2xl">
              <div className="flex items-center gap-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <IoShieldCheckmarkOutline className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-3">HIPAA Compliant & Certified</h2>
                  <p className="text-emerald-50 text-lg leading-relaxed">
                    Healway maintains ongoing HIPAA compliance through regular audits, security assessments, 
                    and staff training. Our platform is designed and operated to meet or exceed all HIPAA requirements.
                  </p>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-gradient-to-br from-[#0077C2] to-[var(--color-primary-dark)] rounded-2xl p-8 text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <IoDocumentTextOutline className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold">Questions About HIPAA Compliance</h2>
              </div>
              <p className="text-slate-200 mb-6 text-lg">
                For questions or concerns about HIPAA compliance, contact our compliance team:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <p className="text-sm text-slate-300 mb-1">Email</p>
                  <p className="font-semibold">compliance@healway.com</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <p className="text-sm text-slate-300 mb-1">Phone</p>
                  <p className="font-semibold">+1 (555) 123-4567</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HIPAACompliance
