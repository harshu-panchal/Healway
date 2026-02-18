import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import DoctorNavbar from '../doctor-components/DoctorNavbar'
import {
  IoWalletOutline,
  IoArrowDownOutline,
  IoArrowUpOutline,
  IoCashOutline,
  IoReceiptOutline,
  IoArrowForwardOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5'
import { getDoctorWalletBalance } from '../doctor-services/doctorService'
import { useToast } from '../../../contexts/ToastContext'

// Default wallet data (will be replaced by API data)
const defaultWalletData = {
  totalBalance: 0,
  availableBalance: 0,
  pendingBalance: 0,
  thisMonthEarnings: 0,
  lastMonthEarnings: 0,
  totalEarnings: 0,
  totalWithdrawals: 0,
  totalTransactions: 0,
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

const DoctorWallet = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const isDashboardPage = location.pathname === '/doctor/dashboard' || location.pathname === '/doctor/'
  const [walletData, setWalletData] = useState(defaultWalletData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch wallet data from API
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getDoctorWalletBalance()

        console.log('🔍 Full wallet API response:', response) // Debug log

        if (response) {
          const data = response
          console.log('✅ Doctor wallet data received:', data) // Debug log

          const walletDataUpdate = {
            totalBalance: Number(data.totalBalance || data.balance || 0),
            availableBalance: Number(data.availableBalance || data.available || 0),
            pendingBalance: Number(data.pendingBalance || data.pending || data.pendingWithdrawals || 0),
            thisMonthEarnings: Number(data.thisMonthEarnings || 0),
            lastMonthEarnings: Number(data.lastMonthEarnings || 0),
            totalEarnings: Number(data.totalEarnings || 0),
            totalWithdrawals: Number(data.totalWithdrawals || 0),
            totalTransactions: Number(data.totalTransactions || 0),
          }

          console.log('💰 Setting wallet data:', walletDataUpdate) // Debug log
          setWalletData(walletDataUpdate)
        } else {
          console.error('❌ Wallet API response is empty')
        }
      } catch (err) {
        console.error('Error fetching wallet data:', err)
        setError(err.message || 'Failed to load wallet data')
        toast.error('Failed to load wallet data')
      } finally {
        setLoading(false)
      }
    }

    fetchWalletData()

    // Listen for appointment booking event to refresh wallet
    const handleAppointmentBooked = () => {
      fetchWalletData()
    }
    window.addEventListener('appointmentBooked', handleAppointmentBooked)

    return () => {
      window.removeEventListener('appointmentBooked', handleAppointmentBooked)
    }
  }, [toast])

  return (
    <>
      <DoctorNavbar />
      <section className={`flex flex-col gap-6 pb-24 ${isDashboardPage ? '-mt-20' : ''}`}>
        {/* Header Section */}
        <div className="space-y-2 mb-3 sm:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Wallet</h1>
              <p className="mt-1.5 text-sm text-slate-600">Manage your earnings and withdrawals</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 border border-emerald-100">
              <IoShieldCheckmarkOutline className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700 hidden sm:inline">Secure</span>
            </div>
          </div>
        </div>

        {/* Main Balance Card - Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-[rgba(0,119,194,0.15)] bg-gradient-to-br from-[#0077C2] via-[#3392ce] to-[#0077C2] p-6 sm:p-8 text-white shadow-2xl shadow-[rgba(0,119,194,0.25)]">
          {/* Animated Background Elements */}
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-white/80 mb-1">Total Balance</p>
                <p className="text-4xl sm:text-5xl font-bold tracking-tight">{loading ? '...' : formatCurrency(walletData.totalBalance)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 border border-white/30">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-medium">Available: {loading ? '...' : formatCurrency(walletData.availableBalance)}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 border border-white/30">
                    <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="font-medium">Pending: {loading ? '...' : formatCurrency(walletData.pendingBalance)}</span>
                  </div>
                </div>
              </div>
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
                <IoWalletOutline className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Earning Card */}
          <button
            onClick={() => navigate('/doctor/wallet/earning')}
            className="group relative overflow-hidden rounded-2xl border border-emerald-100/60 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-5 shadow-sm hover:shadow-lg transition-all active:scale-[0.98] hover:border-emerald-200"
          >
            <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-emerald-100/50 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <IoArrowDownOutline className="h-5 w-5 text-emerald-600" />
                </div>
                <IoArrowForwardOutline className="h-4 w-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Total Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{loading ? '...' : formatCurrency(walletData.totalEarnings)}</p>
              <p className="mt-1 text-[10px] text-slate-500">All time earnings</p>
            </div>
          </button>

          {/* Withdraw Card */}
          <button
            onClick={() => navigate('/doctor/wallet/withdraw')}
            className="group relative overflow-hidden rounded-2xl border border-amber-100/60 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 p-5 shadow-sm hover:shadow-lg transition-all active:scale-[0.98] hover:border-amber-200"
          >
            <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-amber-100/50 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <IoCashOutline className="h-5 w-5 text-amber-600" />
                </div>
                <IoArrowForwardOutline className="h-4 w-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">Total Withdrawals</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900">{loading ? '...' : formatCurrency(walletData.totalWithdrawals)}</p>
              <p className="mt-1 text-[10px] text-slate-500">All time withdrawals</p>
            </div>
          </button>
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Balance Details Card */}
          <button
            onClick={() => navigate('/doctor/wallet/balance')}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] hover:border-[rgba(0,119,194,0.3)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0077C2] to-[#3392ce]">
                  <IoWalletOutline className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">Balance Details</p>
                  <p className="text-xs text-slate-500">View breakdown</p>
                </div>
              </div>
              <IoArrowForwardOutline className="h-5 w-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          {/* Transaction History Card */}
          <button
            onClick={() => navigate('/doctor/wallet/transaction')}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] hover:border-[rgba(0,119,194,0.3)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                  <IoReceiptOutline className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">Transaction History</p>
                  <p className="text-xs text-slate-500">{loading ? '...' : walletData.totalTransactions} transactions</p>
                </div>
              </div>
              <IoArrowForwardOutline className="h-5 w-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>
      </section>
    </>
  )
}

export default DoctorWallet

