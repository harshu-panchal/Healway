import { IoMedicalOutline, IoCheckmarkCircleOutline, IoInformationCircleOutline, IoArrowBackOutline, IoTimeOutline, IoPeopleOutline, IoShieldCheckmarkOutline, IoChatbubbleOutline, IoWarningOutline } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const MedicalGuidelines = () => {
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
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xl transform hover:scale-110 transition-transform duration-300">
                <IoMedicalOutline className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Medical Guidelines
                </h1>
                <p className="text-sm text-slate-600 mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Best practices for healthcare professionals
                </p>
              </div>
            </div>
          </div>

          {/* Content with Animations */}
          <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-200/50 p-10 space-y-10 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Introduction */}
            <section>
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-2xl p-6 border-l-4 border-blue-500 shadow-lg">
                <div className="flex items-start gap-4">
                  <IoInformationCircleOutline className="h-8 w-8 text-blue-600 shrink-0 mt-1" />
                  <p className="text-slate-700 leading-relaxed text-lg">
                    These guidelines are designed to help healthcare professionals provide the best possible care 
                    through the Healway platform while maintaining the highest standards of medical practice.
                  </p>
                </div>
              </div>
            </section>

            {/* Professional Standards */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                  <IoCheckmarkCircleOutline className="h-6 w-6" />
                </div>
                Professional Standards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
                      <IoShieldCheckmarkOutline className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">Licensing & Credentials</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Maintain valid medical licenses in all jurisdictions',
                      'Keep professional certifications up to date',
                      'Notify Healway of any license suspensions',
                      'Provide accurate qualification information'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-700 group/item">
                        <IoCheckmarkCircleOutline className="h-5 w-5 text-blue-600 shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                      <IoMedicalOutline className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800">Clinical Practice</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      'Follow evidence-based medical practices',
                      'Maintain accurate medical records',
                      'Obtain informed consent before procedures',
                      'Ensure continuity of care for patients'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-700 group/item">
                        <IoCheckmarkCircleOutline className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Patient Care */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full"></div>
                Patient Care Guidelines
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border border-emerald-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                      <IoChatbubbleOutline className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Communication</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0"></span>
                      <span>Clear and compassionate communication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0"></span>
                      <span>Timely response to patient inquiries</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0"></span>
                      <span>Respectful and professional language</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
                      <IoShieldCheckmarkOutline className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Privacy & Confidentiality</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                      <span>Protect patient information at all times</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                      <span>Use secure communication channels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                      <span>Follow HIPAA compliance requirements</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 border border-purple-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white">
                      <IoTimeOutline className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Appointment Management</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                      <span>Maintain accurate appointment schedules</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                      <span>Provide adequate consultation time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                      <span>Notify patients of schedule changes</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 border border-amber-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                      <IoWarningOutline className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Emergency Protocols</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></span>
                      <span>Establish clear emergency procedures</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></span>
                      <span>Know when to refer to emergency services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 shrink-0"></span>
                      <span>Maintain emergency contact information</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Platform Usage */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                  <IoInformationCircleOutline className="h-6 w-6" />
                </div>
                Platform Usage Best Practices
              </h2>
              <div className="space-y-4">
                {[
                  { num: '1', title: 'Complete Your Profile', desc: 'Ensure all profile information is accurate and up to date to build patient trust.' },
                  { num: '2', title: 'Manage Availability', desc: 'Keep your schedule updated to avoid appointment conflicts and patient confusion.' },
                  { num: '3', title: 'Document Properly', desc: 'Maintain detailed consultation notes and medical records for each patient interaction.' }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-4 p-6 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0077C2] to-[var(--color-primary-dark)] text-white text-lg font-bold shadow-lg group-hover:scale-110 transition-transform">
                      {item.num}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-800 mb-2">{item.title}</h4>
                      <p className="text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Compliance */}
            <section className="bg-gradient-to-r from-[#0077C2] via-[var(--color-primary-dark)] to-[#0077C2] rounded-2xl p-8 text-white shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <IoShieldCheckmarkOutline className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold">Regulatory Compliance</h2>
              </div>
              <p className="text-slate-200 mb-6 text-lg">
                All healthcare professionals using Healway must comply with:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'HIPAA (Health Insurance Portability and Accountability Act)',
                  'State medical board regulations',
                  'Professional medical association guidelines',
                  'Telemedicine practice standards'
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300 flex items-start gap-3">
                    <IoCheckmarkCircleOutline className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-slate-200 font-medium">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MedicalGuidelines
