import React, { useState, useEffect } from 'react'
import { IoAddOutline, IoTrashOutline, IoCreateOutline, IoMegaphoneOutline, IoTimeOutline, IoPeopleOutline, IoImageOutline } from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import { getMyAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, uploadAnnouncementImage } from '../doctor-services/doctorService'
import PageLoader from '../../../components/PageLoader'

const DoctorAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetType: 'my_patients',
    expiryDate: '',
    image: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false);

  const toast = useToast()

  useEffect(() => {
    fetchAnnouncements()
  }, [])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement._id, formData)
        toast.success('Announcement updated successfully')
      } else {
        await createAnnouncement(formData)
        toast.success('Announcement created successfully')
      }
      setShowModal(false)
      setShowModal(false)
      setEditingAnnouncement(null)
      setFormData({ title: '', content: '', targetType: 'my_patients', expiryDate: '', image: '' })
      fetchAnnouncements()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save announcement')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteAnnouncement(id)
        toast.success('Announcement deleted successfully')
        fetchAnnouncements()
      } catch (error) {
        toast.error('Failed to delete announcement')
      }
    }
  }

  const openEditModal = (announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      targetType: announcement.targetType,
      expiryDate: announcement.expiryDate ? new Date(announcement.expiryDate).toISOString().split('T')[0] : '',
      image: announcement.image || ''
    })
    setShowModal(true)
  }

  if (loading && announcements.length === 0) return <PageLoader />

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Announcements</h1>
          <p className="text-slate-500 text-sm mt-1">Manage announcements for your patients</p>
        </div>
        <button
          onClick={() => {
            setEditingAnnouncement(null)
            setFormData({ title: '', content: '', targetType: 'my_patients', expiryDate: '', image: '' })
            setShowModal(true)
          }}
          className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-all shadow-sm active:scale-95"
        >
          <IoAddOutline className="text-xl" />
          <span>New Announcement</span>
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <IoMegaphoneOutline className="text-3xl text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No announcements yet</h3>
          <p className="text-slate-500 mt-1 max-w-xs mx-auto">Create your first announcement to keep your patients informed about updates or offers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((ann) => (
            <div key={ann._id} className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-shadow ${ann.senderRole === 'Admin' ? 'border-indigo-100 ring-1 ring-indigo-50' : 'border-slate-200'
              }`}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ann.approvalStatus === 'approved'
                      ? (ann.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')
                      : ann.approvalStatus === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                      }`}>
                      {ann.approvalStatus === 'approved'
                        ? (ann.isActive ? 'Active' : 'Expired')
                        : ann.approvalStatus}
                    </span>
                    {ann.senderRole === 'Admin' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white">
                        Official
                      </span>
                    )}
                  </div>
                  {ann.senderRole !== 'Admin' && (
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(ann)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors">
                        <IoCreateOutline className="text-lg" />
                      </button>
                      <button onClick={() => handleDelete(ann._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <IoTrashOutline className="text-lg" />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">{ann.title}</h3>
                {ann.image && (
                  <div className="mb-3 rounded-xl overflow-hidden h-40 w-full bg-slate-100">
                    <img src={ann.image} alt="Announcement" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed">{ann.content}</p>
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <IoTimeOutline />
                    <span>Created on {new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <IoPeopleOutline />
                    <span>{ann.senderRole === 'Admin' ? 'From: Healway Admin' : `Target: ${ann.targetType.replace('_', ' ')}`}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-lg relative z-10 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  placeholder="e.g. Clinic Closed Tomorrow"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Content</label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[120px] resize-none"
                  placeholder="Write your announcement details here..."
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
                            console.log(res);
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
                        {uploadingImage ? <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div> : <IoImageOutline className="text-lg" />}
                        <span className="text-sm font-medium text-slate-600">{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      </label>
                      {formData.image && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '' })}
                          className="px-3 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50"
                        >
                          <IoTrashOutline />
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none bg-white"
                  >
                    <option value="my_patients">My Patients</option>
                    <option value="all">All Patients</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2.5 rounded-xl font-medium text-white bg-primary hover:bg-primary-dark transition-colors shadow-sm"
                >
                  {editingAnnouncement ? 'Update' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DoctorAnnouncements
