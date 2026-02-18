import React, { useState, useEffect } from 'react'
import { IoMegaphoneOutline, IoPeopleOutline, IoStatsChartOutline, IoTimeOutline, IoAddOutline, IoImageOutline } from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import { getAllAnnouncements, getAnnouncementMetrics, createAdminAnnouncement, updateAdminAnnouncementStatus, uploadAnnouncementImage } from '../admin-services/adminService'
import PageLoader from '../../../components/PageLoader'

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('all') // all, pending, active, rejected
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetType: 'both',
    priority: 'medium',
    expiryDate: '',
    image: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false);

  const toast = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [annData, metricsData] = await Promise.all([
        getAllAnnouncements(),
        getAnnouncementMetrics()
      ])
      setAnnouncements(annData?.data || [])
      setMetrics(metricsData?.data || null)
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id, status) => {
    try {
      if (!window.confirm(`Are you sure you want to ${status} this announcement?`)) return

      await updateAdminAnnouncementStatus(id, status)
      toast.success(`Announcement ${status} successfully`)
      fetchData()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await createAdminAnnouncement(formData)
      toast.success('Announcement published successfully')
      setShowModal(false)
      setFormData({
        title: '',
        content: '',
        targetType: 'both',
        priority: 'medium',
        expiryDate: '',
        image: ''
      })
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to publish announcement')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAnnouncements = announcements.filter(ann => {
    if (filter === 'pending') return ann.approvalStatus === 'pending'
    if (filter === 'active') return ann.approvalStatus === 'approved' && ann.isActive
    if (filter === 'rejected') return ann.approvalStatus === 'rejected'
    return true
  })

  if (loading && announcements.length === 0) return <PageLoader />

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Announcements</h1>
          <p className="text-slate-500 text-sm mt-1">View global and provider announcements</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
        >
          <IoAddOutline className="text-xl" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <IoMegaphoneOutline className="text-xl" />
            </div>
            <span className="text-sm font-medium text-slate-500">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.totalAnnouncements || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <IoStatsChartOutline className="text-xl" />
            </div>
            <span className="text-sm font-medium text-slate-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.activeAnnouncements || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <IoPeopleOutline className="text-xl" />
            </div>
            <span className="text-sm font-medium text-slate-500">By Doctors</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.doctorAnnouncements || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <IoTimeOutline className="text-xl" />
            </div>
            <span className="text-sm font-medium text-slate-500">Pending</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.pendingAnnouncements || 0}</p>
        </div>
      </div>

      {/* Announcements Table/List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-100 px-6">
          {['all', 'pending', 'active', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors -mb-[2px] capitalize ${filter === f ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Announcement</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Author</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAnnouncements.map((ann) => (
                <tr key={ann._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <p className="text-sm font-bold text-slate-900 truncate">{ann.title}</p>
                      <p className="text-xs text-slate-500 truncate">{ann.content}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit mb-1 ${ann.senderRole === 'Admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-primary/5 text-primary'
                        }`}>
                        {ann.senderRole.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-600 font-medium">{ann.senderId?.name || (ann.senderId?.firstName ? `${ann.senderId.firstName} ${ann.senderId.lastName}` : 'System')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ann.targetType === 'doctors' ? 'bg-blue-50 text-blue-600' :
                      ann.targetType === 'patients' ? 'bg-pink-50 text-pink-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                      {ann.targetType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${ann.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                        ann.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                        {ann.approvalStatus}
                      </span>
                      {ann.approvalStatus === 'approved' && !ann.isActive && (
                        <span className="text-[10px] text-slate-500 font-medium ml-1">Expired</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {ann.approvalStatus === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(ann._id, 'approved')}
                          className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(ann._id, 'rejected')}
                          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAnnouncements.length === 0 && (
            <div className="py-12 text-center text-slate-500">No {filter !== 'all' ? filter : ''} announcements found.</div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setShowModal(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-lg relative z-10 flex flex-col shadow-2xl max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Create Global Announcement</h2>
              <p className="text-slate-500 text-sm mt-1">Send a notification to doctors, patients, or both.</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
                  placeholder="e.g. System Maintenance Update"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Content</label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none min-h-[120px] resize-none"
                  placeholder="Describe your announcement in detail..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Image (Optional)</label>
                <div className="flex items-center gap-2">
                  {formData.image && (
                    <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="relative flex-1">
                    <input
                      type="file"
                      id="image-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setUploadingImage(true);
                          try {
                            const res = await uploadAnnouncementImage(file);
                            setFormData({ ...formData, image: res.data.url });
                            toast.success('Image uploaded successfully');
                          } catch (err) {
                            toast.error('Failed to upload image');
                          } finally {
                            setUploadingImage(false);
                          }
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <label
                        htmlFor="image-upload"
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploadingImage ? <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div> : <IoAddOutline className="text-lg" />}
                        <span className="text-sm font-medium text-slate-600">{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      </label>
                      {formData.image && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '' })}
                          className="px-3 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50"
                        >
                          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Audience</label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none bg-white"
                  >
                    <option value="both">Both (All Users)</option>
                    <option value="doctors">Doctors Only</option>
                    <option value="patients">Patients Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2 shrink-0">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Reusing medical icon for metrics
const IoMedicalOutline = ({ className }) => (
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className={className} height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
  </svg>
)


export default AdminAnnouncements
