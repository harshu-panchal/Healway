import React, { useState, useEffect } from 'react'
import { IoImageOutline, IoAddOutline, IoCloseOutline, IoPencilOutline, IoTrashOutline, IoToggleOutline, IoToggle } from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import { getAllBanners, createBanner, updateBanner, deleteBanner, uploadAnnouncementImage } from '../admin-services/adminService'
import PageLoader from '../../../components/PageLoader'

const AdminBanners = () => {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    link: '',
    isActive: true,
    sortOrder: 0
  })

  const [selectedImage, setSelectedImage] = useState(null)
  const toast = useToast()

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      setLoading(true)
      const res = await getAllBanners()
      setBanners(res?.data || [])
    } catch (error) {
      toast.error('Failed to fetch banners')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.imageUrl) {
      toast.error('Banner image is required')
      return
    }

    try {
      setSubmitting(true)
      if (isEditing) {
        await updateBanner(editingId, formData)
        toast.success('Banner updated successfully')
      } else {
        await createBanner(formData)
        toast.success('Banner created successfully')
      }
      handleCloseModal()
      fetchBanners()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save banner')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (banner) => {
    setFormData({
      title: banner.title || '',
      imageUrl: banner.imageUrl || '',
      link: banner.link || '',
      isActive: banner.isActive !== undefined ? banner.isActive : true,
      sortOrder: banner.sortOrder || 0
    })
    setEditingId(banner._id)
    setIsEditing(true)
    setShowModal(true)
  }

  const handleDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this banner? This cannot be undone.')) {
      try {
        await deleteBanner(id)
        toast.success('Banner deleted successfully')
        fetchBanners()
      } catch (error) {
        toast.error('Failed to delete banner')
      }
    }
  }

  const handleToggleActive = async (banner) => {
    try {
      const updatedStatus = !banner.isActive
      await updateBanner(banner._id, { ...banner, isActive: updatedStatus })
      toast.success(updatedStatus ? 'Banner activated' : 'Banner deactivated')
      fetchBanners()
    } catch (error) {
      toast.error('Failed to update banner status')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setIsEditing(false)
    setEditingId(null)
    setFormData({
      title: '',
      imageUrl: '',
      link: '',
      isActive: true,
      sortOrder: 0
    })
  }

  if (loading && banners.length === 0) return <PageLoader />

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Banners Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage interactive promotional banners displayed on the patient dashboard.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
        >
          <IoAddOutline className="text-xl" />
          <span>New Banner</span>
        </button>
      </div>

      {/* Banners Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <div key={banner._id} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            {/* Banner Image Preview */}
            <div 
              className="h-44 bg-slate-100 relative cursor-pointer group overflow-hidden border-b border-slate-100"
              onClick={() => setSelectedImage(banner.imageUrl)}
            >
              <img 
                src={banner.imageUrl} 
                alt={banner.title || 'Banner'} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-sm">
                <span>Click to Expand</span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 line-clamp-1">{banner.title || 'Untitled Banner'}</h3>
                {banner.link && (
                  <p className="text-xs text-indigo-600 mt-1 truncate hover:underline">
                    <a href={banner.link} target="_blank" rel="noopener noreferrer">{banner.link}</a>
                  </p>
                )}
                <div className="flex items-center justify-between mt-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Sort Order: {banner.sortOrder}</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${banner.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleToggleActive(banner)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${banner.isActive ? 'text-green-600 hover:text-green-800' : 'text-slate-500 hover:text-slate-700'}`}
                  title={banner.isActive ? 'Deactivate Banner' : 'Activate Banner'}
                >
                  {banner.isActive ? <IoToggle className="text-2xl" /> : <IoToggleOutline className="text-2xl text-slate-400" />}
                  <span>{banner.isActive ? 'Active' : 'Inactive'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(banner)}
                    className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-xl transition-colors"
                    title="Edit Banner"
                  >
                    <IoPencilOutline className="text-lg" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(banner._id)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete Banner"
                  >
                    <IoTrashOutline className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="col-span-full py-16 bg-white border border-slate-200 rounded-3xl text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <IoImageOutline className="text-5xl text-slate-300" />
            <div>
              <p className="font-semibold text-slate-700">No banners found</p>
              <p className="text-sm text-slate-400 mt-1">Click "New Banner" to upload your first promotion.</p>
            </div>
          </div>
        )}
      </div>

      {/* Banner Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-3xl w-full max-w-lg relative z-10 flex flex-col shadow-2xl max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Banner' : 'Create Promotion Banner'}</h2>
              <p className="text-slate-500 text-sm mt-1">Upload a custom banner image and configure details.</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Banner Title (Optional)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
                  placeholder="e.g. Summer Health Discount Checkup"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Banner Image *</label>
                <div className="flex items-center gap-2">
                  {formData.imageUrl && (
                    <div className="w-16 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="relative flex-1">
                    <input
                      type="file"
                      id="banner-image-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setUploadingImage(true);
                          try {
                            const res = await uploadAnnouncementImage(file);
                            setFormData({ ...formData, imageUrl: res.data.url });
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
                        htmlFor="banner-image-upload"
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploadingImage ? <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div> : <IoAddOutline className="text-lg" />}
                        <span className="text-sm font-medium text-slate-600">{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      </label>
                      {formData.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: '' })}
                          className="px-3 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50"
                        >
                          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Action Link (Optional)</label>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
                  placeholder="e.g. /patient/doctors or https://example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-600/20 h-5 w-5 border-slate-300"
                    />
                    <span className="text-sm font-semibold text-slate-700">Active Status</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="flex-1 px-6 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Banner')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 transition-colors z-10"
            >
              <IoCloseOutline className="text-xl" />
            </button>
            <img src={selectedImage} alt="Banner Full View" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminBanners
