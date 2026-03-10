import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoWalletOutline,
  IoPeopleOutline,
  IoMedicalOutline,
  IoHeartOutline,
  IoCashOutline,
  IoReceiptOutline,
  IoArrowForwardOutline,
  IoShieldCheckmarkOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoSearchOutline,
  IoFilterOutline,
  IoEyeOutline,
  IoCloseOutline,
  IoArrowDownOutline,
  IoArrowUpOutline,
  IoCalendarOutline,
} from 'react-icons/io5'
import { getAdminWalletOverview, getProviderSummaries, getWithdrawals, updateWithdrawalStatus, getAdminWalletBalance, getAdminWalletTransactions, getAdminSettings, updateAdminSettings } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'

// Default wallet overview - initialize with zeros to avoid showing mock data
const defaultWalletOverview = {
  totalEarnings: 0,
  totalCommission: 0,
  availableBalance: 0,
  pendingWithdrawals: 0,
  thisMonthEarnings: 0,
  lastMonthEarnings: 0,
  totalWithdrawals: 0,
  pendingWithdrawalRequests: 0,
  totalTransactions: 0,
}

// Removed mock data - now using backend API
const defaultProviders = {
  doctors: [],
}

const defaultWithdrawals = []

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusBadge = (status) => {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
          <IoTimeOutline className="h-3 w-3" />
          Pending
        </span>
      )
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
          <IoCheckmarkCircleOutline className="h-3 w-3" />
          Approved
        </span>
      )
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
          <IoCloseCircleOutline className="h-3 w-3" />
          Rejected
        </span>
      )
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
          <IoCheckmarkCircleOutline className="h-3 w-3" />
          Paid
        </span>
      )
    default:
      return null
  }
}

const getProviderIcon = (type) => {
  switch (type) {
    case 'doctor':
      return IoMedicalOutline

    default:
      return IoPeopleOutline
  }
}

const AdminWallet = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedProviderType, setSelectedProviderType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingWithdrawal, setViewingWithdrawal] = useState(null)
  const [withdrawals, setWithdrawals] = useState(defaultWithdrawals)
  // Initialize with zeros to avoid showing mock data before API loads
  const [walletOverview, setWalletOverview] = useState({
    totalEarnings: 0,
    totalCommission: 0,
    availableBalance: 0,
    pendingWithdrawals: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    totalWithdrawals: 0,
    pendingWithdrawalRequests: 0,
    totalTransactions: 0,
    doctorEarnings: 0,
  })
  const [providers, setProviders] = useState(defaultProviders)
  const [notification, setNotification] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingWithdrawalId, setRejectingWithdrawalId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [transactionFilter, setTransactionFilter] = useState('all') // all, commission, withdrawal
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [earningsPeriod, setEarningsPeriod] = useState('all') // all, daily, weekly, monthly, yearly
  const [providerPeriod, setProviderPeriod] = useState('all') // Period filter for provider cards
  const [commissionRate, setCommissionRate] = useState('10') // percentage string for doctor commission
  const [isSavingCommission, setIsSavingCommission] = useState(false)

  // Load commission settings once (avoid polling /admin/settings repeatedly)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsData = await getAdminSettings()
        if (settingsData && settingsData.data) {
          const doctorRate = settingsData.data.paymentSettings?.commissionRate?.doctor
          const effectiveRate =
            typeof doctorRate === 'number' && !Number.isNaN(doctorRate) && doctorRate > 0
              ? doctorRate
              : 0.1

          setCommissionRate(String(Math.round(effectiveRate * 100)))
        }
      } catch (err) {
        console.error('Error fetching admin settings:', err)
        // Do not toast here to avoid noise; wallet can work with default 10%
      }
    }

    fetchSettings()
  }, [])

  // Fetch wallet data from API (periodically)
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [overview, summaries, withdrawalsData, transactionsData] = await Promise.all([
          getAdminWalletOverview(earningsPeriod),
          getProviderSummaries(null, providerPeriod),
          getWithdrawals(),
          getAdminWalletTransactions(),
        ])

        // 1. Handle Overview
        if (overview) {
          setWalletOverview({
            totalEarnings: overview.totalCommission || 0,
            totalCommission: overview.totalCommission || 0,
            availableBalance: overview.availableBalance || 0,
            pendingWithdrawals: overview.pendingWithdrawals || 0,
            thisMonthEarnings: overview.thisMonthEarnings || 0,
            lastMonthEarnings: overview.lastMonthEarnings || 0,
            totalWithdrawals: overview.totalPaidOut || 0,
            pendingWithdrawalRequests: (Array.isArray(withdrawalsData) ? withdrawalsData : withdrawalsData?.items || []).filter(w => {
              const status = w.status || w.originalData?.status
              return status === 'pending'
            }).length,
            totalTransactions: overview.totalTransactions || 0,
            doctorEarnings: overview.doctorEarnings || 0,
          })

          console.log('💰 Admin Wallet Overview:', overview)
        }

        // 2. Handle Providers
        if (summaries) {
          const providerList = Array.isArray(summaries) ? summaries : summaries.items || summaries.summaries || []

          console.log('📊 Provider Summaries:', providerList.length)

          const grouped = {
            doctors: providerList.filter(p => p.role === 'doctor' || p.type === 'doctor').map(p => ({
              id: p.providerId || p.id,
              name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
              email: p.email || '',
              totalEarnings: p.totalEarnings || 0,
              periodEarnings: p.periodEarnings || 0,
              availableBalance: p.availableBalance ?? p.balance ?? 0,
              pendingBalance: p.pendingBalance ?? p.pendingWithdrawal ?? 0,
              totalWithdrawals: p.totalWithdrawals ?? p.paidWithdrawal ?? 0,
              totalTransactions: p.totalTransactions || 0,
              periodTransactions: p.periodTransactions || 0,
              status: p.status || 'active',
            })),
          }
          setProviders(grouped)
        }

        // 3. Handle Withdrawals
        if (withdrawalsData) {
          const list = Array.isArray(withdrawalsData)
            ? withdrawalsData
            : (withdrawalsData.items || withdrawalsData.withdrawals || [])

          setWithdrawals(list.map(wd => {
            // Extract provider info
            let providerName = 'Provider'
            let providerEmail = ''
            let providerPhone = ''
            let providerId = null

            if (wd.userId && typeof wd.userId === 'object') {
              providerId = wd.userId._id || wd.userId.id
              providerEmail = wd.userId.email || ''
              providerPhone = wd.userId.phone || ''

              if (wd.userType === 'doctor') {
                providerName = `${wd.userId.firstName || ''} ${wd.userId.lastName || ''}`.trim() || wd.userId.email?.split('@')[0] || 'Doctor'
              }
            } else {
              providerId = wd.userId
            }

            return {
              id: wd._id || wd.id,
              providerName,
              providerType: wd.userType || 'doctor',
              providerEmail,
              providerPhone,
              providerId,
              amount: wd.amount || 0,
              status: wd.status || 'pending',
              requestedAt: wd.createdAt || wd.requestedAt || new Date().toISOString(),
              payoutMethod: wd.payoutMethod?.type === 'upi' ? 'UPI' : wd.payoutMethod?.type === 'paytm' ? 'Paytm' : wd.payoutMethod?.type === 'cash' ? 'Cash' : 'Bank Transfer',
              accountNumber: wd.payoutMethod?.details?.accountNumber || '****',
              bankName: wd.payoutMethod?.details?.bankName || '',
              ifscCode: wd.payoutMethod?.details?.ifscCode || '',
              accountHolderName: wd.payoutMethod?.details?.accountHolderName || '',
              upiId: wd.payoutMethod?.details?.upiId || '',
              paytmNumber: wd.payoutMethod?.details?.paytmNumber || '',
              notes: wd.payoutMethod?.details?.notes || '',
              availableBalance: wd.availableBalance || 0,
              totalEarnings: wd.totalEarnings || 0,
              totalWithdrawals: wd.totalWithdrawals || 0,
              transactionId: wd.transactionId || wd._id || wd.id,
              rejectionReason: wd.rejectionReason || '',
              originalData: wd,
            }
          }))
        }

        // 4. Handle Transactions
        if (transactionsData) {
          const list = Array.isArray(transactionsData) ? transactionsData : (transactionsData.items || transactionsData.transactions || [])

          setTransactions(list.map(txn => ({
            id: txn._id || txn.id,
            transactionId: txn.transactionId || txn._id || txn.id,
            type: txn.type || 'payment',
            category: txn.category || '',
            providerName: txn.providerId?.name || txn.providerName || txn.patientName || (txn.patient?.firstName && txn.patient?.lastName ? `${txn.patient.firstName} ${txn.patient.lastName}` : '') || 'Provider',
            providerType: txn.providerType || txn.userType || 'patient',
            amount: Number(txn.amount || 0),
            status: txn.status || 'completed',
            description: txn.description || txn.notes || 'Transaction',
            createdAt: txn.createdAt || new Date().toISOString(),
            orderId: txn.orderId || txn.orderId?._id || null,
            patientName: txn.patientName || (txn.patient?.firstName && txn.patient?.lastName ? `${txn.patient.firstName} ${txn.patient.lastName}` : '') || (txn.userId?.firstName && txn.userId?.lastName ? `${txn.userId.firstName} ${txn.userId.lastName}` : '') || '',
            originalData: txn,
          })))
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

    // Listen for appointment booking event to refresh wallet once when needed
    const handleAppointmentBooked = () => {
      fetchWalletData()
    }
    window.addEventListener('appointmentBooked', handleAppointmentBooked)

    return () => {
      window.removeEventListener('appointmentBooked', handleAppointmentBooked)
    }
  }, [toast, earningsPeriod, providerPeriod])

  // Legacy localStorage loading removed - using API now

  const allProviders = [
    ...(providers.doctors || []).map(p => ({ ...p, type: 'doctor' })),
  ]

  const filteredProviders = allProviders.filter((provider) => {
    const matchesSearch =
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedProviderType === 'all' || provider.type === selectedProviderType
    return matchesSearch && matchesType
  })

  const earningsByRole = {
    doctors: walletOverview.doctorEarnings || 0,
  }

  const handleCommissionSave = async () => {
    const trimmed = commissionRate.trim()
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast.error('Please enter a valid commission percentage greater than 0')
      return
    }
    if (numeric >= 100) {
      toast.error('Commission percentage must be less than 100')
      return
    }

    try {
      setIsSavingCommission(true)
      await updateAdminSettings({
        paymentSettings: {
          commissionRate: {
            doctor: numeric / 100,
          },
        },
      })
      toast.success('Commission rate updated successfully')
    } catch (err) {
      console.error('Error updating commission rate:', err)
      toast.error(err.message || 'Failed to update commission rate')
    } finally {
      setIsSavingCommission(false)
    }
  }

  const handleApprove = async (withdrawalId) => {
    try {
      await updateWithdrawalStatus(withdrawalId, { status: 'paid' })
      toast.success('Withdrawal processed and paid successfully!')

      const [overview, withdrawalsData] = await Promise.all([
        getAdminWalletOverview(earningsPeriod),
        getWithdrawals(),
      ])

      if (overview) {
        setWalletOverview({
          totalEarnings: overview.totalCommission || 0,
          totalCommission: overview.totalCommission || 0,
          availableBalance: overview.availableBalance || 0,
          pendingWithdrawals: overview.pendingWithdrawals || 0,
          thisMonthEarnings: overview.thisMonthEarnings || 0,
          lastMonthEarnings: overview.lastMonthEarnings || 0,
          totalWithdrawals: overview.totalPaidOut || 0,
          pendingWithdrawalRequests: (Array.isArray(withdrawalsData) ? withdrawalsData : withdrawalsData?.items || [])
            .filter(w => (w.status || w.originalData?.status) === 'pending').length,
          totalTransactions: overview.totalTransactions || 0,
          doctorEarnings: overview.doctorEarnings || 0,
        })
      }

      if (withdrawalsData) {
        const list = Array.isArray(withdrawalsData) ? withdrawalsData : (withdrawalsData.items || withdrawalsData.withdrawals || [])

        setWithdrawals(list.map(wd => {
          let providerName = 'Provider'
          let providerEmail = ''
          let providerPhone = ''
          let providerId = null

          if (wd.userId && typeof wd.userId === 'object') {
            providerId = wd.userId._id || wd.userId.id
            providerEmail = wd.userId.email || ''
            providerPhone = wd.userId.phone || ''

            if (wd.userType === 'doctor') {
              providerName = `${wd.userId.firstName || ''} ${wd.userId.lastName || ''}`.trim() || 'Doctor'
            }
          } else {
            providerId = wd.userId
          }

          return {
            id: wd._id || wd.id,
            providerName,
            providerType: wd.userType || 'doctor',
            providerEmail,
            providerPhone,
            providerId,
            amount: wd.amount || 0,
            status: wd.status || 'pending',
            requestedAt: wd.createdAt || wd.requestedAt || new Date().toISOString(),
            payoutMethod: wd.payoutMethod?.type === 'upi' ? 'UPI' : wd.payoutMethod?.type === 'paytm' ? 'Paytm' : 'Bank Transfer',
            accountNumber: wd.payoutMethod?.details?.accountNumber || '****',
            bankName: wd.payoutMethod?.details?.bankName || '',
            ifscCode: wd.payoutMethod?.details?.ifscCode || '',
            accountHolderName: wd.payoutMethod?.details?.accountHolderName || '',
            upiId: wd.payoutMethod?.details?.upiId || '',
            paytmNumber: wd.payoutMethod?.details?.paytmNumber || '',
            availableBalance: wd.availableBalance || 0,
            totalEarnings: wd.totalEarnings || 0,
            totalWithdrawals: wd.totalWithdrawals || 0,
            transactionId: wd.transactionId || wd._id || wd.id,
            rejectionReason: wd.rejectionReason || '',
            originalData: wd,
          }
        }))
      }
    } catch (err) {
      console.error('Error approving withdrawal:', err)
      toast.error(err.message || 'Failed to approve withdrawal')
    }
  }

  const handleRejectClick = (withdrawalId) => {
    setRejectingWithdrawalId(withdrawalId)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const handleReject = async () => {
    if (!rejectingWithdrawalId) return
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection.')
      return
    }

    const withdrawal = withdrawals.find(w => w.id === rejectingWithdrawalId)
    if (!withdrawal) return

    try {
      await updateWithdrawalStatus(rejectingWithdrawalId, {
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
      })

      toast.success('Withdrawal rejected successfully!')
      setShowRejectModal(false)
      setRejectingWithdrawalId(null)
      setRejectionReason('')

      const [overview, withdrawalsData] = await Promise.all([
        getAdminWalletOverview(earningsPeriod),
        getWithdrawals(),
      ])

      if (overview) {
        setWalletOverview(prev => ({
          ...prev,
          pendingWithdrawals: overview.pendingWithdrawals || 0,
          pendingWithdrawalRequests: (Array.isArray(withdrawalsData) ? withdrawalsData : withdrawalsData?.items || [])
            .filter(w => (w.status || w.originalData?.status) === 'pending').length,
        }))
      }

      if (withdrawalsData) {
        const list = Array.isArray(withdrawalsData) ? withdrawalsData : (withdrawalsData.items || withdrawalsData.withdrawals || [])

        setWithdrawals(list.map(wd => {
          let providerName = 'Provider'
          let providerEmail = ''
          let providerPhone = ''
          let providerId = null

          if (wd.userId && typeof wd.userId === 'object') {
            providerId = wd.userId._id || wd.userId.id
            providerEmail = wd.userId.email || ''
            providerPhone = wd.userId.phone || ''

            if (wd.userType === 'doctor') {
              providerName = `${wd.userId.firstName || ''} ${wd.userId.lastName || ''}`.trim() || 'Doctor'
            }
          } else {
            providerId = wd.userId
          }

          return {
            id: wd._id || wd.id,
            providerName,
            providerType: wd.userType || 'doctor',
            providerEmail,
            providerPhone,
            providerId,
            amount: wd.amount || 0,
            status: wd.status || 'pending',
            requestedAt: wd.createdAt || wd.requestedAt || new Date().toISOString(),
            payoutMethod: wd.payoutMethod?.type === 'upi' ? 'UPI' : wd.payoutMethod?.type === 'paytm' ? 'Paytm' : 'Bank Transfer',
            accountNumber: wd.payoutMethod?.details?.accountNumber || '****',
            bankName: wd.payoutMethod?.details?.bankName || '',
            ifscCode: wd.payoutMethod?.details?.ifscCode || '',
            accountHolderName: wd.payoutMethod?.details?.accountHolderName || '',
            upiId: wd.payoutMethod?.details?.upiId || '',
            paytmNumber: wd.payoutMethod?.details?.paytmNumber || '',
            availableBalance: wd.availableBalance || 0,
            totalEarnings: wd.totalEarnings || 0,
            totalWithdrawals: wd.totalWithdrawals || 0,
            transactionId: wd.transactionId || wd._id || wd.id,
            rejectionReason: wd.rejectionReason || '',
            originalData: wd,
          }
        }))
      }

      if (viewingWithdrawal?.id === rejectingWithdrawalId) {
        setViewingWithdrawal(prev => ({
          ...prev,
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: 'Admin User',
          rejectionReason: rejectionReason.trim(),
        }))
      }
    } catch (err) {
      console.error('Error rejecting withdrawal:', err)
      toast.error(err.message || 'Failed to reject withdrawal. Please try again.')
    }
  }

  return (
    <section className="flex flex-col gap-3 pb-20 pt-0">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 rounded-lg border px-4 py-3 shadow-lg ${notification.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <IoCheckmarkCircleOutline className="h-5 w-5" />
            ) : (
              <IoCloseCircleOutline className="h-5 w-5" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Admin Wallet</h1>
            <p className="mt-1.5 text-sm text-slate-600">Platform earnings and provider wallet management</p>
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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-white/80 mb-2">Total Platform Earnings</p>
              {/* Period Filter Buttons - Mobile First Design */}
              <div className="flex flex-wrap items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20 w-full sm:w-auto">
                <button
                  onClick={() => setEarningsPeriod('daily')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all flex-1 sm:flex-initial ${earningsPeriod === 'daily'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setEarningsPeriod('weekly')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all flex-1 sm:flex-initial ${earningsPeriod === 'weekly'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setEarningsPeriod('monthly')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all flex-1 sm:flex-initial ${earningsPeriod === 'monthly'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setEarningsPeriod('yearly')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all flex-1 sm:flex-initial ${earningsPeriod === 'yearly'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                >
                  Yearly
                </button>
                <button
                  onClick={() => setEarningsPeriod('all')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all flex-1 sm:flex-initial ${earningsPeriod === 'all'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                >
                  All
                </button>
              </div>
              <p className="text-4xl sm:text-5xl font-bold tracking-tight">
                {loading ? '...' : formatCurrency(walletOverview.totalEarnings || walletOverview.totalCommission || 0)}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 border border-white/30">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium">Available: {loading ? '...' : formatCurrency(walletOverview.availableBalance || 0)}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 border border-white/30">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="font-medium">Pending: {loading ? '...' : formatCurrency(walletOverview.pendingWithdrawals || 0)}</span>
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
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {/* Commission Card */}
        <article className="relative overflow-hidden rounded-2xl border border-emerald-100/60 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-5 shadow-sm">
          <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-emerald-100/50 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <IoCashOutline className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Platform Fees</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{loading ? '...' : formatCurrency(walletOverview.totalCommission)}</p>
            <p className="mt-1 text-[10px] text-slate-500 mb-3">Platform fees</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="99"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-20 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600">% doctor commission</span>
              <button
                type="button"
                onClick={handleCommissionSave}
                disabled={isSavingCommission}
                className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
              >
                {isSavingCommission ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </article>

        {/* Withdrawals Card */}
        <article className="relative overflow-hidden rounded-2xl border border-amber-100/60 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 p-5 shadow-sm">
          <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-amber-100/50 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <IoCashOutline className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">Total Withdrawals</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{loading ? '...' : formatCurrency(walletOverview.totalWithdrawals)}</p>
            <p className="mt-1 text-[10px] text-slate-500">{loading ? '...' : walletOverview.pendingWithdrawalRequests} pending requests</p>
          </div>
        </article>
      </div>

      {/* Earnings by Role */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Earnings by Provider Type</h2>
          <p className="mt-1 text-xs text-slate-600">Platform fees breakdown</p>
        </header>
        <div className="grid grid-cols-1 gap-4">
          {/* Doctors Earnings */}
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <IoMedicalOutline className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-600 uppercase">Doctors</p>
                <p className="text-lg font-bold text-slate-900">{loading ? '...' : formatCurrency(earningsByRole.doctors)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">{loading ? '...' : (providers.doctors || []).length} active doctors</p>
          </article>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'overview'
            ? 'border-b-2 border-primary text-primary'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Provider Details
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'withdrawals'
            ? 'border-b-2 border-primary text-primary'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Withdrawal Requests
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'transactions'
            ? 'border-b-2 border-primary text-primary'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Transactions
        </button>
      </div>

      {/* Provider Details Tab */}
      {activeTab === 'overview' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="mb-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">All Providers Wallet Details</h2>
                <p className="mt-1 text-xs text-slate-600">View earnings and balances for all providers</p>
              </div>
              {/* Period Filter for Provider Cards */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 hidden sm:inline">Filter:</span>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <button
                    onClick={() => setProviderPeriod('daily')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all ${providerPeriod === 'daily'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setProviderPeriod('weekly')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all ${providerPeriod === 'weekly'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setProviderPeriod('monthly')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all ${providerPeriod === 'monthly'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setProviderPeriod('yearly')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all ${providerPeriod === 'yearly'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                  >
                    Yearly
                  </button>
                  <button
                    onClick={() => setProviderPeriod('all')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all ${providerPeriod === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <IoSearchOutline className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={selectedProviderType}
                onChange={(e) => setSelectedProviderType(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="doctor">Doctors</option>

              </select>
            </div>
          </header>

          <div className="space-y-3">
            {filteredProviders.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <p className="text-slate-600">No providers found</p>
              </div>
            ) : (
              filteredProviders.map((provider) => {
                const ProviderIcon = getProviderIcon(provider.type)
                return (
                  <article
                    key={provider.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        <ProviderIcon className="h-6 w-6 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-slate-900">{provider.name}</h3>
                            <p className="mt-0.5 text-sm text-slate-600 truncate">{provider.email}</p>
                            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">
                                  Earnings {providerPeriod !== 'all' && `(${providerPeriod})`}
                                </p>
                                <p className="mt-1 text-sm font-bold text-slate-900">
                                  {formatCurrency(providerPeriod === 'all' ? (provider.totalEarnings || 0) : (provider.periodEarnings || 0))}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">Available</p>
                                <p className="mt-1 text-sm font-bold text-emerald-600">{formatCurrency(provider.availableBalance)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">Pending</p>
                                <p className="mt-1 text-sm font-bold text-amber-600">{formatCurrency(provider.pendingBalance)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase">Withdrawals</p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(provider.totalWithdrawals)}</p>
                              </div>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 capitalize">
                            {provider.type}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <IoReceiptOutline className="h-3.5 w-3.5" />
                          <span>
                            {(providerPeriod === 'all' ? provider.totalTransactions : provider.periodTransactions)} transaction{(providerPeriod === 'all' ? provider.totalTransactions : provider.periodTransactions) !== 1 ? 's' : ''}
                            {providerPeriod !== 'all' && ` (${providerPeriod})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">All Transactions</h2>
              <p className="mt-1 text-xs text-slate-600">View all platform transactions and platform fees</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <IoSearchOutline className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={transactionSearchTerm}
                  onChange={(e) => setTransactionSearchTerm(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={transactionFilter}
                onChange={(e) => setTransactionFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="commission">Platform Fees</option>
                <option value="withdrawal">Withdrawals</option>
              </select>
            </div>
          </header>

          <div className="space-y-3">
            {(() => {
              let filteredTransactions = transactions

              // Filter by type
              if (transactionFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(
                  txn => txn.type === transactionFilter
                )
              }

              // Filter by search
              if (transactionSearchTerm.trim()) {
                const normalizedSearch = transactionSearchTerm.trim().toLowerCase()
                filteredTransactions = filteredTransactions.filter(
                  txn =>
                    txn.providerName.toLowerCase().includes(normalizedSearch) ||
                    txn.transactionId.toLowerCase().includes(normalizedSearch) ||
                    txn.description.toLowerCase().includes(normalizedSearch) ||
                    (txn.orderId && txn.orderId.toLowerCase().includes(normalizedSearch))
                )
              }

              // Sort by date (newest first)
              filteredTransactions = filteredTransactions.sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt)
              })

              if (filteredTransactions.length === 0) {
                return (
                  <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                    <IoReceiptOutline className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-600">No transactions found</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {transactionSearchTerm.trim() || transactionFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Transactions will appear here'}
                    </p>
                  </div>
                )
              }

              return filteredTransactions.map((transaction) => {
                const ProviderIcon = getProviderIcon(transaction.providerType)
                const isCredit = transaction.amount > 0
                const isWithdrawal = transaction.type === 'withdrawal'

                return (
                  <article
                    key={transaction.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-100' : 'bg-red-100'
                        }`}>
                        {isCredit ? (
                          <IoArrowDownOutline className={`h-6 w-6 ${isCredit ? 'text-emerald-600' : 'text-red-600'}`} />
                        ) : (
                          <IoArrowUpOutline className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <ProviderIcon className="h-4 w-4 text-slate-500" />
                              <h3 className="text-sm font-semibold text-slate-900">{transaction.providerName}</h3>
                              <span className="text-xs text-slate-500 capitalize">• {transaction.providerType}</span>
                            </div>
                            <p className="text-xs text-slate-600 mb-2">{transaction.description}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <IoCalendarOutline className="h-3.5 w-3.5" />
                                <span>{formatDate(transaction.createdAt)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <IoReceiptOutline className="h-3.5 w-3.5" />
                                <span>{transaction.transactionId}</span>
                              </div>
                              {transaction.orderId && (
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold">Order:</span>
                                  <span>{transaction.orderId}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className={`text-lg font-bold ${isCredit ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                              {isCredit ? '+' : ''}{formatCurrency(transaction.amount)}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(transaction.status)}
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${transaction.type === 'commission'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-purple-50 text-purple-700'
                                }`}>
                                {transaction.type === 'commission' ? 'Platform Fee' : 'Withdrawal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })
            })()}
          </div>
        </section>
      )}

      {/* Withdrawal Requests Tab */}
      {activeTab === 'withdrawals' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Withdrawal Requests</h2>
            <p className="mt-1 text-xs text-slate-600">Manage provider withdrawal requests</p>
          </header>

          <div className="space-y-3">
            {withdrawals.map((withdrawal) => {
              const ProviderIcon = getProviderIcon(withdrawal.providerType)
              return (
                <article
                  key={withdrawal.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100">
                      <ProviderIcon className="h-6 w-6 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-slate-900">{withdrawal.providerName}</h3>
                          <p className="mt-0.5 text-sm text-slate-600 capitalize">{withdrawal.providerType}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase">Amount</p>
                              <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(withdrawal.amount)}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase">Method</p>
                              <p className="mt-1 text-sm text-slate-600">{withdrawal.payoutMethod}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase">Requested</p>
                              <p className="mt-1 text-sm text-slate-600">{formatDate(withdrawal.requestedAt)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(withdrawal.status)}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // Find provider wallet data from providers list
                                const allProviders = Object.values(providers).flat()
                                const withdrawalUserId = withdrawal.providerId || withdrawal.originalData?.userId?._id || withdrawal.originalData?.userId

                                const providerData = allProviders.find(p => {
                                  const providerIdStr = (p.id || p.providerId)?.toString()
                                  const userIdStr = withdrawalUserId?.toString()
                                  return providerIdStr === userIdStr
                                })

                                // Also ensure provider info is extracted from originalData if missing
                                let finalWithdrawal = { ...withdrawal }

                                // If provider name/email/phone are missing, try to get from originalData
                                if (!finalWithdrawal.providerName || finalWithdrawal.providerName === 'Provider') {
                                  const origUserId = withdrawal.originalData?.userId
                                  if (origUserId && typeof origUserId === 'object' && origUserId._id) {
                                    if (withdrawal.providerType === 'doctor') {
                                      const firstName = origUserId.firstName || ''
                                      const lastName = origUserId.lastName || ''
                                      finalWithdrawal.providerName = `${firstName} ${lastName}`.trim()
                                      if (!finalWithdrawal.providerName) {
                                        finalWithdrawal.providerName = origUserId.email?.split('@')[0] || 'Doctor'
                                      }
                                    }
                                  }
                                }

                                if (!finalWithdrawal.providerEmail && withdrawal.originalData?.userId?.email) {
                                  finalWithdrawal.providerEmail = withdrawal.originalData.userId.email
                                }

                                if (!finalWithdrawal.providerPhone && withdrawal.originalData?.userId?.phone) {
                                  finalWithdrawal.providerPhone = withdrawal.originalData.userId.phone
                                }

                                // Add provider wallet data if found
                                if (providerData) {
                                  finalWithdrawal.totalEarnings = providerData.totalEarnings || 0
                                  finalWithdrawal.availableBalance = providerData.availableBalance || 0
                                  finalWithdrawal.totalWithdrawals = providerData.totalWithdrawals || 0
                                }

                                setViewingWithdrawal(finalWithdrawal)
                              }}
                              className="flex items-center gap-1 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                            >
                              <IoEyeOutline className="h-3.5 w-3.5" />
                              View
                            </button>
                            {withdrawal.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(withdrawal.id)}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectClick(withdrawal.id)}
                                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {withdrawal.status === 'rejected' && withdrawal.rejectionReason && (
                          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
                            <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason:</p>
                            <p className="text-sm text-red-600">{withdrawal.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* View Withdrawal Details Modal */}
      {viewingWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingWithdrawal(null)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Withdrawal Request Details</h2>
              <button
                onClick={() => setViewingWithdrawal(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <IoCloseOutline className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Provider Info */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Provider Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Provider Name</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.providerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Provider Type</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 capitalize">{viewingWithdrawal.providerType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.providerEmail || viewingWithdrawal.originalData?.userId?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.providerPhone || viewingWithdrawal.originalData?.userId?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Withdrawal Details */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Withdrawal Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(viewingWithdrawal.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <div className="mt-1">{getStatusBadge(viewingWithdrawal.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Requested At</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(viewingWithdrawal.requestedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Transaction ID</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.transactionId}</p>
                  </div>
                  {viewingWithdrawal.approvedAt && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">Approved At</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(viewingWithdrawal.approvedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Approved By</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.approvedBy}</p>
                      </div>
                    </>
                  )}
                  {viewingWithdrawal.rejectedAt && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">Rejected At</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(viewingWithdrawal.rejectedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Rejected By</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.rejectedBy}</p>
                      </div>
                      {viewingWithdrawal.rejectionReason && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-slate-500">Rejection Reason</p>
                          <p className="mt-1 text-sm font-semibold text-red-600 bg-red-50 p-2 rounded-lg">{viewingWithdrawal.rejectionReason}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Payment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-500">Payout Method</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.payoutMethod}</p>
                  </div>
                  {/* Show bank details only if payout method is bank_transfer */}
                  {viewingWithdrawal.originalData?.payoutMethod?.type === 'bank_transfer' && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">Bank Name</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.bankName || viewingWithdrawal.originalData?.payoutMethod?.details?.bankName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Account Number</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.accountNumber || viewingWithdrawal.originalData?.payoutMethod?.details?.accountNumber || '****'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">IFSC Code</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.ifscCode || viewingWithdrawal.originalData?.payoutMethod?.details?.ifscCode || 'N/A'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-slate-500">Account Holder Name</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.accountHolderName || viewingWithdrawal.originalData?.payoutMethod?.details?.accountHolderName || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  {/* Show UPI ID only if payout method is upi */}
                  {viewingWithdrawal.originalData?.payoutMethod?.type === 'upi' && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500">UPI ID</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.upiId || viewingWithdrawal.originalData?.payoutMethod?.details?.upiId || 'N/A'}</p>
                    </div>
                  )}
                  {/* Show Paytm number only if payout method is paytm or wallet */}
                  {(viewingWithdrawal.originalData?.payoutMethod?.type === 'paytm' || viewingWithdrawal.originalData?.payoutMethod?.type === 'wallet') && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500">Wallet Number</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.paytmNumber || viewingWithdrawal.walletNumber || viewingWithdrawal.originalData?.payoutMethod?.details?.paytmNumber || viewingWithdrawal.originalData?.payoutMethod?.details?.walletNumber || 'N/A'}</p>
                    </div>
                  )}
                  {/* Show Cash details only if payout method is cash */}
                  {viewingWithdrawal.originalData?.payoutMethod?.type === 'cash' && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500">Receiver/Notes</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{viewingWithdrawal.notes || viewingWithdrawal.originalData?.payoutMethod?.details?.notes || 'N/A'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Provider Wallet Summary */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Provider Wallet Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Total Earnings</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(viewingWithdrawal.totalEarnings)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Available Balance</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(viewingWithdrawal.availableBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Withdrawals</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(viewingWithdrawal.totalWithdrawals)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              {viewingWithdrawal.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprove(viewingWithdrawal.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectClick(viewingWithdrawal.id)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => setViewingWithdrawal(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Withdrawal Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowRejectModal(false)
            setRejectingWithdrawalId(null)
            setRejectionReason('')
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">Reject Withdrawal Request</h2>
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectingWithdrawalId(null)
                  setRejectionReason('')
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <IoCloseOutline className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-3">
                  Please provide a reason for rejecting this withdrawal request. This reason will be sent to the provider.
                </p>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter the reason for rejection..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
                />
                {!rejectionReason.trim() && (
                  <p className="mt-1 text-xs text-red-600">Reason is required</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectingWithdrawalId(null)
                  setRejectionReason('')
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminWallet
