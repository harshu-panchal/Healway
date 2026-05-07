import React, { useState, useEffect } from 'react'
import {
    IoAddOutline,
    IoSearchOutline,
    IoTrashOutline,
    IoPencilOutline,
    IoCheckmarkCircleOutline,
    IoCloseCircleOutline,
    IoMedicalOutline
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import adminService from '../admin-services/adminService'
import PageLoader from '../../../components/PageLoader'

const AdminServices = () => {
    const [services, setServices] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [editingService, setEditingService] = useState(null)

    const toast = useToast()

    const [formData, setFormData] = useState({
        name: '',
        description: ''
    })

    useEffect(() => {
        fetchServices()
    }, [])

    const fetchServices = async () => {
        try {
            setLoading(true)
            const response = await adminService.getAllServices()
            if (response && response.success) {
                setServices(response.data || [])
            } else {
                setServices([])
            }
        } catch (error) {
            toast.error('Failed to fetch services')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (service) => {
        setEditingService(service)
        setFormData({
            name: service.name,
            description: service.description || ''
        })
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this service?')) return
        try {
            await adminService.deleteService(id)
            toast.success('Service deleted successfully')
            fetchServices()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete service')
        }
    }

    const handleToggleStatus = async (id) => {
        try {
            await adminService.toggleServiceStatus(id)
            toast.success('Status updated successfully')
            fetchServices()
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setSubmitting(true)
            if (editingService) {
                await adminService.updateService(editingService._id, formData)
                toast.success('Service updated successfully')
            } else {
                await adminService.createService(formData)
                toast.success('Service created successfully')
            }

            closeModal()
            fetchServices()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save service')
        } finally {
            setSubmitting(false)
        }
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingService(null)
        setFormData({ name: '', description: '' })
    }

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading && services.length === 0) return <PageLoader />

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Platform Services</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage general medical services provided</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-all shadow-md active:scale-95"
                >
                    <IoAddOutline className="text-xl" />
                    <span>Add New Service</span>
                </button>
            </div>

            {/* Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative">
                        <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                        <input
                            type="text"
                            placeholder="Search services by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border-none focus:ring-0 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Content View */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredServices.map((service) => (
                                <tr key={service._id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary-surface text-primary flex items-center justify-center">
                                                <IoMedicalOutline className="text-xl" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-900">{service.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-500 max-w-md truncate">{service.description || 'N/A'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleToggleStatus(service._id)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${service.isActive
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                } transition-colors`}
                                        >
                                            {service.isActive ? <IoCheckmarkCircleOutline className="text-base" /> : <IoCloseCircleOutline className="text-base" />}
                                            <span>{service.isActive ? 'Active' : 'Inactive'}</span>
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(service)}
                                                className="p-2 text-primary hover:bg-primary-surface rounded-lg transition-colors shadow-sm bg-white"
                                                title="Edit"
                                            >
                                                <IoPencilOutline className="text-lg" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(service._id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shadow-sm bg-white"
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

            {filteredServices.length === 0 && (
                <div className="py-20 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200 mt-6">
                    <IoMedicalOutline className="text-5xl mx-auto mb-4 text-slate-200" />
                    <p className="text-lg font-medium text-slate-400">No services matching your search.</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && closeModal()}></div>
                    <div className="bg-white rounded-3xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{editingService ? 'Edit Service' : 'Add New Service'}</h2>
                                <p className="text-slate-500 text-sm mt-0.5">Define a platform-wide medical service.</p>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm text-slate-500">
                                <IoAddOutline className="text-2xl rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Service Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    placeholder="e.g. Online Consultation, Home Visit"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[120px] resize-none"
                                    placeholder="Describe what this service covers..."
                                />
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
                                        <span>{editingService ? 'Update Service' : 'Create Service'}</span>
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

export default AdminServices
