import { useState, useEffect } from 'react'
import { IoCloseOutline, IoCheckmarkCircleOutline, IoTimeOutline, IoCheckmarkCircle, IoCloseCircle, IoHourglassOutline } from 'react-icons/io5'
import { createSupportTicket, getSupportTickets, getSupportHistory } from '../doctor-services/doctorService'
import { useToast } from '../../../contexts/ToastContext'

const DoctorSupport = () => {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('new') // 'new', 'tickets', 'history'
  const [formData, setFormData] = useState({
    name: '',
    clinicName: '',
    email: '',
    contactNumber: '',
    note: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [tickets, setTickets] = useState([])
  const [history, setHistory] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await createSupportTicket({
        subject: `Support Request from ${formData.name} - ${formData.clinicName}`,
        message: formData.note,
        priority: 'medium',
      })

      if (response) {
        toast.success('Support request submitted successfully')
        setShowSuccessModal(true)
        setFormData({
          name: '',
          clinicName: '',
          email: '',
          contactNumber: '',
          note: '',
        })
        // Refresh tickets list if on tickets tab
        if (activeTab === 'tickets') {
          const ticketsResponse = await getSupportTickets()
          if (ticketsResponse) {
            const ticketsData = ticketsResponse.items || ticketsResponse || []
            setTickets(ticketsData)
          }
        }
      }
    } catch (error) {
      console.error('Error submitting support request:', error)
      toast.error(error.message || 'Failed to submit support request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fetch support tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoadingTickets(true)
        console.log('📋 Fetching doctor support tickets...')
        const response = await getSupportTickets()
        console.log('📋 Doctor support tickets response:', response)

        if (response) {
          // Backend returns { items: [...], pagination: {...} }
          const ticketsData = response.items || response || []
          console.log('✅ Processed doctor tickets:', ticketsData)
          setTickets(ticketsData)
        } else {
          console.warn('⚠️ Invalid response format:', response)
          setTickets([])
        }
      } catch (error) {
        console.error('❌ Error fetching doctor support tickets:', error)
        setTickets([])
      } finally {
        setLoadingTickets(false)
      }
    }

    if (activeTab === 'tickets') {
      fetchTickets()
    }
  }, [activeTab])

  // Fetch support history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true)
        console.log('📜 Fetching doctor support history...')
        const response = await getSupportHistory()
        console.log('📜 Doctor support history response:', response)

        if (response) {
          // Backend returns array directly in data
          const historyData = Array.isArray(response) ? response : []
          console.log('✅ Processed doctor history:', historyData)
          setHistory(historyData)
        } else {
          console.warn('⚠️ Invalid response format:', response)
          setHistory([])
        }
      } catch (error) {
        console.error('❌ Error fetching doctor support history:', error)
        setHistory([])
      } finally {
        setLoadingHistory(false)
      }
    }

    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab])

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return <IoCheckmarkCircle className="h-5 w-5 text-green-600" />
      case 'open':
      case 'pending':
      case 'in_progress':
        return <IoHourglassOutline className="h-5 w-5 text-yellow-600" />
      case 'rejected':
        return <IoCloseCircle className="h-5 w-5 text-red-600" />
      default:
        return <IoTimeOutline className="h-5 w-5 text-slate-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return 'bg-green-100 text-green-700'
      case 'open':
      case 'pending':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return dateString
    }
  }

  const isFormValid = formData.name && formData.clinicName && formData.email && formData.contactNumber && formData.note

  return (
    <div className="mx-auto max-w-2xl lg:max-w-md py-6 lg:py-1">
      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-sm font-semibold transition ${activeTab === 'new'
              ? 'border-b-2 border-primary text-primary'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          New Request
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`relative px-4 py-2 text-sm font-semibold transition ${activeTab === 'tickets'
              ? 'border-b-2 border-primary text-primary'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          My Tickets
          {tickets.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
              {tickets.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-semibold transition ${activeTab === 'history'
              ? 'border-b-2 border-primary text-primary'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          History
        </button>
      </div>

      {/* New Request Form */}
      {activeTab === 'new' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-4 shadow-sm">
          <div className="mb-2 lg:mb-3">
            <h1 className="text-2xl lg:text-lg font-bold text-slate-900">Support Request</h1>
            <p className="mt-1 lg:mt-1 text-sm lg:text-xs text-slate-600">Fill out the form below and we'll get back to you soon.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-3">
            <div>
              <label htmlFor="name" className="mb-1.5 lg:mb-1 block text-sm lg:text-xs font-semibold text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 lg:py-2 text-sm lg:text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="clinicName" className="mb-1.5 lg:mb-1 block text-sm lg:text-xs font-semibold text-slate-700">
                Clinic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="clinicName"
                name="clinicName"
                value={formData.clinicName}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 lg:py-2 text-sm lg:text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your clinic name"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 lg:mb-1 block text-sm lg:text-xs font-semibold text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 lg:py-2 text-sm lg:text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label htmlFor="contactNumber" className="mb-1.5 lg:mb-1 block text-sm lg:text-xs font-semibold text-slate-700">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 lg:py-2 text-sm lg:text-xs font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your contact number"
              />
            </div>

            <div>
              <label htmlFor="note" className="mb-1.5 lg:mb-1 block text-sm lg:text-xs font-semibold text-slate-700">
                Note/Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleChange}
                required
                rows={5}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 lg:py-2 lg:text-xs text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Describe your issue or question..."
              />
            </div>

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full rounded-lg bg-primary px-4 py-3 lg:py-2 text-sm lg:text-xs font-semibold text-white shadow-sm shadow-[rgba(0,119,194,0.2)] transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                'Submit Request'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Support Tickets List */}
      {activeTab === 'tickets' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-4 shadow-sm">
          <div className="mb-2 lg:mb-3">
            <h1 className="text-2xl lg:text-lg font-bold text-slate-900">My Support Tickets</h1>
            <p className="mt-1 lg:mt-1 text-sm lg:text-xs text-slate-600">View and track your support requests</p>
          </div>

          {loadingTickets ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IoTimeOutline className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-700">No support tickets</p>
              <p className="text-sm text-slate-500 mt-2">You haven't submitted any support requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket._id || ticket.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(ticket.status)}
                        <h3 className="text-lg font-semibold text-slate-900">{ticket.subject}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                          {ticket.status || 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{ticket.message}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Created: {formatDate(ticket.createdAt)}</span>
                        {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                          <span>Updated: {formatDate(ticket.updatedAt)}</span>
                        )}
                        {ticket.priority && (
                          <span className="capitalize">Priority: {ticket.priority}</span>
                        )}
                      </div>
                      {ticket.responses && ticket.responses.length > 0 && (
                        <div className="mt-4 rounded-lg bg-blue-50 p-3">
                          <p className="mb-2 text-xs font-semibold text-blue-900">Admin Response:</p>
                          {ticket.responses.map((response, idx) => (
                            <div key={idx} className="mb-2 text-sm text-blue-800">
                              <p>{response.message}</p>
                              <p className="mt-1 text-xs text-blue-600">
                                {formatDate(response.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Support History */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-4 shadow-sm">
          <div className="mb-2 lg:mb-3">
            <h1 className="text-2xl lg:text-lg font-bold text-slate-900">Support History</h1>
            <p className="mt-1 lg:mt-1 text-sm lg:text-xs text-slate-600">View your past support requests</p>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IoTimeOutline className="h-12 w-12 text-slate-400 mb-4" />
              <p className="text-lg font-semibold text-slate-700">No history</p>
              <p className="text-sm text-slate-500 mt-2">You don't have any past support requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item._id || item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(item.status)}
                        <h3 className="text-lg font-semibold text-slate-900">{item.subject}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                          {item.status || 'Closed'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{item.message}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Created: {formatDate(item.createdAt)}</span>
                        {item.resolvedAt && (
                          <span>Resolved: {formatDate(item.resolvedAt)}</span>
                        )}
                        {item.closedAt && (
                          <span>Closed: {formatDate(item.closedAt)}</span>
                        )}
                      </div>
                      {item.responses && item.responses.length > 0 && (
                        <div className="mt-4 rounded-lg bg-green-50 p-3">
                          <p className="mb-2 text-xs font-semibold text-green-900">Admin Response:</p>
                          {item.responses.map((response, idx) => (
                            <div key={idx} className="mb-2 text-sm text-green-800">
                              <p>{response.message}</p>
                              <p className="mt-1 text-xs text-green-600">
                                {formatDate(response.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <IoCloseOutline className="h-5 w-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <IoCheckmarkCircleOutline className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-slate-900">Request Submitted!</h2>
              <p className="mb-6 text-sm text-slate-600">
                Your support request has been sent successfully. We'll get back to you soon.
              </p>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DoctorSupport

