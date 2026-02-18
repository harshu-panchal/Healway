import { useState, useEffect, useMemo } from 'react'
import {
  IoSearchOutline,
  IoMedicalOutline,
  IoPeopleOutline,
  IoCloseOutline ,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoTimeOutline,
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoCalendarOutline,
  IoEyeOutline,
  IoDocumentTextOutline,
  IoDownloadOutline,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import {
  getDoctors,
  verifyDoctor,
  rejectDoctor,
} from '../admin-services/adminService'
import Pagination from '../../../components/Pagination'

// Helper function to normalize document URLs
const normalizeDocumentUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
  const baseUrl = apiBaseUrl.replace('/api', '')
  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`
}

// Helper to transform backend data to frontend format
const transformVerification = (item, type) => {
  if (type === 'doctor') {
    // Build full address string
    const addressParts = []
    if (item.clinicDetails?.address) {
      const addr = item.clinicDetails.address
      if (addr.line1) addressParts.push(addr.line1)
      if (addr.line2) addressParts.push(addr.line2)
      if (addr.city) addressParts.push(addr.city)
      if (addr.state) addressParts.push(addr.state)
      if (addr.postalCode) addressParts.push(addr.postalCode)
      if (addr.country) addressParts.push(addr.country)
    }
    const fullAddress = addressParts.join(', ')

    // Build location string (city, state)
    const location = item.clinicDetails?.address
      ? `${item.clinicDetails.address.city || ''}, ${item.clinicDetails.address.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
      : ''

    // Format education array
    const educationList = item.education && Array.isArray(item.education) && item.education.length > 0
      ? item.education.map(edu => {
        const parts = []
        if (edu.institution) parts.push(edu.institution)
        if (edu.degree) parts.push(edu.degree)
        if (edu.year) parts.push(`(${edu.year})`)
        return parts.join(' - ')
      })
      : []

    // Format consultation modes
    const consultationModesList = item.consultationModes && Array.isArray(item.consultationModes) && item.consultationModes.length > 0
      ? item.consultationModes.map(mode => {
        if (mode === 'in_person') return 'In Person'
        if (mode === 'call') return 'Call'
        if (mode === 'audio') return 'Audio Call'
        if (mode === 'chat') return 'Chat'
        return mode
      })
      : []

    return {
      id: item._id || item.id,
      type: 'doctor',
      name: `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A',
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      email: item.email || '',
      phone: item.phone || '',
      gender: item.gender || '',
      specialty: item.specialization || '',
      licenseNumber: item.licenseNumber || '',
      experienceYears: item.experienceYears || null,
      qualification: item.qualification || '',
      bio: item.bio || '',
      consultationFee: item.consultationFee || null,
      languages: item.languages && Array.isArray(item.languages) ? item.languages : [],
      consultationModes: consultationModesList,
      education: educationList,
      clinic: item.clinicDetails?.name || '',
      location: location,
      fullAddress: fullAddress,
      address: item.clinicDetails?.address || null,
      status: item.status || 'pending',
      submittedAt: item.createdAt || new Date().toISOString(),
      documents: item.documents && Array.isArray(item.documents)
        ? item.documents.map(doc => ({
          name: doc.name || 'Document',
          fileUrl: doc.fileUrl || '',
          uploadedAt: doc.uploadedAt || null
        }))
        : [],
      rejectionReason: item.rejectionReason || '',
      approvedAt: item.approvedAt || null,
      rejectedAt: item.status === 'rejected' ? item.updatedAt : null,
    }
  }
  return null
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'doctor':
      return IoMedicalOutline
    default:
      return IoPeopleOutline
  }
}

const getTypeColor = (type) => {
  switch (type) {
    case 'doctor':
      return 'bg-emerald-100 text-emerald-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

const AdminVerification = () => {
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verifications, setVerifications] = useState([])
  const [viewingVerification, setViewingVerification] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingVerificationId, setRejectingVerificationId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchTerm])

  useEffect(() => {
    loadVerifications()
  }, [statusFilter, currentPage])

  const loadVerifications = async () => {
    try {
      setLoading(true)
      const response = await getDoctors({ page: 1, limit: 1000 })
      const allVerifications = []

      if (response) {
        const doctors = response.items || response || []
        if (Array.isArray(doctors)) {
          doctors.forEach(doctor => {
            const transformed = transformVerification(doctor, 'doctor')
            if (transformed) allVerifications.push(transformed)
          })
        }
      }
      setVerifications(allVerifications)
    } catch (error) {
      console.error('Error loading verifications:', error)
      toast.error(error.message || 'Failed to load verifications')
    } finally {
      setLoading(false)
    }
  }

  const filteredVerifications = verifications.filter((verification) => {
    const matchesSearch =
      verification.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      verification.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (verification.phone && verification.phone.includes(searchTerm))
    const matchesStatus = statusFilter === 'all' || verification.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const paginatedFilteredVerifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredVerifications.slice(startIndex, endIndex)
  }, [filteredVerifications, currentPage, itemsPerPage])

  useEffect(() => {
    const totalFiltered = filteredVerifications.length
    setTotalPages(Math.ceil(totalFiltered / itemsPerPage) || 1)
    setTotalItems(totalFiltered)
  }, [filteredVerifications, itemsPerPage])

  const handleApprove = async (id) => {
    const verification = verifications.find(v => v.id === id)
    if (!verification) return

    try {
      setProcessingId(id)
      await verifyDoctor(id)

      toast.success(`${verification.type.charAt(0).toUpperCase() + verification.type.slice(1)} approved successfully`)
      await loadVerifications()
      if (viewingVerification?.id === id) {
        setViewingVerification(null)
      }
    } catch (error) {
      console.error('Error approving verification:', error)
      toast.error(error.message || 'Failed to approve verification')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectClick = (id) => {
    setRejectingVerificationId(id)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const handleReject = async () => {
    if (!rejectingVerificationId) return
    if (!rejectionReason.trim()) {
      toast.warning('Please provide a reason for rejection.')
      return
    }

    const verification = verifications.find(v => v.id === rejectingVerificationId)
    if (!verification) return

    try {
      setProcessingId(rejectingVerificationId)
      await rejectDoctor(rejectingVerificationId, rejectionReason.trim())

      toast.success(`${verification.type.charAt(0).toUpperCase() + verification.type.slice(1)} rejected successfully`)
      await loadVerifications()
      if (viewingVerification?.id === rejectingVerificationId) {
        setViewingVerification(null)
      }
      setShowRejectModal(false)
      setRejectingVerificationId(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting verification:', error)
      toast.error(error.message || 'Failed to reject verification')
    } finally {
      setProcessingId(null)
    }
  }

  const stats = {
    total: verifications.length,
    pending: verifications.filter((v) => v.status === 'pending').length,
    approved: verifications.filter((v) => v.status === 'approved').length,
    rejected: verifications.filter((v) => v.status === 'rejected').length,
  }

  return (
    <section className="flex flex-col gap-2 pb-20 pt-0">
      <header className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2.5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verification Management</h1>
          <p className="mt-0.5 text-sm text-slate-600">Verify doctors and providers</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Requests</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
          <p className="mt-0.5 text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approved</p>
          <p className="mt-0.5 text-2xl font-bold text-emerald-600">{stats.approved}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rejected</p>
          <p className="mt-0.5 text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
      </div>

      <div className="relative mb-3">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <IoSearchOutline className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${statusFilter === 'pending' ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${statusFilter === 'approved' ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${statusFilter === 'rejected' ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
          >
            Rejected
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">Loading verifications...</p>
          </div>
        ) : filteredVerifications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">No verification requests found</p>
          </div>
        ) : (
          paginatedFilteredVerifications.map((verification) => {
            const TypeIcon = getTypeIcon(verification.type)
            return (
              <article key={verification.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${getTypeColor(verification.type)}`}>
                    <TypeIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900">{verification.name}</h3>
                        <p className="mt-0.5 text-sm text-slate-600 capitalize">{verification.type}</p>
                        <div className="mt-1.5 space-y-1 text-sm text-slate-600">
                          {verification.specialty && (
                            <div className="flex items-center gap-2">
                              <IoMedicalOutline className="h-4 w-4 shrink-0" />
                              <span>{verification.specialty}</span>
                            </div>
                          )}
                          {verification.clinic && (
                            <div className="flex items-center gap-2">
                              <IoLocationOutline className="h-4 w-4 shrink-0" />
                              <span>{verification.clinic}{verification.location ? `, ${verification.location}` : ''}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <IoMailOutline className="h-4 w-4 shrink-0" />
                            <span className="truncate">{verification.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <IoCallOutline className="h-4 w-4 shrink-0" />
                            <span>{verification.phone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${verification.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : verification.status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          {verification.status === 'pending' && <IoTimeOutline className="h-3 w-3" />}
                          {verification.status === 'approved' && <IoCheckmarkCircleOutline className="h-3 w-3" />}
                          {verification.status === 'rejected' && <IoCloseCircleOutline className="h-3 w-3" />}
                          {verification.status}
                        </span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewingVerification(verification)} className="flex items-center gap-1 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                            <IoEyeOutline className="h-3.5 w-3.5" />
                            View
                          </button>
                          {verification.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(verification.id)} disabled={processingId === verification.id} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300">
                                Approve
                              </button>
                              <button onClick={() => handleRejectClick(verification.id)} disabled={processingId === verification.id} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300">
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      {!loading && paginatedFilteredVerifications.length > 0 && (
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

      {viewingVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingVerification(null)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Verification Details</h2>
              <button onClick={() => setViewingVerification(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                <IoCloseOutline className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Name</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewingVerification.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewingVerification.email}</p>
                  </div>
                </div>
              </div>
              {viewingVerification.documents && viewingVerification.documents.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Documents</h3>
                  <div className="space-y-2">
                    {viewingVerification.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <IoDocumentTextOutline className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-medium text-slate-700">{doc.name}</span>
                        </div>
                        <a href={normalizeDocumentUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                          <IoDownloadOutline className="h-3.5 w-3.5" />
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setViewingVerification(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowRejectModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Reject Verification</h2>
            <p className="text-sm text-slate-600 mb-4">Please provide a reason for rejecting this verification request.</p>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." className="w-full h-32 rounded-lg border border-slate-300 p-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleReject} disabled={!rejectionReason.trim() || processingId === rejectingVerificationId} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300">
                {processingId === rejectingVerificationId ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminVerification
