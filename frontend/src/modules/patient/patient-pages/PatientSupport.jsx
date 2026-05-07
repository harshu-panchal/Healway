import { useState, useEffect } from 'react'
import { IoCloseOutline, IoCheckmarkCircleOutline, IoTimeOutline, IoCheckmarkCircle, IoCloseCircle, IoHourglassOutline } from 'react-icons/io5'
import { createSupportTicket, getSupportTickets } from '../patient-services/patientService'
import { useToast } from '../../../contexts/ToastContext'

const PatientSupport = () => {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('new') // 'new', 'tickets'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    note: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Sanitize phone number
    if (name === 'contactNumber') {
      const sanitized = value.replace(/\D/g, '').slice(0, 10)
      setFormData((prev) => ({
        ...prev,
        [name]: sanitized,
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    if (formData.contactNumber.length !== 10) {
      toast.warning('Contact number must be exactly 10 digits')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await createSupportTicket({
        subject: `Support Request from ${formData.name}`,
        message: formData.note,
        priority: 'medium',
      })

      if (response.success) {
        toast.success('Support request submitted successfully')
        setShowSuccessModal(true)
        setFormData({
          name: '',
          email: '',
          contactNumber: '',
          note: '',
        })
        // Refresh tickets list if on tickets tab
        if (activeTab === 'tickets') {
          const refreshResponse = await getSupportTickets()
          if (refreshResponse.success && refreshResponse.data) {
            const ticketsData = refreshResponse.data.items || refreshResponse.data || []
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
        console.log('📋 Fetching support tickets...')
        const response = await getSupportTickets()
        console.log('📋 Support tickets response:', response)
        
        if (response.success && response.data) {
          // Backend returns { items: [...], pagination: {...} }
          const ticketsData = response.data.items || response.data || []
          console.log('✅ Processed tickets:', ticketsData)
          setTickets(ticketsData)
        } else {
          console.warn('⚠️ Invalid response format:', response)
          setTickets([])
        }
      } catch (error) {
        console.error('❌ Error fetching support tickets:', error)
        setTickets([])
      } finally {
        setLoadingTickets(false)
      }
    }

    if (activeTab === 'tickets') {
      fetchTickets()
    }
  }, [activeTab])

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'resolved':
      case 'closed':
        return <IoCheckmarkCircle className="h-5 w-5 text-green-600" />
      case 'open':
      case 'pending':
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

  const isFormValid = formData.name && formData.email && formData.contactNumber && formData.note

  return (
    <div className="mx-auto max-w-2xl py-6">
      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'new'
              ? 'border-b-2 border-primary text-primary'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          New Request
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`relative px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'tickets'
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
      </div>

      {/* New Request Form */}
      {activeTab === 'new' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Support Request</h1>
            <p className="mt-2 text-sm text-slate-600">Fill out the form below and we'll get back to you soon.</p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter your email address"
            />
          </div>

          <div>
            <label htmlFor="contactNumber" className="mb-2 block text-sm font-semibold text-slate-700">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              pattern="[0-9]{10}"
              maxLength="10"
              title="Contact number should be 10 digits"
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter your contact number"
            />
          </div>

          <div>
            <label htmlFor="note" className="mb-2 block text-sm font-semibold text-slate-700">
              Note/Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleChange}
              required
              rows={5}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Describe your issue or question..."
            />
          </div>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-[rgba(0,119,194,0.2)] transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* My Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {loadingTickets ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mb-4 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
              <p className="text-sm text-slate-600">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-600">No tickets found</p>
              <p className="mt-1 text-xs text-slate-500">You haven't created any support tickets yet</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket._id || ticket.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      {getStatusIcon(ticket.status)}
                      <h3 className="text-lg font-bold text-slate-900">{ticket.subject || 'Support Request'}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                        {ticket.status === 'open' ? 'Pending' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-slate-600">{ticket.message}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <IoTimeOutline className="h-4 w-4" />
                        <span>Created: {formatDate(ticket.createdAt)}</span>
                      </div>
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
            ))
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
                onClick={() => {
                  setShowSuccessModal(false)
                  setActiveTab('tickets')
                }}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
              >
                View My Tickets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PatientSupport

