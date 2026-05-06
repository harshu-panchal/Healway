import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoSearchOutline,
  IoMedicalOutline,
  IoPeopleOutline,
  IoCloseOutline,
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
  IoMaleFemaleOutline,
  IoSchoolOutline,
  IoRibbonOutline,
  IoLanguageOutline,
  IoBusinessOutline,
  IoWalletOutline,
  IoCardOutline,
  IoCashOutline,
  IoBriefcaseOutline,
  IoInformationCircleOutline,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import {
  getDoctors,
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
      services: item.services && Array.isArray(item.services) ? item.services : [],
      fees: item.fees || {},
      withdrawalMethod: item.withdrawalMethod || 'none',
      withdrawalDetails: item.withdrawalDetails || {},
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
  const navigate = useNavigate()
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

  const handleDownload = async (fileUrl, fileName) => {
    try {
      const normalizedUrl = normalizeDocumentUrl(fileUrl)

      // If it's a Cloudinary URL, we can use the fl_attachment transformation to force download
      let downloadUrl = normalizedUrl
      if (normalizedUrl.includes('res.cloudinary.com') && !normalizedUrl.includes('/raw/upload/')) {
        // Find if it has /upload/ and replace with /upload/fl_attachment/
        downloadUrl = normalizedUrl.replace('/upload/', '/upload/fl_attachment/')
      }

      // We attempt to fetch the file to create a blob for a truly direct download if possible
      try {
        const response = await fetch(downloadUrl, { mode: 'cors' })
        if (response.ok) {
          const blob = await response.blob()
          const blobUrl = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = blobUrl
          a.download = fileName || 'document.pdf'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          window.URL.revokeObjectURL(blobUrl)
          return
        }
      } catch (err) {
        console.warn('Direct blob download failed (likely CORS), falling back to URL open', err)
      }

      // Fallback: Use the link with download attribute or just open it
      window.open(downloadUrl, '_blank')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download document')
    }
  }

  const handleViewDocument = async (fileUrl, fileName) => {
    try {
      const normalizedUrl = normalizeDocumentUrl(fileUrl)
      // Check for PDF by extension in either URL or original filename
      const isPdf = fileUrl?.toLowerCase().endsWith('.pdf') || fileName?.toLowerCase().endsWith('.pdf')

      // Use the fetch strategy whenever possible for PDFs as it's the most reliable way to force inline viewing
      if (isPdf) {
        try {
          const response = await fetch(normalizedUrl, { mode: 'cors' })
          if (response.ok) {
            const blob = await response.blob()
            const viewUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
            window.open(viewUrl, '_blank')
            return
          }
        } catch (err) {
          console.warn('PDF blob view failed (CORS), trying URL-based display', err)
        }
      }

      // Fallback for Cloudinary inline display
      let finalUrl = normalizedUrl
      if (normalizedUrl.includes('res.cloudinary.com') && !normalizedUrl.includes('/raw/upload/')) {
        finalUrl = normalizedUrl.replace('/upload/fl_attachment/', '/upload/fl_inline/')
        if (!finalUrl.includes('fl_inline')) {
          finalUrl = finalUrl.replace('/upload/', '/upload/fl_inline/')
        }
      }
      window.open(finalUrl, '_blank')
    } catch (error) {
      console.error('View error:', error)
      toast.error('Failed to open document')
    }
  }

  useEffect(() => {
    loadVerifications()
  }, [statusFilter, currentPage])

  const loadVerifications = async () => {
    try {
      setLoading(true)
      const response = await getDoctors({ page: 1, limit: 1000 })
      const allVerifications = []

      if (response && response.success && response.data) {
        const doctors = response.data.items || []
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

    if (verification.type === 'doctor') {
      if (viewingVerification?.id === id) {
        setViewingVerification(null)
      }
      navigate(`/admin/doctors/edit/${id}?approve=1&returnTo=/admin/verification`)
      return
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
                                Complete Details
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
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTypeColor(viewingVerification.type)}`}>
                  {(() => {
                    const Icon = getTypeIcon(viewingVerification.type)
                    return <Icon className="h-5 w-5" />
                  })()}
                </div>
                <h2 className="text-lg font-bold text-slate-900">Verification Details</h2>
              </div>
              <button onClick={() => setViewingVerification(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <IoCloseOutline className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Basic Information */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <IoInformationCircleOutline className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Full Name</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Email Address</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.email}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Phone Number</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.phone || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Gender</p>
                        <p className="mt-1 text-sm font-bold text-slate-900 capitalize">{viewingVerification.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
                        <span className={`mt-1 inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${viewingVerification.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : viewingVerification.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {viewingVerification.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Professional Information */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <IoBriefcaseOutline className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Professional Information</h3>
                </div>
                {(!viewingVerification.gender || !viewingVerification.licenseNumber || !viewingVerification.qualification) && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                    This request needs full doctor profile completion before approval. Open the admin doctor form, fill every remaining field, then approve from there.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Specialization</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.specialty || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">License Number</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.licenseNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Qualification</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.qualification || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Experience</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.experienceYears ? `${viewingVerification.experienceYears} Years` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Languages</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {viewingVerification.languages.length > 0 ? (
                          viewingVerification.languages.map((lang, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-600">
                              {lang}
                            </span>
                          ))
                        ) : 'N/A'}
                      </div>
                    </div>
                    {viewingVerification.education.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Education</p>
                        <ul className="mt-1 space-y-1">
                          {viewingVerification.education.map((edu, i) => (
                            <li key={i} className="text-xs font-bold text-slate-900">{edu}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                {viewingVerification.bio && (
                  <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Biography</p>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed italic">"{viewingVerification.bio}"</p>
                  </div>
                )}
                {viewingVerification.services.length > 0 && (
                  <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Services Offered</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingVerification.services.map((service, i) => (
                        <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-bold">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Clinic & Location */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <IoBusinessOutline className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Clinic & Location</h3>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Clinic Name</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.clinic || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Full Address</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.fullAddress || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Consultation & Fees */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <IoCashOutline className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Consultation & Fees</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">In-Person</p>
                    <div className="mt-2 text-lg font-black text-emerald-700">
                      ₹{viewingVerification.fees?.inPerson?.final || 0}
                    </div>
                    {viewingVerification.fees?.inPerson?.discount > 0 && (
                      <p className="text-[10px] text-emerald-500 line-through">₹{viewingVerification.fees.inPerson.original}</p>
                    )}
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Video Call</p>
                    <div className="mt-2 text-lg font-black text-blue-700">
                      ₹{viewingVerification.fees?.videoCall?.final || 0}
                    </div>
                    {viewingVerification.fees?.videoCall?.discount > 0 && (
                      <p className="text-[10px] text-blue-500 line-through">₹{viewingVerification.fees.videoCall.original}</p>
                    )}
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">Voice Call</p>
                    <div className="mt-2 text-lg font-black text-purple-700">
                      ₹{viewingVerification.fees?.voiceCall?.final || 0}
                    </div>
                    {viewingVerification.fees?.voiceCall?.discount > 0 && (
                      <p className="text-[10px] text-purple-500 line-through">₹{viewingVerification.fees.voiceCall.original}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Modes Offered</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingVerification.consultationModes.length > 0 ? (
                      viewingVerification.consultationModes.map((mode, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700">
                          {mode}
                        </span>
                      ))
                    ) : 'N/A'}
                  </div>
                </div>
              </section>

              {/* Payout Details */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <IoWalletOutline className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Payout Details</h3>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Method</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 uppercase">{viewingVerification.withdrawalMethod || 'Not Set'}</p>
                  </div>

                  {viewingVerification.withdrawalMethod === 'bank_transfer' && viewingVerification.withdrawalDetails?.bank ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Account Holder</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.withdrawalDetails.bank.accountHolderName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Bank Name</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.withdrawalDetails.bank.bankName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Account Number</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.withdrawalDetails.bank.accountNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">IFSC Code</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.withdrawalDetails.bank.ifscCode || 'N/A'}</p>
                      </div>
                    </div>
                  ) : viewingVerification.withdrawalMethod === 'upi' && viewingVerification.withdrawalDetails?.upi ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">UPI ID</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{viewingVerification.withdrawalDetails.upi.upiId || 'N/A'}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No payout details provided yet.</p>
                  )}
                </div>
              </section>

              {/* Documents */}
              {viewingVerification.documents && viewingVerification.documents.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <IoDocumentTextOutline className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Verification Documents</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {viewingVerification.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white group hover:border-primary transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <IoDocumentTextOutline className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-700 truncate">{doc.name}</span>
                            {doc.uploadedAt && <span className="block text-[10px] text-slate-400">{formatDate(doc.uploadedAt)}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          <button
                            onClick={() => handleViewDocument(doc.fileUrl, doc.name)}
                            className="flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="View Document"
                          >
                            <IoEyeOutline className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(doc.fileUrl, doc.name)}
                            className="flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Download Document"
                          >
                            <IoDownloadOutline className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="border-t border-slate-200 p-6 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-[11px] text-slate-400 italic">
                Submitted on: {formatDate(viewingVerification.submittedAt)}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => setViewingVerification(null)} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
                  Close
                </button>
                {viewingVerification.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(viewingVerification.id)}
                      className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                    >
                      Complete Details
                    </button>
                    <button
                      onClick={() => handleRejectClick(viewingVerification.id)}
                      className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
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
