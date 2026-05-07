import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProviderRevenue } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'
import {
  IoArrowBackOutline,
  IoMedicalOutline,
  IoBusinessOutline,
  IoSearchOutline,
} from 'react-icons/io5'


const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const getProviderConfig = (type) => {
  switch (type) {
    case 'doctor':
      return {
        title: 'Doctor Revenue Details',
        icon: IoMedicalOutline,
        color: 'primary',
        bgColor: 'bg-primary-surface',
        borderColor: 'border-primary-border',
        iconBg: 'bg-primary',
        textColor: 'text-primary',
        label: 'Appointments',
      }
    default:
      return {
        title: 'Provider Revenue Details',
        icon: IoMedicalOutline,
        color: 'primary',
        bgColor: 'bg-primary-surface',
        borderColor: 'border-primary-border',
        iconBg: 'bg-primary',
        textColor: 'text-primary',
        label: 'Count',
      }
  }
}

const AdminProviderRevenue = () => {
  const navigate = useNavigate()
  const { type } = useParams()
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({
    gbv: 0,
    commission: 0,
    payout: 0,
    count: 0,
    transactions: 0,
  })

  const config = getProviderConfig(type)
  const Icon = config.icon

  // Fetch providers data from backend
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true)
        const response = await getProviderRevenue(type, 'all')
        if (response && response.success) {
          const data = response.data
          setProviders(data.providers || [])
          setTotals({
            gbv: data.totals?.totalGBV || 0,
            commission: data.totals?.totalCommission || 0,
            payout: data.totals?.totalPayout || 0,
            count: data.totals?.totalAppointments || 0,
            transactions: data.totals?.totalTransactions || 0,
          })
        }
      } catch (error) {
        console.error('Error fetching provider revenue:', error)
        toast.error('Failed to fetch provider revenue data')
      } finally {
        setLoading(false)
      }
    }
    fetchProviders()
  }, [type])

  // Filter providers based on search
  const filteredProviders = providers.filter((provider) =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (provider.specialty && provider.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <section className="flex flex-col gap-4 pb-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/admin/revenue')}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:scale-95"
          aria-label="Go back"
        >
          <IoArrowBackOutline className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{config.title}</h1>
          <p className="text-sm text-slate-600">View revenue breakdown for all {type === 'doctor' ? 'doctors' : 'providers'}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-3 sm:p-4`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 mb-1">
            Total GBV
          </p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">
            {formatCurrency(totals.gbv)}
          </p>
        </div>
        <div className="rounded-xl border border-primary-border bg-primary-surface p-3 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-dark mb-1">
            Platform Fees
          </p>
          <p className="text-lg sm:text-xl font-bold text-primary">
            {formatCurrency(totals.commission)}
          </p>
        </div>
        <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-3 sm:p-4`}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 mb-1">
            Total Payout
          </p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">
            {formatCurrency(totals.payout)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            {config.label}
          </p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{totals.count}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Transactions
          </p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{totals.transactions}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <IoSearchOutline className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          placeholder={`Search ${type === 'doctor' ? 'doctors' : 'providers'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Providers List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-sm text-slate-600">Loading providers...</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <Icon className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No {type === 'doctor' ? 'doctors' : 'providers'} found</p>
            <p className="mt-1 text-xs text-slate-500">
              {searchTerm
                ? 'No providers match your search criteria.'
                : `No ${type === 'doctor' ? 'doctors' : 'providers'} available.`}
            </p>
          </div>
        ) : (
          filteredProviders.map((provider) => (
            <div
              key={provider.id}
              className={`rounded-xl border ${config.borderColor} bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-all`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Provider Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl ${config.iconBg} text-white shrink-0`}>
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">
                      {provider.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mb-1">{provider.email}</p>
                    {provider.specialty && (
                      <p className="text-xs text-slate-500">{provider.specialty}</p>
                    )}
                  </div>
                </div>

                {/* Revenue Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 flex-1 sm:flex-none sm:w-auto">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      GBV
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900">
                      {formatCurrency(provider.gbv)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary-border bg-primary-surface p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-dark mb-1">
                      Platform Fee
                    </p>
                    <p className="text-sm sm:text-base font-bold text-primary">
                      {formatCurrency(provider.commission)}
                    </p>
                  </div>
                  <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-3`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 mb-1">
                      Payout
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900">
                      {formatCurrency(provider.payout)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      {config.label}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900">
                      {provider.appointments || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                      Transactions
                    </p>
                    <p className="text-sm sm:text-base font-bold text-slate-900">
                      {provider.transactions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default AdminProviderRevenue

