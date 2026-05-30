import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoMegaphoneOutline, IoTimeOutline, IoPersonOutline, IoChevronForwardOutline, IoCallOutline, IoLogoWhatsapp } from 'react-icons/io5'
import { getAnnouncements } from '../patient-services/patientService'
import { getPublicFooterSettings } from '../../../services/publicSettingsService'
import { useToast } from '../../../contexts/ToastContext'
import PageLoader from '../../../components/PageLoader'

const formatWhatsappNumber = (number) => {
  const cleaned = String(number || '').replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `91${cleaned}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `91${cleaned.substring(1)}`
  }
  return cleaned
}

const PatientAnnouncements = () => {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [supportPhone, setSupportPhone] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const toast = useToast()

  useEffect(() => {
    fetchAnnouncements()
    fetchSupportSettings()
  }, [])

  const fetchSupportSettings = async () => {
    try {
      const response = await getPublicFooterSettings()
      if (response) {
        setSupportPhone(response.supportPhone || '')
        setWhatsappNumber(response.whatsappNumber || '')
      }
    } catch (error) {
      console.error('Failed to fetch support settings:', error)
    }
  }

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
                    <div className="mb-4 rounded-xl overflow-hidden w-full bg-slate-100 border border-slate-100">
                      <img src={ann.image} alt="Announcement" className="w-full h-auto max-h-96 object-contain" />
                    </div>
                  )}
                  <p className="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{ann.content}</p>
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-100 mt-2">
                    <span className="text-xs font-medium text-slate-500">
                      From: {ann.senderRole === 'Admin' ? 'Healway Admin' : `Dr. ${ann.senderId?.name || ann.senderId?.firstName || 'Unknown'}`}
                    </span>

                    <div className="flex items-center gap-3 flex-wrap">
                      {(() => {
                        const displayPhone = ann.contactNumber || supportPhone;
                        const displayWhatsapp = ann.whatsappNumber || whatsappNumber;
                        return (
                          <>
                            {displayPhone && (
                              <a
                                href={`tel:${displayPhone.replace(/[^\d+]/g, '')}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 text-xs font-semibold transition-all active:scale-95"
                              >
                                <IoCallOutline className="h-3.5 w-3.5" />
                                <span>Call Support</span>
                              </a>
                            )}
                            {displayWhatsapp && (
                              <a
                                href={`https://wa.me/${formatWhatsappNumber(displayWhatsapp)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 text-xs font-semibold transition-all active:scale-95"
                              >
                                <IoLogoWhatsapp className="h-3.5 w-3.5 text-emerald-500" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </>
                        );
                      })()}
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
