import React, { useState, useEffect, useRef } from 'react'
import {
    IoAddOutline,
    IoSearchOutline,
    IoTrashOutline,
    IoPencilOutline,
    IoCloudUploadOutline,
    IoCheckmarkCircleOutline,
    IoCloseCircleOutline,
    IoGridOutline,
    IoListOutline
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import adminService from '../admin-services/adminService'
import PageLoader from '../../../components/PageLoader'

const AdminSpecialization = () => {
    const [specialties, setSpecialties] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [editingSpecialty, setEditingSpecialty] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

    const fileInputRef = useRef(null)
    const toast = useToast()

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: null
    })

    useEffect(() => {
        fetchSpecialties()
    }, [])

    const fetchSpecialties = async () => {
        try {
            setLoading(true)
            const response = await adminService.getAllSpecialties()
            setSpecialties(response || [])
        } catch (error) {
            toast.error('Failed to fetch specializations')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (specialty) => {
        setEditingSpecialty(specialty)
        setFormData({
            name: specialty.name,
            description: specialty.description || '',
            icon: null
        })
        setImagePreview(specialty.icon ? (specialty.icon.startsWith('http') ? specialty.icon : `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${specialty.icon}`) : null)
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this specialization?')) return
        try {
            await adminService.deleteSpecialty(id)
            toast.success('Specialization deleted successfully')
            fetchSpecialties()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete specialization')
        }
    }

    const handleToggleStatus = async (id) => {
        try {
            await adminService.toggleSpecialtyStatus(id)
            toast.success('Status updated successfully')
            fetchSpecialties()
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size should be less than 5MB')
                return
            }
            setFormData({ ...formData, icon: file })
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setSubmitting(true)
            const data = new FormData()
            data.append('name', formData.name)
            data.append('description', formData.description)
            if (formData.icon) {
                data.append('icon', formData.icon)
            }

            if (editingSpecialty) {
                await adminService.updateSpecialty(editingSpecialty._id, data)
                toast.success('Specialization updated successfully')
            } else {
                await adminService.createSpecialty(data)
                toast.success('Specialization created successfully')
            }

            closeModal()
            fetchSpecialties()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save specialization')
        } finally {
            setSubmitting(false)
        }
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingSpecialty(null)
        setFormData({ name: '', description: '', icon: null })
        setImagePreview(null)
    }

    const filteredSpecialties = specialties.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading && specialties.length === 0) return <PageLoader />

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Medical Specializations</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage doctor specialties and categories</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-all shadow-md active:scale-95"
                >
                    <IoAddOutline className="text-xl" />
                    <span>Add New Specialization</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative">
                        <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                        <input
                            type="text"
                            placeholder="Search specializations by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border-none focus:ring-0 transition-all outline-none"
                        />
                    </div>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Grid View"
                    >
                        <IoGridOutline className="text-xl" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="List View"
                    >
                        <IoListOutline className="text-xl" />
                    </button>
                </div>
            </div>

            {/* Content View */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredSpecialties.map((specialty) => (
                        <div key={specialty._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                            <div className="aspect-video relative overflow-hidden bg-slate-50 border-b border-slate-100">
                                {specialty.icon ? (
                                    <img
                                        src={specialty.icon.startsWith('http') ? specialty.icon : `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${specialty.icon}`}
                                        alt={specialty.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <IoCloudUploadOutline className="text-5xl" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3">
                                    <button
                                        onClick={() => handleToggleStatus(specialty._id)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm transition-colors ${specialty.isActive ? 'bg-green-500/90 text-white' : 'bg-slate-500/90 text-white'
                                            }`}
                                    >
                                        {specialty.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-slate-900 mb-1">{specialty.name}</h3>
                                <p className="text-slate-500 text-sm line-clamp-2 mb-4 h-10">
                                    {specialty.description || 'No description provided.'}
                                </p>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <span className="font-semibold text-primary text-sm">{specialty.doctorCount || 0}</span>
                                        <span>Doctors</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(specialty)}
                                            className="p-2 text-primary hover:bg-primary-surface rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <IoPencilOutline className="text-xl" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(specialty._id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <IoTrashOutline className="text-xl" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Icon</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Doctors</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredSpecialties.map((specialty) => (
                                    <tr key={specialty._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-12 rounded-xl border border-slate-100 overflow-hidden bg-slate-50">
                                                {specialty.icon ? (
                                                    <img
                                                        src={specialty.icon.startsWith('http') ? specialty.icon : `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${specialty.icon}`}
                                                        alt={specialty.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <IoCloudUploadOutline className="text-xl" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-900">{specialty.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-500 max-w-xs truncate">{specialty.description || 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-semibold text-primary">{specialty.doctorCount || 0}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(specialty._id)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${specialty.isActive
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    } transition-colors`}
                                            >
                                                {specialty.isActive ? <IoCheckmarkCircleOutline className="text-base" /> : <IoCloseCircleOutline className="text-base" />}
                                                <span>{specialty.isActive ? 'Active' : 'Inactive'}</span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleEdit(specialty)}
                                                    className="p-2 text-primary hover:bg-primary-surface rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <IoPencilOutline className="text-lg" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(specialty._id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <IoTrashOutline className="text-lg" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {filteredSpecialties.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center mt-6">
                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IoSearchOutline className="text-3xl" />
                    </div>
                    <h3 className="text-slate-900 font-bold text-lg">No specializations found</h3>
                    <p className="text-slate-500">Try adjusting your search or add a new specialization.</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && closeModal()}></div>
                    <div className="bg-white rounded-3xl w-full max-w-lg relative z-10 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{editingSpecialty ? 'Edit Specialization' : 'Add Specialization'}</h2>
                                <p className="text-slate-500 text-sm mt-1">Fill in the details for the medical category.</p>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm text-slate-500">
                                <IoAddOutline className="text-2xl rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Specialization Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    placeholder="e.g. Cardiology, Dermatology"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[100px] resize-none"
                                    placeholder="A brief description of this specialisation..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Icon / Image</label>
                                <div
                                    onClick={() => fileInputRef.current.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-primary hover:bg-slate-50 transition-all group relative overflow-hidden h-40 flex flex-col items-center justify-center"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-10 transition-opacity" alt="Preview" />
                                    ) : null}

                                    {imagePreview ? (
                                        <div className="z-10 flex flex-col items-center">
                                            <IoCloudUploadOutline className="text-3xl text-primary mb-2" />
                                            <span className="text-sm font-medium text-slate-600">Click to change image</span>
                                        </div>
                                    ) : (
                                        <>
                                            <IoCloudUploadOutline className="text-4xl text-slate-300 group-hover:text-primary-light transition-colors mb-2" />
                                            <p className="text-sm text-slate-500">Upload a nice representation image</p>
                                            <p className="text-xs text-slate-400 mt-1">Supports: JPG, PNG, WEBP (Max 5MB)</p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                    {imagePreview && (
                                        <img src={imagePreview} className="z-20 w-24 h-24 object-cover rounded-xl shadow-md border-2 border-white" alt="Thumbnail" />
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={closeModal}
                                    className="flex-1 px-6 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-6 py-2.5 rounded-xl font-medium text-white bg-primary hover:bg-primary-dark transition-colors shadow-lg shadow-primary-surface disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>{editingSpecialty ? 'Update Specializations' : 'Create Specializations'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminSpecialization
