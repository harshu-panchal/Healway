import { IoDocumentTextOutline, IoCheckmarkCircleOutline, IoWarningOutline, IoArrowBackOutline, IoShieldCheckmarkOutline, IoLockClosedOutline, IoWalletOutline } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const TermsOfService = () => {
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    setIsVisible(true)
  }, [])
  
  return (
    <div className="hidden lg:block min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
                <IoDocumentTextOutline className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#0077C2] to-amber-600 bg-clip-text text-transparent">
                  Terms of Service
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
                <div className="h-1 w-12 bg-gradient-to-r from-[#0077C2] to-amber-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-slate-900">Agreement to Terms</h2>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-l-4 border-primary shadow-sm">
                <p className="text-slate-700 leading-relaxed text-lg">
                  By accessing and using the <span className="font-semibold text-primary">Healway</span> platform, you agree to be bound by these Terms of Service. 
                  If you do not agree with any part of these terms, you may not access or use our services.
                </p>
              </div>
            </section>

            {/* Account Requirements */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                  <IoCheckmarkCircleOutline className="h-6 w-6" />
                </div>
                Account Requirements
              </h2>
              <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border-2 border-emerald-200 shadow-lg">
                <p className="text-slate-700 font-semibold mb-4 text-lg">To use our platform, you must:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Be a licensed healthcare professional',
                    'Provide accurate and complete registration information',
                    'Maintain the security of your account credentials',
                    'Comply with all applicable medical regulations',
                    'Keep your professional credentials up to date'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
                      <IoCheckmarkCircleOutline className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-700 font-medium">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Service Usage */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-[#0077C2] to-amber-600 rounded-full"></div>
                Service Usage
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
                      <IoCheckmarkCircleOutline className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">Permitted Uses</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Managing patient consultations and appointments',
                      'Accessing medical records and patient information',
                      'Processing payments and managing earnings',
                      'Communicating with patients through secure channels'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-700 group/item">
                        <IoCheckmarkCircleOutline className="h-5 w-5 text-blue-600 shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 border border-amber-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                      <IoWarningOutline className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">Prohibited Activities</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Sharing account credentials with unauthorized persons',
                      'Violating patient privacy or confidentiality',
                      'Using the platform for illegal activities',
                      'Misrepresenting professional qualifications',
                      'Interfering with platform security or operations'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-700 group/item">
                        <IoWarningOutline className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Payment Terms */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                  <IoWalletOutline className="h-6 w-6" />
                </div>
                Payment Terms
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-5 border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300">
                  <h3 className="font-semibold text-slate-800 mb-2">Platform Fee Structure</h3>
                  <p className="text-sm text-slate-600">Healway charges a platform fee on consultations and services.</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-5 border border-emerald-200 shadow-md hover:shadow-lg transition-all duration-300">
                  <h3 className="font-semibold text-slate-800 mb-2">Payment Processing</h3>
                  <p className="text-sm text-slate-600">Payments are processed securely and transferred to your registered bank account.</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-5 border border-purple-200 shadow-md hover:shadow-lg transition-all duration-300">
                  <h3 className="font-semibold text-slate-800 mb-2">Withdrawal Terms</h3>
                  <p className="text-sm text-slate-600">Minimum withdrawal amounts and processing times apply as per our payment policy.</p>
                </div>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-[#0077C2] to-amber-600 rounded-full"></div>
                Intellectual Property
              </h2>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border-l-4 border-indigo-500 shadow-sm">
                <p className="text-slate-700 leading-relaxed text-lg">
                  All content, features, and functionality of the Healway platform are owned by Healway and are protected by 
                  international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or 
                  create derivative works without our express written permission.
                </p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-[#0077C2] to-amber-600 rounded-full"></div>
                Limitation of Liability
              </h2>
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-sm">
                <p className="text-slate-700 leading-relaxed text-lg">
                  Healway provides the platform "as is" and does not guarantee uninterrupted or error-free service. 
                  We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-gradient-to-br from-[#0077C2] to-[var(--color-primary-dark)] rounded-2xl p-8 text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <IoShieldCheckmarkOutline className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold">Questions About Terms</h2>
              </div>
              <p className="text-slate-200 mb-6 text-lg">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <p className="text-sm text-slate-300 mb-1">Email</p>
                  <p className="font-semibold">legal@healway.com</p>
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

export default TermsOfService
