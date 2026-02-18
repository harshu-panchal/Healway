import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoMegaphoneOutline, IoTimeOutline, IoPersonOutline, IoChevronForwardOutline, IoLogoWhatsapp, IoCallOutline } from 'react-icons/io5'
import { getAnnouncements } from '../patient-services/patientService'
import { useToast } from '../../../contexts/ToastContext'
import PageLoader from '../../../components/PageLoader'

const PatientAnnouncements = () => {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await getAnnouncements()
      setAnnouncements(data)
    } catch (error) {
      toast.error('Failed to fetch announcements')
    } finally {
      setLoading(false)
    }
  }

  if (loading && announcements.length === 0) return <PageLoader />

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
        <p className="text-slate-500 text-sm mt-1">Stay updated with latest news from your doctors and Healway</p>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <IoMegaphoneOutline className="text-3xl text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No announcements for you</h3>
          <p className="text-slate-500 mt-1 max-w-xs mx-auto">You'll see updates here when your doctors or admin post something new.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann._id}
              onClick={() => {
                // If sender is NOT Admin, navigate to doctor details
                if (ann.senderRole !== 'Admin' && ann.senderId) {
                  navigate(`/patient/doctors/${ann.senderId._id || ann.senderId.id || ann.senderId}`)
                }
              }}
              className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all group 
                ${ann.senderRole === 'Admin'
                  ? 'border-indigo-100 ring-1 ring-indigo-50'
                  : 'border-slate-200 hover:border-primary/30 cursor-pointer'
                }`}
            >
              <div className="p-5 flex flex-col md:flex-row gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ann.senderRole === 'Admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-primary/10 text-primary'
                    }`}>
                    {ann.senderRole === 'Admin' ? <IoMegaphoneOutline className="text-xl" /> : (
                      ann.senderId?.profileImage ? (
                        <img src={ann.senderId.profileImage} alt="Dr" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <IoPersonOutline className="text-xl" />
                      )
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {ann.senderRole === 'Admin' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white">
                          Official
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{ann.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                      <IoTimeOutline />
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {ann.image && (
                    <div className="mb-4 rounded-xl overflow-hidden h-48 w-full bg-slate-100 border border-slate-100">
                      <img src={ann.image} alt="Announcement" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{ann.content}</p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <span className="text-xs font-medium text-slate-500">
                      From: {ann.senderRole === 'Admin' ? 'Healway Admin' : `Dr. ${ann.senderId?.name || ann.senderId?.firstName || 'Unknown'}`}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Buttons for Admin */}
                      {ann.senderRole === 'Admin' ? (
                        <>
                          {/* Admin Call Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const adminPhone = '919876543210' // Replace with actual admin phone number
                              window.location.href = `tel:${adminPhone}`
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow-md"
                          >
                            <IoCallOutline className="text-base" />
                            Call
                          </button>

                          {/* Admin WhatsApp Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const adminPhone = '919876543210' // Replace with actual admin WhatsApp number
                              const message = encodeURIComponent(`Hi, I saw your announcement: "${ann.title}"`)
                              window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank')
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow-md"
                          >
                            <IoLogoWhatsapp className="text-base" />
                            WhatsApp
                          </button>
                        </>
                      ) : (
                        // Buttons for Doctor
                        ann.senderId?.phone && (
                          <>
                            {/* Doctor Call Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const doctorPhone = ann.senderId.phone.replace(/[^0-9]/g, '')
                                window.location.href = `tel:${doctorPhone}`
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow-md"
                            >
                              <IoCallOutline className="text-base" />
                              Call
                            </button>

                            {/* Doctor WhatsApp Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                const doctorPhone = ann.senderId.phone.replace(/[^0-9]/g, '')
                                const message = encodeURIComponent(`Hi Dr. ${ann.senderId?.firstName || ''}, I saw your announcement: "${ann.title}"`)
                                window.open(`https://wa.me/${doctorPhone}?text=${message}`, '_blank')
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow-md"
                            >
                              <IoLogoWhatsapp className="text-base" />
                              WhatsApp
                            </button>
                          </>
                        )
                      )}

                      {/* View Doctor Button - Only for Doctor announcements */}
                      {ann.senderRole !== 'Admin' && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-primary text-xs font-bold">
                          View Doctor <IoChevronForwardOutline />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PatientAnnouncements
