import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DoctorNavbar from '../doctor-components/DoctorNavbar'
import {
  IoArrowBackOutline,
  IoReceiptOutline,
  IoArrowDownOutline,
  IoArrowUpOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoFilterOutline,
} from 'react-icons/io5'
import { getDoctorWalletTransactions } from '../doctor-services/doctorService'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

// Default transactions (will be replaced by API data)
const defaultTransactions = []

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

const formatDateTime = (dateString) => {
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

const WalletTransaction = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [filterType, setFilterType] = useState('all') // all, earnings, withdrawals
  const [transactions, setTransactions] = useState(defaultTransactions)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [pagination, setPagination] = useState(null)

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [filterType])

  // Fetch transactions from API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = {
          page,
          limit,
          ...(filterType !== 'all' && { type: filterType === 'earnings' ? 'earning' : filterType }),
        }
        const response = await getDoctorWalletTransactions(params)

        console.log('🔍 Full transactions API response:', response) // Debug log

        if (response) {
          const data = response
          console.log('✅ Transactions data received:', data) // Debug log

          // Set pagination data
          if (data.pagination) {
            setPagination(data.pagination)
          }

          // Handle both array and object with items property
          const transactionsData = Array.isArray(data)
            ? data
            : (data.items || data.transactions || [])

          console.log('📊 Transactions list:', {
            count: transactionsData.length,
            firstTransaction: transactionsData[0],
          }) // Debug log

          const transformed = transactionsData.map(txn => ({
            id: txn._id || txn.id,
            type: txn.type || 'earning',
            amount: Number(txn.amount || 0),
            description: txn.description || txn.notes || 'Transaction',
            date: txn.createdAt || txn.date || new Date().toISOString(),
            status: txn.status || 'completed',
            category: txn.category || 'Transaction',
            originalData: txn,
          }))

          console.log('💰 Setting transactions:', {
            count: transformed.length,
            types: transformed.map(t => t.type),
          }) // Debug log

          setTransactions(transformed)
        } else {
          console.error('❌ Transactions API response error:', response) // Debug log
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
  }, [toast, page, limit, filterType])

  const location = useLocation()
  const isDashboardPage = location.pathname === '/doctor/dashboard' || location.pathname === '/doctor/'

  return (
    <>
      <DoctorNavbar />
      <section className={`flex flex-col gap-6 pb-24 ${isDashboardPage ? '-mt-20' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/doctor/wallet')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-95"
          >
            <IoArrowBackOutline className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Transactions</h1>
            <p className="mt-1 text-sm text-slate-600">View all your transaction history</p>
          </div>
        </div>

        {/* Main Transaction Card - Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-purple-100/60 bg-gradient-to-br from-purple-600 via-purple-500 to-purple-600 p-6 sm:p-8 text-white shadow-2xl shadow-purple-500/30">
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-white/80 mb-1">Total Transactions</p>
                <p className="text-4xl sm:text-5xl font-bold tracking-tight">{loading ? '...' : transactions.length}</p>
              </div>
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
                <IoReceiptOutline className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch]">
          <IoFilterOutline className="h-5 w-5 shrink-0 text-slate-500" />
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${filterType === 'all'
                ? 'bg-purple-500 text-white shadow-sm shadow-purple-400/40'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200'
              }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterType('earnings')}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${filterType === 'earnings'
                ? 'bg-purple-500 text-white shadow-sm shadow-purple-400/40'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200'
              }`}
          >
            Earnings
          </button>
          <button
            type="button"
            onClick={() => setFilterType('withdrawals')}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${filterType === 'withdrawals'
                ? 'bg-purple-500 text-white shadow-sm shadow-purple-400/40'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200'
              }`}
          >
            Withdrawals
          </button>
        </div>

        {/* Transactions List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Transaction History</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {pagination?.total || transactions.length} {(pagination?.total || transactions.length) === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <IoReceiptOutline className="mx-auto h-16 w-16 text-slate-300" />
                <p className="mt-4 text-base font-semibold text-slate-600">No transactions found</p>
                <p className="mt-1 text-sm text-slate-500">Your transaction history will appear here</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${transaction.type === 'earning'
                          ? 'bg-emerald-50 border border-emerald-100'
                          : 'bg-amber-50 border border-amber-100'
                        }`}
                    >
                      {transaction.type === 'earning' ? (
                        <IoArrowDownOutline className="h-6 w-6 text-emerald-600" />
                      ) : (
                        <IoArrowUpOutline className="h-6 w-6 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {transaction.description}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium border border-slate-200">
                              {transaction.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <IoCalendarOutline className="h-3.5 w-3.5" />
                              {formatDateTime(transaction.date)}
                            </span>
                          </div>
                          <div className="mt-2.5">
                            {transaction.status === 'pending' && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                                <IoTimeOutline className="h-3.5 w-3.5" />
                                Processing
                              </div>
                            )}
                            {transaction.status === 'completed' && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                                <IoCheckmarkCircleOutline className="h-3.5 w-3.5" />
                                Completed
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end">
                          <p
                            className={`text-xl font-bold ${transaction.type === 'earning' ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                          >
                            {transaction.type === 'earning' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={pagination.page || page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit || limit}
                onPageChange={(newPage) => {
                  setPage(newPage)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                loading={loading}
              />
            </div>
          )}
        </section>
      </section>
    </>
  )
}

export default WalletTransaction

