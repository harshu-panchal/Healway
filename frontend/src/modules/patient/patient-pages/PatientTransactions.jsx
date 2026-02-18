import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoReceiptOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoTimeOutline,
  IoCalendarOutline,
  IoPeopleOutline,
  IoWalletOutline,
  IoArrowUpOutline,
  IoArrowDownOutline,
} from 'react-icons/io5'
import { getPatientTransactions } from '../patient-services/patientService'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

// Default transactions (will be replaced by API data)
const defaultTransactions = []

const PatientTransactions = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [filter, setFilter] = useState('all')
  const [transactions, setTransactions] = useState(defaultTransactions)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getPatientTransactions()

        // Handle both full response and direct data
        let transactionsData = []
        if (response && response.success && response.data) {
          transactionsData = Array.isArray(response.data) ? response.data : (response.data.items || response.data.transactions || [])
        } else if (response) {
          transactionsData = Array.isArray(response) ? response : (response.items || response.transactions || [])
        }

        if (transactionsData.length > 0 || Array.isArray(transactionsData)) {

          // Transform API data to match component structure
          const transformed = transactionsData.map(txn => {
            // Extract provider name based on category
            let providerName = 'Provider'
            let category = txn.category || 'appointment'

            if (txn.category === 'appointment' && txn.appointmentId) {
              // For appointments, get doctor name
              const doctor = txn.appointmentId.doctorId
              if (doctor) {
                if (doctor.firstName && doctor.lastName) {
                  providerName = `Dr. ${doctor.firstName} ${doctor.lastName}`
                } else if (doctor.name) {
                  providerName = doctor.name
                } else {
                  providerName = 'Doctor'
                }
                category = 'appointment'
              }
            }

            // Extract service/description
            let serviceName = txn.description || ''
            if (txn.category === 'appointment' && txn.appointmentId) {
              const doctor = txn.appointmentId.doctorId
              if (doctor && doctor.specialization) {
                serviceName = `Appointment with ${providerName} - ${doctor.specialization}`
              } else {
                serviceName = `Appointment payment for appointment`
              }
            }

            return {
              id: txn._id || txn.id,
              _id: txn._id || txn.id,
              type: txn.type || txn.transactionType || 'payment',
              category: category,
              providerName: providerName,
              serviceName: serviceName,
              amount: txn.amount || 0,
              status: txn.status || 'completed',
              date: txn.createdAt ? new Date(txn.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              time: txn.createdAt ? new Date(txn.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
              transactionId: txn.transactionId || txn._id || txn.id,
              paymentMethod: txn.paymentMethod || 'razorpay',
              queueNumber: txn.queueNumber || null,
              originalData: txn,
            }
          })

          setTransactions(transformed)
        }
      } catch (err) {
        console.error('Error fetching transactions:', err)
        setError(err.message || 'Failed to load transactions')
        toast.error('Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()

    // Listen for appointment booking event to refresh transactions
    const handleAppointmentBooked = () => {
      fetchTransactions()
    }
    window.addEventListener('appointmentBooked', handleAppointmentBooked)

    return () => {
      window.removeEventListener('appointmentBooked', handleAppointmentBooked)
    }
  }, [toast])

  // Legacy localStorage loading removed - using API now

  // Filter out pending transactions (they should show in requests page)
  const completedTransactions = transactions.filter(txn => txn.status !== 'pending' && txn.status !== 'accepted')

  const filteredTransactions = filter === 'all'
    ? completedTransactions
    : completedTransactions.filter(txn => txn.status === filter)

  // Calculate paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredTransactions.slice(startIndex, endIndex)
  }, [filteredTransactions, currentPage])

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const totalItems = filteredTransactions.length

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  // Show loading state
  if (loading) {
    return (
      <section className="flex flex-col gap-4 pb-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-semibold text-slate-700">Loading transactions...</p>
        </div>
      </section>
    )
  }

  // Show error state
  if (error) {
    return (
      <section className="flex flex-col gap-4 pb-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg font-semibold text-red-700">Error loading transactions</p>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
        </div>
      </section>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'confirmed':
      case 'paid':
        return 'bg-emerald-100 text-emerald-700'
      case 'pending':
      case 'accepted':
        return 'bg-amber-100 text-amber-700'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'confirmed':
      case 'paid':
        return <IoCheckmarkCircleOutline className="h-3.5 w-3.5" />
      case 'pending':
      case 'accepted':
        return <IoTimeOutline className="h-3.5 w-3.5" />
      case 'failed':
      case 'cancelled':
        return <IoCloseCircleOutline className="h-3.5 w-3.5" />
      default:
        return null
    }
  }

  const getTypeBgColor = (type) => {
    return type === 'refund' ? 'bg-emerald-100' : 'bg-purple-100'
  }

  const getTypeIcon = (type) => {
    return type === 'refund'
      ? <IoArrowDownOutline className="h-6 w-6 text-emerald-600" />
      : <IoArrowUpOutline className="h-6 w-6 text-purple-600" />
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return dateString
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch (error) {
      return dateString
    }
  }

  const formatDateTime = (dateString, timeString) => {
    try {
      if (dateString && timeString && timeString !== 'N/A') {
        return `${formatDate(dateString)}, ${timeString}`
      }
      return formatDate(dateString)
    } catch (error) {
      return dateString
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <section className="flex flex-col gap-4 pb-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'completed', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${filter === status
              ? 'text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            style={filter === status ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 1px 2px 0 var(--color-primary-border)' } : {}}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {paginatedTransactions.map((transaction) => (
          <article
            key={transaction.id}
            onClick={() => navigate(`/patient/transactions/${transaction.id}`)}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${getTypeBgColor(transaction.type)}`}>
                {getTypeIcon(transaction.type)}
              </div>

              {/* Main Content with Amount on Right */}
              <div className="flex-1 flex items-start justify-between gap-3 min-w-0">
                {/* Left Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Provider Name and Amount Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900 truncate">{transaction.providerName}</p>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 capitalize shrink-0">{transaction.category}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <p className={`text-lg font-bold whitespace-nowrap ${transaction.type === 'refund' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {transaction.type === 'refund' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs text-slate-600">
                      {transaction.type === 'refund'
                        ? (transaction.category === 'appointment' ? 'Appointment Refund' : 'Wallet Refund')
                        : (transaction.category === 'appointment' ? 'Appointment Payment' : 'Service Payment')
                      }
                    </p>
                    {transaction.serviceName && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{transaction.serviceName}</p>
                    )}
                  </div>

                  {/* Status Badge and Type Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(transaction.status)}`}>
                      {getStatusIcon(transaction.status)}
                      <span className="capitalize">{transaction.status === 'paid' ? 'completed' : transaction.status === 'accepted' ? 'pending' : transaction.status}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {transaction.type}
                    </span>
                  </div>

                  {/* Date, Time and View Link */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 mt-1">
                    <span className="text-[10px] text-slate-500">{formatDateTime(transaction.date, transaction.time)}</span>
                    <span className="text-[10px] font-bold text-primary group-hover:underline">View Receipt →</span>
                  </div>

                  {/* Transaction ID and Order ID */}
                  <div className="space-y-0.5 pt-0.5">
                    <p className="text-xs text-slate-400">Transaction ID: {transaction.transactionId}</p>
                    {transaction.requestId && (
                      <p className="text-xs text-slate-400">Order: {transaction.requestId}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
            <IoReceiptOutline className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-slate-700">No transactions found</p>
          <p className="text-sm text-slate-500">Try selecting a different filter</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredTransactions.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      )}
    </section>
  )
}

export default PatientTransactions
