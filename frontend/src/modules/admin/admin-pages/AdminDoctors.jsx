import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  IoSearchOutline,
  IoMedicalOutline,
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoCloseCircleOutline,
  IoAddOutline,
  IoCloseOutline,
  IoEyeOutline,
  IoStarOutline,
  IoStar,
  IoMenuOutline,
  IoPeopleOutline,
  IoCalendarOutline,
  IoStatsChartOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoToggleOutline,
  IoToggle,
} from 'react-icons/io5'
import { Reorder, useDragControls } from 'framer-motion'
import { useToast } from '../../../contexts/ToastContext'
import {
  getDoctors,
  getDoctorById,
  getDoctorStats,
  verifyDoctor,
  rejectDoctor,
  toggleDoctorFeatured,
  reorderDoctors,
  deleteDoctor,
  toggleDoctorStatus,
} from '../admin-services/adminService'
import Pagination from '../../../components/Pagination'

const AdminDoctors = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter] = useState('verified')
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [statusModalDoctor, setStatusModalDoctor] = useState(null)
  const [rejectingDoctorId, setRejectingDoctorId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [viewingDoctor, setViewingDoctor] = useState(null)
  const [loadingDoctorDetails, setLoadingDoctorDetails] = useState(false)
  
  const [allDoctors, setAllDoctors] = useState([]) // Store all doctors for stats
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  // Statistics Modal State
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [statsFilter, setStatsFilter] = useState('all')
  const [doctorStats, setDoctorStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchTerm])

  useEffect(() => {
    loadDoctors()
  }, [statusFilter, searchTerm, currentPage])

  const loadDoctors = async () => {
    try {
      setLoading(true)

      // Load ALL doctors for stats
      const allDoctorsResponse = await getDoctors({ page: 1, limit: 1000 })
      if (allDoctorsResponse) {
        const formatFullAddress = (clinicDetails) => {
          if (!clinicDetails) return ''
          const parts = []
          if (clinicDetails.address) {
            const addr = clinicDetails.address
            if (addr.line1) parts.push(addr.line1)
            if (addr.line2) parts.push(addr.line2)
            if (addr.city) parts.push(addr.city)
            if (addr.state) parts.push(addr.state)
            if (addr.postalCode) parts.push(addr.postalCode)
            if (addr.country) parts.push(addr.country)
          }
          return parts.length > 0 ? parts.join(', ') : ''
        }

        const allTransformed = (allDoctorsResponse.items || []).map(doctor => ({
          id: doctor._id || doctor.id,
          name: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'N/A',
          email: doctor.email || '',
          phone: doctor.phone || '',
          specialty: doctor.specialization || '',
          clinic: doctor.clinicDetails?.name || '',
          location: formatFullAddress(doctor.clinicDetails),
          totalConsultations: 0,
          status: doctor.status === 'approved' ? 'verified' : doctor.status || 'pending',
          isFeatured: !!doctor.isFeatured,
          isActive: doctor.isActive !== false,
          accessMode: doctor.accessMode || (doctor.isActive === false ? 'hidden' : 'active'),
          registeredAt: doctor.createdAt || new Date().toISOString(),
          rejectionReason: doctor.rejectionReason || '',
        }))
        setAllDoctors(allTransformed)
      }

      // Load paginated/filtered doctors
      const filters = {}
      if (statusFilter !== 'all') {
        filters.status = statusFilter === 'verified' ? 'approved' : statusFilter
      }
      if (searchTerm && searchTerm.trim()) {
        filters.search = searchTerm.trim()
      }
      filters.page = currentPage
      filters.limit = itemsPerPage

      const response = await getDoctors(filters)
      if (response) {
        const doctorsData = response.items || response || []
        const pagination = response.pagination || {}

        const formatFullAddress = (clinicDetails) => {
          if (!clinicDetails) return ''
          const parts = []
          if (clinicDetails.address) {
            const addr = clinicDetails.address
            if (addr.line1) parts.push(addr.line1)
            if (addr.line2) parts.push(addr.line2)
            if (addr.city) parts.push(addr.city)
            if (addr.state) parts.push(addr.state)
            if (addr.postalCode) parts.push(addr.postalCode)
            if (addr.country) parts.push(addr.country)
          }
          return parts.length > 0 ? parts.join(', ') : ''
        }

        const transformedDoctors = doctorsData.map(doctor => ({
          id: doctor._id || doctor.id,
          name: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'N/A',
          email: doctor.email || '',
          phone: doctor.phone || '',
          specialty: doctor.specialization || '',
          clinic: doctor.clinicDetails?.name || '',
          location: formatFullAddress(doctor.clinicDetails),
          totalConsultations: 0,
          status: doctor.status === 'approved' ? 'verified' : doctor.status || 'pending',
          isFeatured: !!doctor.isFeatured,
          isActive: doctor.isActive !== false,
          accessMode: doctor.accessMode || (doctor.isActive === false ? 'hidden' : 'active'),
          registeredAt: doctor.createdAt || new Date().toISOString(),
          rejectionReason: doctor.rejectionReason || '',
        }))
        setDoctors(transformedDoctors)
        setTotalPages(pagination.totalPages || 1)
        setTotalItems(pagination.total || 0)
      }
    } catch (error) {
      console.error('Error loading doctors:', error)
      toast.error(error.message || 'Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (doctorId) => {
    try {
      setProcessingId(doctorId)
      await verifyDoctor(doctorId)
      toast.success('Doctor approved successfully')
      await loadDoctors()
    } catch (error) {
      console.error('Error approving doctor:', error)
      toast.error(error.message || 'Failed to approve doctor')
    } finally {
      setProcessingId(null)
    }
  }

  const handleToggleFeatured = async (doctorId, currentFeatured) => {
    try {
      setProcessingId(doctorId)
      const newFeatured = !currentFeatured
      await toggleDoctorFeatured(doctorId, newFeatured)
      toast.success(newFeatured ? 'Doctor marked as featured' : 'Doctor removed from featured')
      setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, isFeatured: newFeatured } : d))
    } catch (error) {
      console.error('Error toggling featured status:', error)
      toast.error(error.message || 'Failed to update featured status')
    } finally {
      setProcessingId(null)
    }
  }

  const handleToggleStatus = async (doctorId, accessMode) => {
    try {
      setProcessingId(doctorId)
      const response = await toggleDoctorStatus(doctorId, accessMode)
      const nextMode = response?.data?.accessMode || accessMode
      const nextActive = response?.data?.isActive ?? (nextMode !== 'hidden')
      const successMessage = {
        active: 'Doctor activated successfully',
        hidden: 'Doctor hidden from patients and login blocked',
        visible_unbookable: 'Doctor visible to patients but booking disabled',
      }[nextMode] || 'Doctor access updated successfully'

      toast.success(successMessage)
      setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, isActive: nextActive, accessMode: nextMode } : d))
      setAllDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, isActive: nextActive, accessMode: nextMode } : d))
      setStatusModalDoctor(null)
    } catch (error) {
      console.error('Error toggling doctor status:', error)
      toast.error(error.message || 'Failed to update status')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) {
      return
    }

    try {
      setProcessingId(doctorId)
      await deleteDoctor(doctorId)
      toast.success('Doctor deleted successfully')
      await loadDoctors()
    } catch (error) {
      console.error('Error deleting doctor:', error)
      toast.error(error.message || 'Failed to delete doctor')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectClick = (doctorId) => {
    setRejectingDoctorId(doctorId)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const handleReject = async () => {
    if (!rejectingDoctorId) return
    if (!rejectionReason.trim()) {
      toast.warning('Please provide a reason for rejection.')
      return
    }

    try {
      setProcessingId(rejectingDoctorId)
      await rejectDoctor(rejectingDoctorId, rejectionReason.trim())
      toast.success('Doctor rejected successfully')
      await loadDoctors()
      setShowRejectModal(false)
      setRejectingDoctorId(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting doctor:', error)
      toast.error(error.message || 'Failed to reject doctor')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReorder = async (newOrder) => {
    setDoctors(newOrder)
    try {
      const baseOrder = (currentPage - 1) * itemsPerPage
      const orders = newOrder.map((doc, index) => ({
        id: doc.id,
        sortOrder: baseOrder + index,
      }))
      await reorderDoctors(orders)
      toast.success('Order updated')
    } catch (error) {
      console.error('Error reordering doctors:', error)
      toast.error('Failed to save order')
      loadDoctors()
    }
  }

  const handleViewDoctor = async (doctorId) => {
    try {
      setLoadingDoctorDetails(true)
      const response = await getDoctorById(doctorId)
      if (response.data) {
        setViewingDoctor(response.data)
      } else {
        toast.error('Failed to load doctor details')
      }
    } catch (error) {
      console.error('Error fetching doctor details:', error)
      toast.error(error.message || 'Failed to load doctor details')
    } finally {
      setLoadingDoctorDetails(false)
    }
  }

  const fetchDoctorStats = async (doctorId, filter = 'all') => {
    setLoadingStats(true)
    try {
      const response = await getDoctorStats(doctorId, filter)
      if (response && response.data) {
        setDoctorStats(response.data)
      } else {
        toast.error('Failed to load statistics')
      }
    } catch (error) {
      console.error('Error fetching doctor stats:', error)
      toast.error(error.message || 'Failed to load statistics')
    } finally {
      setLoadingStats(false)
    }
  }

  const handleDoctorStatsClick = async (doctor) => {
    setSelectedDoctor(doctor)
    setStatsFilter('all')
    setDoctorStats(null)
    await fetchDoctorStats(doctor.id, 'all')
  }

  const handleStatsFilterChange = async (newFilter) => {
    if (!selectedDoctor) return
    setStatsFilter(newFilter)
    await fetchDoctorStats(selectedDoctor.id, newFilter)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        loadDoctors()
      } else {
        setCurrentPage(1)
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getAccessModeBadge = (doctor) => {
    const mode = doctor.accessMode || (doctor.isActive ? 'active' : 'hidden')

    if (mode === 'visible_unbookable') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
          Booking Off
        </span>
      )
    }

    if (mode === 'hidden') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
          Hidden
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
        Active
      </span>
    )
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-surface px-2 py-1 text-[10px] font-semibold text-primary">
            <IoCheckmarkCircleOutline className="h-3 w-3" />
            Verified
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
            <IoTimeOutline className="h-3 w-3" />
            Pending
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
            <IoCloseCircleOutline className="h-3 w-3" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  return (
    <section className="flex flex-col gap-2 pb-20 pt-0">
      {/* Header */}
      <header className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2.5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctors Management</h1>
          <p className="mt-0.5 text-sm text-slate-600">Manage all registered doctors</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/doctors/create')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:scale-[0.98]"
        >
          <IoAddOutline className="h-4 w-4" />
          Add Doctor
        </button>
      </header>

      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <IoSearchOutline className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          placeholder="Search doctors by name, specialty, or clinic..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Verified Doctors</p>
          <p className="mt-1 text-2xl font-bold text-primary">
            {allDoctors.filter((d) => d.status === 'verified').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Featured Doctors</p>
          <p className="mt-1 text-2xl font-bold text-amber-500">
            {allDoctors.filter((d) => d.status === 'verified' && d.isFeatured).length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Appointments</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {allDoctors.reduce((sum, d) => sum + d.totalConsultations, 0)}
          </p>
        </div>
      </div>

      {/* Doctors List */}
      <div className="space-y-2">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">Loading doctors...</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">No doctors found</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={doctors} onReorder={handleReorder} className="space-y-2">
            {doctors.map((doctor) => (
              <DoctorItem
                key={doctor.id}
                doctor={doctor}
                getStatusBadge={getStatusBadge}
                handleToggleFeatured={handleToggleFeatured}
                getAccessModeBadge={getAccessModeBadge}
                setStatusModalDoctor={setStatusModalDoctor}
                handleDeleteDoctor={handleDeleteDoctor}
                processingId={processingId}
                handleViewDoctor={handleViewDoctor}
                handleDoctorStatsClick={handleDoctorStatsClick}
                loadingDoctorDetails={loadingDoctorDetails}
                handleApprove={handleApprove}
                handleRejectClick={handleRejectClick}
                formatDate={formatDate}
                navigate={navigate}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* Pagination */}
      {!loading && doctors.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        </div>
      )}

      {/* Reject Doctor Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowRejectModal(false)
            setRejectingDoctorId(null)
            setRejectionReason('')
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">Reject Doctor</h2>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectingDoctorId(null)
                  setRejectionReason('')
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <IoCloseOutline className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-3">
                  Please provide a reason for rejecting this doctor. This reason will be visible to the doctor.
                </p>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter the reason for rejection..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
                />
                {!rejectionReason.trim() && (
                  <p className="mt-1 text-xs text-red-600">Reason is required</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectingDoctorId(null)
                  setRejectionReason('')
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId === rejectingDoctorId}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {processingId === rejectingDoctorId ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusModalDoctor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setStatusModalDoctor(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Doctor Access</h2>
                <p className="text-xs text-slate-500 mt-1">{statusModalDoctor.name}</p>
              </div>
              <button
                onClick={() => setStatusModalDoctor(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <IoCloseOutline className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <button
                type="button"
                onClick={() => handleToggleStatus(statusModalDoctor.id, 'active')}
                disabled={processingId === statusModalDoctor.id}
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left hover:bg-emerald-100 disabled:opacity-60"
              >
                <p className="text-sm font-semibold text-emerald-800">Active</p>
                <p className="text-xs text-emerald-700 mt-1">Doctor can log in, patients can view the profile, and booking remains enabled.</p>
              </button>

              <button
                type="button"
                onClick={() => handleToggleStatus(statusModalDoctor.id, 'hidden')}
                disabled={processingId === statusModalDoctor.id}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100 disabled:opacity-60"
              >
                <p className="text-sm font-semibold text-slate-800">Hide From Patients</p>
                <p className="text-xs text-slate-600 mt-1">Doctor cannot log in, and the profile will be hidden from patients.</p>
              </button>

              <button
                type="button"
                onClick={() => handleToggleStatus(statusModalDoctor.id, 'visible_unbookable')}
                disabled={processingId === statusModalDoctor.id}
                className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100 disabled:opacity-60"
              >
                <p className="text-sm font-semibold text-amber-800">Show But Disable Booking</p>
                <p className="text-xs text-amber-700 mt-1">Doctor cannot log in, the profile stays visible, but booking remains disabled.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Doctor Details Modal */}
      {viewingDoctor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewingDoctor(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">Doctor Details</h2>
              <button
                onClick={() => setViewingDoctor(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <IoCloseOutline className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {loadingDoctorDetails ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-slate-600">Loading doctor details...</p>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Basic Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Full Name</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {`${viewingDoctor.firstName || ''} ${viewingDoctor.lastName || ''}`.trim() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingDoctor.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Phone</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingDoctor.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Specialization</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingDoctor.specialization || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Registration Number</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingDoctor.registrationNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <div className="mt-1">{getStatusBadge(viewingDoctor.status === 'approved' ? 'verified' : viewingDoctor.status || 'pending')}</div>
                      </div>
                    </div>
                  </div>

                  {viewingDoctor.clinicDetails && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Clinic Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {viewingDoctor.clinicDetails.name && (
                          <div>
                            <p className="text-xs text-slate-500">Clinic Name</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{viewingDoctor.clinicDetails.name}</p>
                          </div>
                        )}
                        {viewingDoctor.clinicDetails.address && (
                          <div className="sm:col-span-2">
                            <p className="text-xs text-slate-500">Address</p>
                            <div className="bg-slate-50 rounded-lg p-3 mt-1">
                              <p className="text-sm text-slate-900">
                                {viewingDoctor.clinicDetails.address.line1 || ''}
                                {viewingDoctor.clinicDetails.address.line2 && `, ${viewingDoctor.clinicDetails.address.line2}`}
                                {viewingDoctor.clinicDetails.address.city && `, ${viewingDoctor.clinicDetails.address.city}`}
                                {viewingDoctor.clinicDetails.address.state && `, ${viewingDoctor.clinicDetails.address.state}`}
                                {viewingDoctor.clinicDetails.address.postalCode && ` - ${viewingDoctor.clinicDetails.address.postalCode}`}
                                {viewingDoctor.clinicDetails.address.country && `, ${viewingDoctor.clinicDetails.address.country}`}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Additional Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {viewingDoctor.createdAt && (
                        <div>
                          <p className="text-xs text-slate-500">Registered Date</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {new Date(viewingDoctor.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                      {viewingDoctor.approvedAt && (
                        <div>
                          <p className="text-xs text-slate-500">Approved Date</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {new Date(viewingDoctor.approvedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                      {viewingDoctor.rejectionReason && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-slate-500">Rejection Reason</p>
                          <p className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded-lg">{viewingDoctor.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                onClick={() => setViewingDoctor(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Statistics Modal */}
      {selectedDoctor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setSelectedDoctor(null)
            setDoctorStats(null)
            setStatsFilter('all')
          }}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <IoStatsChartOutline className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Doctor Statistics</h2>
                  <p className="text-xs text-slate-600">{selectedDoctor.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedDoctor(null)
                  setDoctorStats(null)
                  setStatsFilter('all')
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <IoCloseOutline className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatsFilterChange('all')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${statsFilter === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-primary/30 hover:bg-primary/5'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <IoCalendarOutline className="h-4 w-4" />
                    All Time
                  </div>
                </button>
                <button
                  onClick={() => handleStatsFilterChange('today')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${statsFilter === 'today'
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-primary/30 hover:bg-primary/5'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <IoTimeOutline className="h-4 w-4" />
                    Today
                  </div>
                </button>
              </div>
            </div>

            {/* Statistics Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingStats ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                  <p className="mt-4 text-sm text-slate-600">Loading statistics...</p>
                </div>
              ) : doctorStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-xl border border-blue-200/50 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 shadow-lg">
                          <IoPeopleOutline className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Total Patients</p>
                      <p className="text-3xl font-black text-blue-900">
                        {doctorStats.stats.totalPatients}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        {statsFilter === 'today' ? 'Today' : 'All time'}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-5 rounded-xl border border-green-200/50 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 shadow-lg">
                          <IoCalendarOutline className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-green-700 mb-1">Total Appointments</p>
                      <p className="text-3xl font-black text-green-900">
                        {doctorStats.stats.totalAppointments}
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        {statsFilter === 'today' ? 'Today' : 'All time'}
                      </p>
                    </div>
                  </div>

                  {doctorStats.stats.statusBreakdown && Object.keys(doctorStats.stats.statusBreakdown).length > 0 && (
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <IoStatsChartOutline className="h-4 w-4 text-slate-600" />
                        Appointment Status Breakdown
                      </h3>
                      <div className="space-y-3">
                        {doctorStats.stats.statusBreakdown.completed !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              <span className="text-sm font-medium text-slate-700">Completed</span>
                            </div>
                            <span className="text-lg font-bold text-green-600">
                              {doctorStats.stats.statusBreakdown.completed || 0}
                            </span>
                          </div>
                        )}
                        {doctorStats.stats.statusBreakdown.pending !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <span className="text-sm font-medium text-slate-700">Pending</span>
                            </div>
                            <span className="text-lg font-bold text-blue-600">
                              {doctorStats.stats.statusBreakdown.pending || 0}
                            </span>
                          </div>
                        )}
                        {doctorStats.stats.statusBreakdown.cancelled !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-red-500"></div>
                              <span className="text-sm font-medium text-slate-700">Cancelled</span>
                            </div>
                            <span className="text-lg font-bold text-red-600">
                              {doctorStats.stats.statusBreakdown.cancelled || 0}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {doctorStats.patients && doctorStats.patients.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <IoPeopleOutline className="h-4 w-4 text-slate-600" />
                        Patients List ({doctorStats.patients.length})
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {doctorStats.patients.map((patient, index) => (
                          <div key={patient.patientId} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div
                              className="p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition"
                              onClick={() => setSelectedPatient(selectedPatient === patient.patientId ? null : patient.patientId)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900">{patient.patientName}</h4>
                                      <p className="text-xs text-slate-500">
                                        {patient.totalAppointments} appointment{patient.totalAppointments !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600">
                                  {selectedPatient === patient.patientId ? (
                                    <IoChevronUpOutline className="h-5 w-5" />
                                  ) : (
                                    <IoChevronDownOutline className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {selectedPatient === patient.patientId && (
                              <div className="p-4 bg-white border-t border-slate-200">
                                <div className="space-y-2">
                                  {patient.appointments.map((apt) => (
                                    <div key={apt.appointmentId} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <p className="text-xs font-bold text-slate-900">
                                            {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.timeSlot}
                                          </p>
                                          <p className="text-[10px] text-slate-500 uppercase font-semibold mt-1">
                                            {apt.consultationType} • {apt.status}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs font-bold text-primary">₹{apt.fee}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-600">Failed to load statistics</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 bg-slate-50/50">
              <button
                onClick={() => {
                  setSelectedDoctor(null)
                  setDoctorStats(null)
                  setStatsFilter('all')
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminDoctors

const DoctorItem = ({
  doctor,
  getStatusBadge,
  getAccessModeBadge,
  handleToggleFeatured,
  setStatusModalDoctor,
  handleDeleteDoctor,
  processingId,
  handleViewDoctor,
  handleDoctorStatsClick,
  loadingDoctorDetails,
  handleApprove,
  handleRejectClick,
  formatDate,
  navigate
}) => {
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={doctor}
      dragListener={false}
      dragControls={dragControls}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md cursor-default select-none relative z-0"
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-surface cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <IoMenuOutline className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900">{doctor.name}</h3>
              <p className="mt-0.5 text-sm font-medium text-primary">{doctor.specialty}</p>
              <div className="mt-1.5 space-y-1 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <IoLocationOutline className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    {doctor.clinic && (
                      <p className="font-semibold text-slate-900">{doctor.clinic}</p>
                    )}
                    {doctor.location && (
                      <p className="text-slate-600 text-sm">{doctor.location}</p>
                    )}
                    {!doctor.clinic && !doctor.location && (
                      <span className="text-slate-400 text-sm">No address available</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IoMailOutline className="h-4 w-4 shrink-0" />
                  <span className="truncate">{doctor.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IoCallOutline className="h-4 w-4 shrink-0" />
                  <span>{doctor.phone}</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-start gap-2 flex-col">
              <div className="flex items-center gap-2">
                {getStatusBadge(doctor.status)}
                {doctor.status === 'verified' && getAccessModeBadge(doctor)}
                {doctor.status === 'verified' && (
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(doctor.id, doctor.isFeatured)}
                    disabled={processingId === doctor.id}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${doctor.isFeatured
                      ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    title={doctor.isFeatured ? 'Featured Doctor' : 'Set as Featured'}
                  >
                    {doctor.isFeatured ? (
                      <IoStar className="h-5 w-5" />
                    ) : (
                      <IoStarOutline className="h-5 w-5" />
                    )}
                  </button>
                )}
                {doctor.status === 'verified' && (
                   <button
                   type="button"
                   onClick={() => setStatusModalDoctor(doctor)}
                   disabled={processingId === doctor.id}
                   className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${doctor.accessMode === 'active'
                     ? 'bg-green-100 text-green-600 hover:bg-green-200'
                     : doctor.accessMode === 'visible_unbookable'
                       ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                       : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                     }`}
                   title="Manage Doctor Access"
                 >
                   {doctor.accessMode === 'active' ? (
                     <IoToggle className="h-5 w-5" />
                   ) : (
                     <IoToggleOutline className="h-5 w-5" />
                   )}
                 </button>
                )}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleViewDoctor(doctor.id)}
                  disabled={loadingDoctorDetails}
                  className="flex items-center gap-1 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <IoEyeOutline className="h-3.5 w-3.5" />
                  View
                </button>
                <button
                  type="button"
                  onClick={() => handleDoctorStatsClick(doctor)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark transition"
                >
                  <IoStatsChartOutline className="h-3.5 w-3.5" />
                  Stats
                </button>
                
                {doctor.status === 'verified' && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/doctors/edit/${doctor.id}`)}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <IoPencilOutline className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoctor(doctor.id)}
                      disabled={processingId === doctor.id}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300"
                    >
                      <IoTrashOutline className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </>
                )}

                {doctor.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(doctor.id)}
                      disabled={processingId === doctor.id}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:bg-primary/30 disabled:cursor-not-allowed"
                    >
                      {processingId === doctor.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectClick(doctor.id)}
                      disabled={processingId === doctor.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span>Consultations: {doctor.totalConsultations}</span>
            <span>Registered: {formatDate(doctor.registeredAt)}</span>
          </div>
        </div>
      </div>
    </Reorder.Item>
  )
}
