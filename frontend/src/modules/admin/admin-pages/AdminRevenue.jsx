import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRevenueOverview } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'
import {
  IoWalletOutline,
  IoCashOutline,
  IoReceiptOutline,
  IoMedicalOutline,
  IoReloadOutline,
} from 'react-icons/io5'

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

// Pie Chart Component
const PieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-slate-400">No data available</p>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-slate-400">No data available</p>
      </div>
    )
  }

  let currentAngle = -90 // Start from top

  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100
    const angle = (item.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    // Calculate path for pie slice
    const radius = 80
    const centerX = 100
    const centerY = 100

    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180

    const x1 = centerX + radius * Math.cos(startAngleRad)
    const y1 = centerY + radius * Math.sin(startAngleRad)
    const x2 = centerX + radius * Math.cos(endAngleRad)
    const y2 = centerY + radius * Math.sin(endAngleRad)

    const largeArcFlag = angle > 180 ? 1 : 0

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ')

    return {
      path: pathData,
      color: item.color,
      percentage: percentage.toFixed(1),
      name: item.name,
    }
  })

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 200" className="w-full max-w-[200px] h-auto">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={segment.path}
            fill={segment.color}
            stroke="#fff"
            strokeWidth="2"
            className="hover:opacity-80 transition-opacity"
          />
        ))}
      </svg>
      <div className="mt-4 space-y-2 w-full">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-700">{item.name}</span>
            </div>
            <span className="font-semibold text-slate-900">
              {segments[index].percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Line Chart Component
const LineChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-slate-400">No data available</p>
      </div>
    )
  }

  const values = data.map((d) => d.revenue || 0)
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  const range = maxValue - minValue || 1

  const width = 100
  const height = 80
  const padding = 10
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * chartWidth
    const y =
      padding +
      chartHeight -
      ((item.revenue - minValue) / range) * chartHeight
    return { x, y, month: item.month, value: item.revenue }
  })

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  const areaPath = [
    `M ${points[0].x} ${padding + chartHeight}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${padding + chartHeight}`,
    'Z',
  ].join(' ')

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
        <defs>
          <linearGradient id="revenueLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0077C2" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0077C2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill="url(#revenueLineGradient)"
        />
        <path
          d={pathData}
          fill="none"
          stroke="#0077C2"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#0077C2"
            className="hover:r-4 transition-all"
          />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
        {points.map((point, index) => (
          <span key={index} className="text-[10px]">
            {point.month}
          </span>
        ))}
      </div>
    </div>
  )
}

const AdminRevenue = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [loading, setLoading] = useState(true)

  const formatText = (value) => {
    if (!value) return '—'
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.filter(Boolean).join(', ')
    if (typeof value === 'object') {
      const addr = [value.line1, value.line2, value.city, value.state, value.postalCode || value.pincode, value.country]
      const joined = addr.filter(Boolean).join(', ')
      if (joined) return joined
    }
    return String(value)
  }

  // Empty data structure - will be populated from backend
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    totalGBV: 0,
    totalPayouts: 0,
    transactionsCount: 0,
    revenueBreakdown: {
      doctor: {
        gbv: 0,
        commission: 0,
        payout: 0,
        appointments: 0,
      },
    },
    pieChartData: [],
    monthlyRevenue: [],
    transactions: [],
  })

  // Fetch revenue data
  const fetchRevenueData = useCallback(async (period) => {
    try {
      setLoading(true)
      const response = await getRevenueOverview(period)
      if (response && response.success) {
        const data = response.data

        // Format pie chart data
        const pieChartData = [
          {
            name: 'Doctors',
            value: data.pieChartData?.[0]?.value || 0,
            amount: data.pieChartData?.[0]?.amount || 0,
            color: '#0077C2',
          },
        ]

        // Format transactions with date
        const formattedTransactions = (data.transactions || []).map((txn) => ({
          ...txn,
          date: new Date(txn.date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
        }))

        setRevenueData({
          totalRevenue: data.totalRevenue || 0,
          totalGBV: data.totalGBV || 0,
          totalPayouts: data.totalPayouts || 0,
          transactionsCount: data.transactionsCount || 0,
          revenueBreakdown: {
            doctor: data.revenueBreakdown?.doctor || {
              gbv: 0,
              commission: 0,
              payout: 0,
              appointments: 0,
            },
          },
          pieChartData,
          monthlyRevenue: data.monthlyRevenue || [],
          transactions: formattedTransactions,
        })
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      toast.error('Failed to fetch revenue data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Fetch data on mount and period change
  useEffect(() => {
    fetchRevenueData(selectedPeriod)
  }, [selectedPeriod, fetchRevenueData])

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period)
  }

  return (
    <section className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Revenue Overview</h1>
        <p className="text-sm text-slate-600">Complete revenue analytics and breakdown</p>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap flex-1">
          {['all', 'today', 'week', 'month', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              disabled={loading}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${selectedPeriod === period
                ? 'bg-primary text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-primary animate-pulse">
            <IoReloadOutline className="h-4 w-4 animate-spin" />
            <span className="text-xs font-medium">Refreshing...</span>
          </div>
        )}
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Revenue Card */}
        <div className="rounded-xl border border-primary-border bg-linear-to-br from-primary-surface to-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <IoWalletOutline className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">
            Total Revenue
          </p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">
            {loading ? '...' : formatCurrency(revenueData.totalRevenue)}
          </p>
          <p className="text-[10px] text-slate-600 mt-1">Platform fees only</p>
        </div>

        {/* Gross Booking Value Card */}
        <div className="rounded-xl border border-blue-100 bg-linear-to-br from-blue-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <IoReceiptOutline className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 mb-1">
            Gross Booking Value
          </p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">
            {loading ? '...' : formatCurrency(revenueData.totalGBV)}
          </p>
          <p className="text-[10px] text-slate-600 mt-1">Total patient payment</p>
        </div>

        {/* Total Payouts Card */}
        <div className="rounded-xl border border-blue-100 bg-linear-to-br from-blue-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <IoCashOutline className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 mb-1">
            Total Payouts
          </p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">
            {loading ? '...' : formatCurrency(revenueData.totalPayouts)}
          </p>
          <p className="text-[10px] text-slate-600 mt-1">Provider payouts</p>
        </div>

        {/* Transactions Count Card */}
        <div className="rounded-xl border border-blue-200 bg-linear-to-br from-blue-100/50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <IoReceiptOutline className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-800 mb-1">
            Transactions
          </p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">
            {revenueData.transactionsCount}
          </p>
          <p className="text-[10px] text-slate-600 mt-1">Total count</p>
        </div>
      </div>

      {/* Revenue Breakdown Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
          Revenue Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Doctor Revenue */}
          <div
            onClick={() => navigate('/admin/revenue/doctor')}
            className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                <IoMedicalOutline className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Doctor Revenue</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">GBV:</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(revenueData.revenueBreakdown.doctor.gbv)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Platform Fees:</span>
                <span className="text-sm font-bold text-emerald-600">
                  {formatCurrency(revenueData.revenueBreakdown.doctor.commission)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600">Payout:</span>
                <span className="text-sm font-bold text-blue-600">
                  {formatCurrency(revenueData.revenueBreakdown.doctor.payout)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <span className="text-xs text-slate-600">Appointments:</span>
                <span className="text-sm font-semibold text-slate-900">
                  {revenueData.revenueBreakdown.doctor.appointments}
                </span>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pie Chart - Revenue Contribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
            Revenue Contribution
          </h2>
          <PieChart data={revenueData.pieChartData} />
        </div>

        {/* Line Chart - Revenue Over Time */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
            Revenue Over Time
          </h2>
          <LineChart data={revenueData.monthlyRevenue} />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">
          Transactions
        </h2>
        {revenueData.transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <IoReceiptOutline className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No transactions found</p>
            <p className="mt-1 text-xs text-slate-500">
              No transactions available for {selectedPeriod} period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-700 uppercase">
                    Type
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-700 uppercase">
                    Provider
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-700 uppercase">
                    Patient
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-slate-700 uppercase">
                    GBV
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-slate-700 uppercase">
                    Platform Fee
                  </th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-slate-700 uppercase">
                    Payout
                  </th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-700 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenueData.transactions.map((transaction, index) => (
                  <tr
                    key={transaction.id || index}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index === revenueData.transactions.length - 1 ? 'border-b-0' : ''
                      }`}
                  >
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${transaction.type === 'Doctor'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                          }`}
                      >
                        {transaction.type === 'Doctor' ? (
                          <IoMedicalOutline className="h-3 w-3" />
                        ) : (
                          <IoFlaskOutline className="h-3 w-3" />
                        )}
                        {transaction.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-700">
                      {formatText(transaction.provider)}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-700">
                      {formatText(transaction.patient)}
                    </td>
                    <td className="py-3 px-2 text-sm font-semibold text-slate-900 text-right">
                      {formatCurrency(transaction.gbv)}
                    </td>
                    <td className="py-3 px-2 text-sm font-semibold text-emerald-600 text-right">
                      {formatCurrency(transaction.commission)}
                    </td>
                    <td className="py-3 px-2 text-sm font-semibold text-blue-600 text-right">
                      {formatCurrency(transaction.payout)}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-600">
                      {transaction.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminRevenue
