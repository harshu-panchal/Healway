import { useState, useEffect } from 'react'
import {
  IoSearchOutline,
  IoFilterOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoTimeOutline,
  IoMailOutline,
  IoCallOutline,
  IoPersonOutline,
  IoBusinessOutline,
  IoMedicalOutline,
  IoHeartOutline,
} from 'react-icons/io5'
import {
  getSupportTickets,
  updateSupportTicketStatus,
} from '../admin-services/adminService'
import Pagination from '../../../components/Pagination'

const AdminSupport = () => {
  const [supportRequests, setSupportRequests] = useState([])
  const [filteredRequests, setFilteredRequests] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  // Load support tickets from API
  useEffect(() => {
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [statusFilter, roleFilter, searchTerm])

  useEffect(() => {
    loadSupportTickets()
  }, [statusFilter, roleFilter])

  const loadSupportTickets = async () => {
    try {
      setLoading(true)
      setError(null)
      const filters = {}
      if (statusFilter !== 'all') {
        // Map frontend status to backend status
        filters.status = statusFilter === 'pending' ? 'open' : statusFilter
      }
      if (roleFilter !== 'all') filters.userType = roleFilter
      // Load all tickets for client-side filtering and search
      filters.page = 1
      filters.limit = 1000

      const response = await getSupportTickets(filters)
      if (response && response.success) {
        // Transform API data to match component structure
        const tickets = response.data.items || response.data || []
        const pagination = response.data.pagination || {}
        console.log('📋 Raw support tickets from API:', tickets) // Debug log
        console.log('📋 Pagination info:', pagination) // Debug log

        const transformedTickets = tickets.map((ticket) => {
          // userId is now a populated object, not just an ID
          const user = ticket.userId && typeof ticket.userId === 'object' ? ticket.userId : {}
          let name = ''
          let role = ticket.userType || 'patient'

          console.log(`🔍 Processing ticket ${ticket._id}, userType: ${role}, user data:`, user) // Debug log

          // Helper to safely extract string values
          const getStringValue = (value) => {
            if (!value) return ''
            if (typeof value === 'string') return value
            if (typeof value === 'object') {
              // If it's an object, try to get a meaningful string representation
              if (value.name) return String(value.name)
              if (value.email) return String(value.email)
              if (value.phone) return String(value.phone)
              return ''
            }
            return String(value)
          }

          // Helper to safely extract email
          const getEmail = () => {
            if (user.email && typeof user.email === 'string') return user.email
            if (user.contactPerson && typeof user.contactPerson === 'object' && user.contactPerson.email) {
              return String(user.contactPerson.email)
            }
            if (ticket.email && typeof ticket.email === 'string') return ticket.email
            return ''
          }

          // Helper to safely extract phone
          const getPhone = () => {
            if (user.phone && typeof user.phone === 'string') return user.phone
            if (user.contactPerson && typeof user.contactPerson === 'object' && user.contactPerson.phone) {
              return String(user.contactPerson.phone)
            }
            if (ticket.contactNumber && typeof ticket.contactNumber === 'string') return ticket.contactNumber
            if (ticket.phone && typeof ticket.phone === 'string') return ticket.phone
            return ''
          }

          if (role === 'patient') {
            name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || getEmail() || 'Unknown'
          } else if (role === 'doctor') {
            name = `Dr. ${user.firstName || ''} ${user.lastName || ''}`.trim() || getEmail() || 'Unknown'
          }

          // Map status: 'open' -> 'pending' for UI consistency
          let status = ticket.status || 'open'
          if (status === 'open') {
            status = 'pending'
          }

          return {
            id: ticket._id || ticket.id,
            role,
            name,
            clinicName: getStringValue(user.clinicName || user.specialization) || null,
            email: getEmail(),
            contactNumber: getPhone(),
            note: getStringValue(ticket.message || ticket.note || ticket.subject),
            status: status,
            createdAt: ticket.createdAt || new Date().toISOString(),
            updatedAt: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
            adminNote: ticket.adminNote ? getStringValue(ticket.adminNote) : null,
            responses: ticket.responses || [],
          }
        })

        console.log('✅ Transformed support tickets:', transformedTickets) // Debug log
        setSupportRequests(transformedTickets)
      } else {
        setSupportRequests([])
        setTotalPages(1)
        setTotalItems(0)
      }
    } catch (err) {
      console.error('Error loading support tickets:', err)
      setError(err.message || 'Failed to load support tickets')
      setSupportRequests([])
      setTotalPages(1)
      setTotalItems(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = [...supportRequests]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (req) =>
          req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (req.clinicName && req.clinicName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          req.note.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((req) => req.status === statusFilter)
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((req) => req.role === roleFilter)
    }

    setFilteredRequests(filtered)

    // Update pagination based on filtered results
    const totalFiltered = filtered.length
    setTotalPages(Math.ceil(totalFiltered / itemsPerPage) || 1)
    setTotalItems(totalFiltered)
  }, [searchTerm, statusFilter, roleFilter, supportRequests, itemsPerPage])

  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor':
        return <IoMedicalOutline className="h-5 w-5" />
      case 'patient':
        return <IoPersonOutline className="h-5 w-5" />
      default:
        return <IoPersonOutline className="h-5 w-5" />
    }
  }

  const getRoleLabel = (role) => {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
      resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
      closed: { label: 'Closed', color: 'bg-slate-100 text-slate-800' },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const handleStatusChange = (request) => {
    setSelectedRequest(request)
    setNewStatus(request.status)
    setAdminNote(request.adminNote || '')
    setShowStatusModal(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedRequest || !newStatus) return

    setIsUpdating(true)

    try {
      // Map frontend status to backend status
      let backendStatus = newStatus
      if (newStatus === 'pending') {
        backendStatus = 'open'
      }

      await updateSupportTicketStatus(selectedRequest.id, backendStatus, adminNote)

      // Map backend status back to frontend status for display
      let displayStatus = backendStatus
      if (backendStatus === 'open') {
        displayStatus = 'pending'
      }

      // Update local state
      setSupportRequests((prev) =>
        prev.map((req) =>
          req.id === selectedRequest.id
            ? { ...req, status: displayStatus, adminNote, updatedAt: new Date().toISOString() }
            : req
        )
      )

      setShowStatusModal(false)
      setSelectedRequest(null)
      setNewStatus('')
      setAdminNote('')
    } catch (err) {
      console.error('Error updating support ticket status:', err)
      alert(err.message || 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
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

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Support Requests</h1>
        <p className="mt-1 text-sm text-slate-600">Manage support requests from all users</p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IoSearchOutline className="h-5 w-5" />
            </span>
            <input
              type="text"
              placeholder="Search by name, email, or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

        </div>
      </div>

      {/* Support Requests List */}
      <div className="space-y-2">
        {loading ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-600">Loading support requests...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed border-red-200 bg-red-50 p-8 text-center">
            <p className="text-sm font-medium text-red-600">Error: {error}</p>
            <button
              onClick={loadSupportTickets}
              className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : (() => {
          // Paginate filtered requests
          const startIndex = (currentPage - 1) * itemsPerPage
          const endIndex = startIndex + itemsPerPage
          const paginatedRequests = filteredRequests.slice(startIndex, endIndex)

          return paginatedRequests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm font-medium text-slate-600">No support requests found</p>
              <p className="mt-1 text-xs text-slate-500">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {paginatedRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-start gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                          {getRoleIcon(request.role)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900">
                              {typeof request.name === 'string' ? request.name : (request.name ? String(request.name) : 'Unknown')}
                            </h3>
                            <span className="text-[10px] font-medium text-slate-500">({getRoleLabel(request.role)})</span>
                            {getStatusBadge(request.status)}
                          </div>
                          {request.clinicName && (
                            <p className="mt-0.5 text-xs text-slate-600">
                              {typeof request.clinicName === 'string' ? request.clinicName : String(request.clinicName || '')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <IoMailOutline className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{typeof request.email === 'string' ? request.email : (request.email ? String(request.email) : 'N/A')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <IoCallOutline className="h-3.5 w-3.5 shrink-0" />
                          <span>{typeof request.contactNumber === 'string' ? request.contactNumber : (request.contactNumber ? String(request.contactNumber) : 'N/A')}</span>
                        </div>
                      </div>

                      {/* Message */}
                      <div className="rounded-lg bg-slate-50 p-2">
                        <p className="text-xs text-slate-700 line-clamp-2">
                          {typeof request.note === 'string' ? request.note : (request.note ? String(request.note) : 'No message')}
                        </p>
                      </div>

                      {/* Admin Note (if exists) */}
                      {request.adminNote && (
                        <div className="rounded-lg bg-blue-50 p-2">
                          <p className="text-[10px] font-semibold text-blue-900">Admin Note:</p>
                          <p className="mt-0.5 text-xs text-blue-800 line-clamp-2">
                            {typeof request.adminNote === 'string' ? request.adminNote : String(request.adminNote || '')}
                          </p>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <IoTimeOutline className="h-3 w-3" />
                          <span>Created: {formatDate(request.createdAt)}</span>
                        </div>
                        {request.updatedAt !== request.createdAt && (
                          <div className="flex items-center gap-1">
                            <IoTimeOutline className="h-3 w-3" />
                            <span>Updated: {formatDate(request.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex sm:flex-col sm:items-end shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(request)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-dark)] whitespace-nowrap"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {/* Pagination */}
              {filteredRequests.length > itemsPerPage && (
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
            </>
          )
        })()}
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm"
          onClick={() => setShowStatusModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-bold text-slate-900">Update Support Request Status</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Admin Note (Optional)</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={4}
                  placeholder="Add a note about this update..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false)
                    setSelectedRequest(null)
                    setNewStatus('')
                    setAdminNote('')
                  }}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={isUpdating || !newStatus}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSupport

