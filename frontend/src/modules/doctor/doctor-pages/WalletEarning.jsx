import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DoctorNavbar from '../doctor-components/DoctorNavbar'
import {
  IoArrowBackOutline,
  IoArrowDownOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoTrendingUpOutline,
  IoTrendingDownOutline,
} from 'react-icons/io5'
import { getDoctorWalletEarnings } from '../doctor-services/doctorService'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

// Default earning data (will be replaced by API data)
const defaultEarningData = {
  totalEarnings: 156420.75,
  thisMonthEarnings: 8250.00,
  lastMonthEarnings: 6890.50,
  thisYearEarnings: 156420.75,
  todayEarnings: 500.00,
  earnings: [
    {
      id: 'earn-1',
      amount: 1500.00,
      description: 'Consultation fee - Patient: John Doe',
      date: '2025-01-15T10:30:00',
      status: 'completed',
      category: 'Consultation',
    },
    {
      id: 'earn-2',
      amount: 2500.00,
      description: 'Consultation fee - Patient: Sarah Smith',
      date: '2025-01-13T09:15:00',
      status: 'completed',
      category: 'Consultation',
    },
    {
      id: 'earn-3',
      amount: 1200.00,
      description: 'Follow-up consultation - Patient: Mike Johnson',
      date: '2025-01-12T16:45:00',
      status: 'pending',
      category: 'Follow-up',
    },
    {
      id: 'earn-4',
      amount: 1800.00,
      description: 'Consultation fee - Patient: Emily Brown',
      date: '2025-01-11T11:00:00',
      status: 'completed',
      category: 'Consultation',
    },
    {
      id: 'earn-5',
      amount: 1000.00,
      description: 'In-person consultation - Patient: David Wilson',
      date: '2025-01-10T14:20:00',
      status: 'completed',
      category: 'In-Person Consultation',
    },
  ],
}

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

const WalletEarning = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [filterType, setFilterType] = useState('all') // all, today, year, month
  const [earningData, setEarningData] = useState(defaultEarningData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [pagination, setPagination] = useState(null)

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [filterType])

  // Fetch earnings from API
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = {
          page,
          limit,
          // Note: Backend supports dateFrom/dateTo for date filtering
          // filterType ('today', 'month', 'year') could be converted to date ranges in the future
        }
        const response = await getDoctorWalletEarnings(params)

        console.log('🔍 Full earnings API response:', response) // Debug log

        if (response) {
          const data = response
          console.log('✅ Earnings data received:', data) // Debug log

          // Set pagination data
          if (data.pagination) {
            setPagination(data.pagination)
          }

          // Handle both array and object with items property
          const earningsList = Array.isArray(data)
            ? data
            : (data.items || data.earnings || [])

          // Generate description from transaction data
          const getDescription = (earn) => {
            if (earn.description) return earn.description
            if (earn.notes) return earn.notes
            if (earn.appointmentId) {
              const appointment = earn.appointmentId
              if (appointment && typeof appointment === 'object') {
                return `Consultation fee - Appointment on ${new Date(appointment.appointmentDate || earn.createdAt).toLocaleDateString()}`
              }
              return 'Consultation fee'
            }
            if (earn.orderId) {
              return `Order payment - Order #${earn.orderId._id || earn.orderId}`
            }
            return 'Earning'
          }

          // Get category from transaction
          const getCategory = (earn) => {
            if (earn.category) return earn.category
            if (earn.appointmentId) return 'Consultation'
            if (earn.orderId) return 'Order Payment'
            return 'Earning'
          }

          setEarningData({
            totalEarnings: Number(data.totalEarnings || 0),
            thisMonthEarnings: Number(data.thisMonthEarnings || 0),
            lastMonthEarnings: Number(data.lastMonthEarnings || 0),
            thisYearEarnings: Number(data.thisYearEarnings || 0),
            todayEarnings: Number(data.todayEarnings || 0),
            earnings: earningsList.map(earn => ({
              id: earn._id || earn.id,
              amount: Number(earn.amount || 0),
              description: getDescription(earn),
              date: earn.createdAt || earn.date || new Date().toISOString(),
              status: earn.status || 'completed',
              category: getCategory(earn),
            })),
          })

          console.log('💰 Setting earnings data:', {
            totalEarnings: Number(data.totalEarnings || 0),
            earningsCount: earningsList.length,
          }) // Debug log
        } else {
          console.error('❌ Earnings API response error:', response) // Debug log
        }
      } catch (err) {
        console.error('Error fetching earnings:', err)
        setError(err.message || 'Failed to load earnings')
        toast.error('Failed to load earnings')
      } finally {
        setLoading(false)
      }
    }

    fetchEarnings()
  }, [toast, page, limit, filterType])

  const earningsChange = earningData.lastMonthEarnings > 0
    ? ((earningData.thisMonthEarnings - earningData.lastMonthEarnings) / earningData.lastMonthEarnings) * 100
    : 0

  // Note: filterType ('today', 'month', 'year') is not currently implemented
  // The earnings data already includes totals for today, month, year from backend
  // For now, we show all earnings and pagination works on all data
  const filteredEarnings = earningData.earnings

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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Earnings</h1>
            <p className="mt-1 text-sm text-slate-600">View your earnings and income details</p>
          </div>
        </div>

        {/* Main Earnings Card - Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-100/60 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-600 p-6 sm:p-8 text-white shadow-2xl shadow-emerald-500/30">
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-white/80 mb-1">Total Earnings</p>
                <p className="text-4xl sm:text-5xl font-bold tracking-tight">{loading ? '...' : formatCurrency(earningData.totalEarnings)}</p>
              </div>
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
                <IoArrowDownOutline className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Breakdown Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Today Earnings */}
          <div className="group relative overflow-hidden rounded-2xl border border-[rgba(0,119,194,0.2)] bg-gradient-to-br from-[rgba(0,119,194,0.05)] via-white to-[rgba(0,119,194,0.05)] p-6 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-[rgba(0,119,194,0.1)] blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(0,119,194,0.1)]">
                  <IoCalendarOutline className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Today</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{loading ? '...' : formatCurrency(earningData.todayEarnings)}</p>
            </div>
          </div>

          {/* Month Earnings */}
          <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-100/50 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <IoTrendingUpOutline className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">This Month</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{loading ? '...' : formatCurrency(earningData.thisMonthEarnings)}</p>
              <div className="mt-4 flex items-center gap-2 text-xs">
                {earningsChange >= 0 ? (
                  <>
                    <IoTrendingUpOutline className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">+{earningsChange.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <IoTrendingDownOutline className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-red-600 font-semibold">{earningsChange.toFixed(1)}%</span>
                  </>
                )}
                <span className="text-slate-500">vs last month</span>
              </div>
            </div>
          </div>

          {/* Year Earnings */}
          <div className="group relative overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-purple-50/30 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-purple-100/50 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                  <IoCalendarOutline className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">This Year</p>
              </div>
              <p className="text-3xl font-bold text-slate-900">{loading ? '...' : formatCurrency(earningData.thisYearEarnings)}</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch]">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${filterType === 'all'
                ? 'text-white shadow-sm'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200'
              }`}
            style={filterType === 'all' ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 1px 2px 0 var(--color-primary-border)' } : {}}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterType('today')}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${filterType === 'today'
                ? 'text-white shadow-sm'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200'
              }`}
            style={filterType === 'today' ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 1px 2px 0 var(--color-primary-border)' } : {}}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFilterType('year')}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${filterType === 'year'
                ? 'text-white shadow-sm'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200'
              }`}
            style={filterType === 'year' ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 1px 2px 0 var(--color-primary-border)' } : {}}
          >
            Year
          </button>
          <button
            type="button"
            onClick={() => setFilterType('month')}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${filterType === 'month'
                ? 'text-white shadow-sm'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50 border border-slate-200'
              }`}
            style={filterType === 'month' ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 1px 2px 0 var(--color-primary-border)' } : {}}
          >
            Month
          </button>
        </div>

        {/* Earnings List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Earning History</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {pagination?.total || filteredEarnings.length} {(pagination?.total || filteredEarnings.length) === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>
          <div className="space-y-3">
            {filteredEarnings.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <IoArrowDownOutline className="mx-auto h-16 w-16 text-slate-300" />
                <p className="mt-4 text-base font-semibold text-slate-600">No earnings found</p>
                <p className="mt-1 text-sm text-slate-500">Your earnings will appear here</p>
              </div>
            ) : (
              filteredEarnings.map((earning) => (
                <article
                  key={earning.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm">
                      <IoArrowDownOutline className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {earning.description}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium border border-slate-200">
                              {earning.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <IoCalendarOutline className="h-3.5 w-3.5" />
                              {formatDateTime(earning.date)}
                            </span>
                          </div>
                          <div className="mt-2.5">
                            {earning.status === 'pending' && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                                <IoTimeOutline className="h-3.5 w-3.5" />
                                Processing
                              </div>
                            )}
                            {earning.status === 'completed' && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                                <IoCheckmarkCircleOutline className="h-3.5 w-3.5" />
                                Completed
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end">
                          <p className="text-xl font-bold text-emerald-600">
                            +{formatCurrency(earning.amount)}
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

export default WalletEarning

