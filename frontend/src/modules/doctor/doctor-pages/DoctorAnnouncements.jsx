import React, { useState, useEffect } from 'react'
import { IoMegaphoneOutline, IoTimeOutline, IoPeopleOutline, IoCallOutline, IoLogoWhatsapp } from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import { getMyAnnouncements } from '../doctor-services/doctorService'
import { getPublicFooterSettings } from '../../../services/publicSettingsService'
import PageLoader from '../../../components/PageLoader'

const DoctorAnnouncements = () => {
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
      const data = await getMyAnnouncements()
      setAnnouncements(data || [])
    } catch (error) {
      toast.error('Failed to fetch announcements')
    } finally {
      setLoading(false)
    }
  }

  if (loading && announcements.length === 0) return <PageLoader />

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 text-sm mt-1">Updates from Healway Admin</p>
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <IoMegaphoneOutline className="text-3xl text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No announcements yet</h3>
          <p className="text-slate-500 mt-1 max-w-xs mx-auto">Wait for official updates from admin.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann._id}
              className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all group 
                ${ann.senderRole === 'Admin'
                  ? 'border-indigo-100 ring-1 ring-indigo-50'
                  : 'border-slate-200'
                }`}
            >
              <div className="p-5 flex flex-col md:flex-row gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ann.senderRole === 'Admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-primary/10 text-primary'
                    }`}>
                    {ann.senderRole === 'Admin' ? <IoMegaphoneOutline className="text-xl" /> : <IoPeopleOutline className="text-xl" />}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {ann.senderRole === 'Admin' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white">
                            Official
                          </span>
                        )}
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{ann.title}</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <IoTimeOutline />
                          <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
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
                      {ann.senderRole === 'Admin' ? 'From: Healway Admin' : `Posted by Dr. ${ann.senderId?.firstName || 'Staff'}`}
                    </span>

                    <div className="flex items-center gap-3 flex-wrap">
                      {supportPhone && (
                        <a
                          href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 text-xs font-semibold transition-all active:scale-95"
                        >
                          <IoCallOutline className="h-3.5 w-3.5" />
                          <span>Call Support</span>
                        </a>
                      )}
                      {whatsappNumber && (
                        <a
                          href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 text-xs font-semibold transition-all active:scale-95"
                        >
                          <IoLogoWhatsapp className="h-3.5 w-3.5 text-emerald-500" />
                          <span>WhatsApp</span>
                        </a>
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

export default DoctorAnnouncements
