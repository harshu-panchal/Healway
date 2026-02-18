import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import DoctorNavbar from '../doctor-components/DoctorNavbar'
import {
  IoArrowBackOutline,
  IoCashOutline,
  IoAddOutline,
  IoCardOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoCloseOutline,
  IoCalendarOutline,
  IoWalletOutline,
  IoPhonePortraitOutline,
} from 'react-icons/io5'
import { getDoctorWalletBalance, getDoctorWithdrawals, requestWithdrawal } from '../doctor-services/doctorService'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

// Default withdraw data (will be replaced by API data)
const defaultWithdrawData = {
  availableBalance: 0,
  totalWithdrawals: 0,
  thisMonthWithdrawals: 0,
  withdrawalHistory: [],
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

const WalletWithdraw = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bank')
  const [isProcessing, setIsProcessing] = useState(false)
  const [withdrawData, setWithdrawData] = useState(defaultWithdrawData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  // Payment method details
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
  })
  const [upiId, setUpiId] = useState('')
  const [walletNumber, setWalletNumber] = useState('')

  // Fetch withdraw data from API
  useEffect(() => {
    const fetchWithdrawData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [balanceResponse, withdrawalsResponse] = await Promise.all([
          getDoctorWalletBalance(),
          getDoctorWithdrawals({ page: currentPage, limit: itemsPerPage }),
        ])

        if (balanceResponse) {
          const balance = balanceResponse
          // Backend returns: { success: true, data: { items: [...], pagination: {...} } }
          let withdrawalsData = []
          if (withdrawalsResponse) {
            const rawData = withdrawalsResponse

            if (Array.isArray(rawData)) {
              withdrawalsData = rawData
              setTotalPages(1)
              setTotalItems(rawData.length)
            } else {
              withdrawalsData = rawData.items || rawData.withdrawals || []
              if (rawData.pagination) {
                setTotalPages(rawData.pagination.totalPages || 1)
                setTotalItems(rawData.pagination.total || 0)
              } else {
                setTotalPages(1)
                setTotalItems(withdrawalsData.length)
              }
            }
          }

          const withdrawalHistory = withdrawalsData.map(wd => {
            // Extract payment method details from withdrawalRequestId if populated
            const payoutMethod = wd.withdrawalRequestId?.payoutMethod || wd.payoutMethod
            let paymentMethod = 'Bank Account'
            let accountNumber = '****'
            let upiId = ''
            let walletNumber = ''

            if (payoutMethod) {
              if (payoutMethod.type === 'bank_transfer') {
                paymentMethod = 'Bank Transfer'
                accountNumber = payoutMethod.details?.accountNumber || '****'
              } else if (payoutMethod.type === 'upi') {
                paymentMethod = 'UPI'
                upiId = payoutMethod.details?.upiId || ''
              } else if (payoutMethod.type === 'paytm' || payoutMethod.type === 'wallet') {
                paymentMethod = 'Wallet'
                walletNumber = payoutMethod.details?.paytmNumber || payoutMethod.details?.walletNumber || ''
              } else if (payoutMethod.type === 'cash') {
                paymentMethod = 'Cash'
              }
            }

            return {
              id: wd._id || wd.id,
              amount: wd.amount || 0,
              description: wd.description || 'Withdrawal',
              date: wd.createdAt || wd.date || new Date().toISOString(),
              status: wd.status || 'pending',
              paymentMethod: paymentMethod,
              accountNumber: accountNumber,
              upiId: upiId,
              walletNumber: walletNumber,
            }
          })

          setWithdrawData({
            availableBalance: balance.availableBalance || balance.available || 0,
            totalWithdrawals: balance.totalWithdrawals || 0,
            // Get thisMonthWithdrawals from balance response, not withdrawals response
            thisMonthWithdrawals: balance.thisMonthWithdrawals || 0,
            withdrawalHistory,
          })
        }
      } catch (err) {
        console.error('Error fetching withdraw data:', err)
        setError(err.message || 'Failed to load withdraw data')
        toast.error('Failed to load withdraw data')
      } finally {
        setLoading(false)
      }
    }

    fetchWithdrawData()
  }, [toast, currentPage])

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validatePaymentMethod = () => {
    if (selectedPaymentMethod === 'bank') {
      if (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolderName) {
        alert('Please fill all bank account details')
        return false
      }
    } else if (selectedPaymentMethod === 'upi') {
      if (!upiId || !upiId.includes('@')) {
        alert('Please enter a valid UPI ID')
        return false
      }
    } else if (selectedPaymentMethod === 'cash') {
      if (!bankDetails.accountHolderName) {
        alert('Please enter receiver name for cash collection')
        return false
      }
    }
    return true
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const amount = parseFloat(withdrawAmount)
    if (amount > withdrawData.availableBalance) {
      toast.error('Insufficient balance')
      return
    }

    if (!validatePaymentMethod()) {
      return
    }

    setIsProcessing(true)

    try {
      // Prepare withdrawal data
      const withdrawalData = {
        amount,
        paymentMethod: selectedPaymentMethod,
        ...(selectedPaymentMethod === 'bank' ? {
          bankAccount: {
            accountNumber: bankDetails.accountNumber,
            ifscCode: bankDetails.ifscCode,
            accountHolderName: bankDetails.accountHolderName,
          },
        } : selectedPaymentMethod === 'upi' ? {
          upiId,
        } : {
          // Cash details
          receiverName: bankDetails.accountHolderName,
          notes: bankDetails.accountNumber // Reuse fields for simplicity in state, or add new ones
        }),
      }

      // Call API to request withdrawal
      await requestWithdrawal(withdrawalData)

      toast.success(`Withdrawal request of ${formatCurrency(amount)} submitted successfully! Admin will review your request.`)
      setShowWithdrawModal(false)
      setWithdrawAmount('')
      setBankDetails({ accountNumber: '', ifscCode: '', accountHolderName: '' })
      setUpiId('')
      setWalletNumber('')

      // Refresh withdraw data
      const [balanceResponse, withdrawalsResponse] = await Promise.all([
        getDoctorWalletBalance(),
        getDoctorWithdrawals(),
      ])

      if (balanceResponse) {
        const balance = balanceResponse

        // Backend returns: { success: true, data: { items: [...], pagination: {...} } }
        let withdrawalsData = []
        if (withdrawalsResponse) {
          const rawData = withdrawalsResponse
          if (Array.isArray(rawData)) {
            withdrawalsData = rawData
          } else if (rawData?.items) {
            withdrawalsData = rawData.items
          } else if (rawData?.withdrawals) {
            withdrawalsData = rawData.withdrawals
          }
        }

        const withdrawalHistory = withdrawalsData.map(wd => {
          // Extract payment method details from payoutMethod
          const payoutMethod = wd.payoutMethod
          let paymentMethod = 'Bank Account'
          let accountNumber = '****'
          let upiId = ''
          let walletNumber = ''

          if (payoutMethod) {
            if (payoutMethod.type === 'bank_transfer') {
              paymentMethod = 'Bank Transfer'
              accountNumber = payoutMethod.details?.accountNumber || '****'
            } else if (payoutMethod.type === 'upi') {
              paymentMethod = 'UPI'
              upiId = payoutMethod.details?.upiId || ''
            } else if (payoutMethod.type === 'paytm') {
              paymentMethod = 'Paytm'
              walletNumber = payoutMethod.details?.paytmNumber || ''
            }
          }

          return {
            id: wd._id || wd.id,
            amount: wd.amount || 0,
            description: wd.description || 'Withdrawal',
            date: wd.createdAt || wd.date || new Date().toISOString(),
            status: wd.status || 'pending',
            paymentMethod: paymentMethod,
            accountNumber: accountNumber,
            upiId: upiId,
            walletNumber: walletNumber,
          }
        })

        setWithdrawData({
          availableBalance: balance.availableBalance || balance.available || 0,
          totalWithdrawals: balance.totalWithdrawals || 0,
          // Get thisMonthWithdrawals from balance response, not withdrawals response
          thisMonthWithdrawals: balance.thisMonthWithdrawals || 0,
          withdrawalHistory,
        })
      }
    } catch (err) {
      console.error('Error requesting withdrawal:', err)
      toast.error(err.message || 'Failed to submit withdrawal request')
    } finally {
      setIsProcessing(false)
    }
  }

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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Withdraw</h1>
            <p className="mt-1 text-sm text-slate-600">Manage your withdrawals</p>
          </div>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={loading || withdrawData.availableBalance <= 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-amber-400/40 transition-all hover:bg-amber-600 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IoAddOutline className="h-5 w-5" />
            <span className="hidden sm:inline">Withdraw</span>
          </button>
        </div>

        {/* Main Withdrawal Card - Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-100/60 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-600 p-6 sm:p-8 text-white shadow-2xl shadow-amber-500/30">
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-pulse" />
          <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <p className="text-sm font-medium text-white/80 mb-1">Total Withdrawals</p>
                <p className="text-4xl sm:text-5xl font-bold tracking-tight">{loading ? '...' : formatCurrency(withdrawData.totalWithdrawals)}</p>
              </div>
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
                <IoCashOutline className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Available Balance */}
          <div className="group relative overflow-hidden rounded-2xl border border-[rgba(0,119,194,0.2)] bg-gradient-to-br from-[rgba(0,119,194,0.05)] via-white to-[rgba(0,119,194,0.05)] p-6 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-[rgba(0,119,194,0.1)] blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(0,119,194,0.1)]">
                  <IoWalletOutline className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Available Balance</p>
                  <p className="mt-1 text-xs text-slate-500">Ready to withdraw</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{loading ? '...' : formatCurrency(withdrawData.availableBalance)}</p>
            </div>
          </div>

          {/* This Month Withdrawals */}
          <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-100/50 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                  <IoCashOutline className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">This Month</p>
                  <p className="mt-1 text-xs text-slate-500">Withdrawn this month</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{loading ? '...' : formatCurrency(withdrawData.thisMonthWithdrawals)}</p>
            </div>
          </div>
        </div>

        {/* Withdrawal History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Withdrawal History</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {loading ? '...' : withdrawData.withdrawalHistory.length} {withdrawData.withdrawalHistory.length === 1 ? 'withdrawal' : 'withdrawals'}
            </span>
          </div>
          <div className="space-y-3">
            {withdrawData.withdrawalHistory.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <IoCashOutline className="mx-auto h-16 w-16 text-slate-300" />
                <p className="mt-4 text-base font-semibold text-slate-600">No withdrawals found</p>
                <p className="mt-1 text-sm text-slate-500">Your withdrawal history will appear here</p>
              </div>
            ) : (
              withdrawData.withdrawalHistory.map((withdrawal) => (
                <article
                  key={withdrawal.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100 shadow-sm">
                      <IoCashOutline className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {withdrawal.description}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {withdrawal.paymentMethod === 'Bank Account' && withdrawal.accountNumber && (
                              <span className="flex items-center gap-1">
                                <IoCardOutline className="h-3.5 w-3.5" />
                                {withdrawal.accountNumber}
                              </span>
                            )}
                            {withdrawal.paymentMethod === 'UPI' && withdrawal.upiId && (
                              <span className="flex items-center gap-1">
                                <IoPhonePortraitOutline className="h-3.5 w-3.5" />
                                {withdrawal.upiId}
                              </span>
                            )}
                            {withdrawal.paymentMethod === 'Wallet' && withdrawal.walletNumber && (
                              <span className="flex items-center gap-1">
                                <IoWalletOutline className="h-3.5 w-3.5" />
                                {withdrawal.walletNumber}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <IoCalendarOutline className="h-3.5 w-3.5" />
                              {formatDateTime(withdrawal.date)}
                            </span>
                          </div>
                          <div className="mt-2.5">
                            {withdrawal.status === 'pending' && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                                <IoTimeOutline className="h-3.5 w-3.5" />
                                Pending Review
                              </div>
                            )}
                            {withdrawal.status === 'approved' && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(0,119,194,0.1)] px-2.5 py-1 text-xs font-medium text-primary border border-[rgba(0,119,194,0.2)]">
                                <IoCheckmarkCircleOutline className="h-3.5 w-3.5" />
                                Approved
                              </div>
                            )}
                            {withdrawal.status === 'rejected' && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200">
                                <IoCloseOutline className="h-3.5 w-3.5" />
                                Rejected
                              </div>
                            )}
                            {(withdrawal.status === 'completed' || withdrawal.status === 'paid') && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                                <IoCheckmarkCircleOutline className="h-3.5 w-3.5" />
                                Paid
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end">
                          <p className="text-xl font-bold text-amber-600">
                            -{formatCurrency(withdrawal.amount)}
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
          {!loading && withdrawData.withdrawalHistory.length > 0 && totalPages > 1 && (
            <div className="pt-4 border-t border-slate-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                loading={loading}
              />
            </div>
          )}
        </section>
      </section>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 px-0 sm:px-4 py-0 sm:py-6 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowWithdrawModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between border-b border-slate-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Withdraw Money</h2>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 active:scale-95"
              >
                <IoCloseOutline className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Available Balance */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 sm:p-5">
                <p className="text-xs sm:text-sm font-medium text-slate-600">Available Balance</p>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
                  {loading ? '...' : formatCurrency(withdrawData.availableBalance)}
                </p>
              </div>

              {/* Amount Input */}
              <div>
                <label className="mb-2 block text-xs sm:text-sm font-semibold text-slate-900">Withdraw Amount</label>
                <div className="relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-base sm:text-lg font-semibold text-slate-500">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={withdrawAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty string or valid number format (including decimals)
                      // Let user type freely without any restrictions
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setWithdrawAmount(value)
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim()

                      // If empty, keep it empty
                      if (value === '') {
                        return
                      }

                      const numValue = parseFloat(value)

                      // If invalid number, clear it
                      if (isNaN(numValue) || numValue <= 0) {
                        setWithdrawAmount('')
                        return
                      }

                      // Only round if it has more than 2 decimal places
                      // Don't change the value if it's already valid
                      const roundedValue = Math.round(numValue * 100) / 100

                      // Only update if the value actually needs rounding (more than 2 decimals)
                      if (roundedValue !== numValue) {
                        // Format to remove unnecessary trailing zeros
                        const formatted = roundedValue % 1 === 0
                          ? roundedValue.toString()
                          : roundedValue.toFixed(2).replace(/\.?0+$/, '')
                        setWithdrawAmount(formatted)
                      }
                    }}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 pl-9 sm:pl-10 text-base sm:text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                {withdrawAmount && parseFloat(withdrawAmount) > withdrawData.availableBalance && (
                  <p className="mt-1.5 sm:mt-2 text-xs text-red-600">Amount exceeds available balance</p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-semibold text-slate-900">Payment Method</label>
                <div className="space-y-2">
                  {/* Bank Account Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('bank')}
                    className={`w-full flex items-center gap-2 sm:gap-3 rounded-xl border-2 p-3 sm:p-4 transition-all active:scale-[0.98] ${selectedPaymentMethod === 'bank'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                  >
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                      <IoCardOutline className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">Bank Account</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">Transfer to bank account</p>
                    </div>
                    {selectedPaymentMethod === 'bank' && (
                      <IoCheckmarkCircleOutline className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-amber-600" />
                    )}
                  </button>

                  {/* UPI Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('upi')}
                    className={`w-full flex items-center gap-2 sm:gap-3 rounded-xl border-2 p-3 sm:p-4 transition-all active:scale-[0.98] ${selectedPaymentMethod === 'upi'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                  >
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(0,119,194,0.15)]">
                      <IoPhonePortraitOutline className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">UPI</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">Pay via UPI ID</p>
                    </div>
                    {selectedPaymentMethod === 'upi' && (
                      <IoCheckmarkCircleOutline className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-amber-600" />
                    )}
                  </button>

                  {/* Cash Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('cash')}
                    className={`w-full flex items-center gap-2 sm:gap-3 rounded-xl border-2 p-3 sm:p-4 transition-all active:scale-[0.98] ${selectedPaymentMethod === 'cash'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                  >
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                      <IoCashOutline className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">Cash</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">Receive payment in cash</p>
                    </div>
                    {selectedPaymentMethod === 'cash' && (
                      <IoCheckmarkCircleOutline className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-amber-600" />
                    )}
                  </button>
                </div>

                {/* Payment Method Details Input */}
                {selectedPaymentMethod === 'bank' && (
                  <div className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] sm:text-xs font-semibold text-slate-700">Account Holder Name</label>
                      <input
                        type="text"
                        value={bankDetails.accountHolderName}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                        placeholder="Enter account holder name"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] sm:text-xs font-semibold text-slate-700">Account Number</label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                        placeholder="Enter account number"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] sm:text-xs font-semibold text-slate-700">IFSC Code</label>
                      <input
                        type="text"
                        value={bankDetails.ifscCode}
                        onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                        placeholder="Enter IFSC code"
                        maxLength={11}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                )}

                {selectedPaymentMethod === 'upi' && (
                  <div className="mt-3 sm:mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <label className="mb-1.5 block text-[11px] sm:text-xs font-semibold text-slate-700">UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <p className="mt-1.5 text-[10px] sm:text-xs text-slate-500">Enter your UPI ID (e.g., yourname@paytm)</p>
                  </div>
                )}

                {selectedPaymentMethod === 'cash' && (
                  <div className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] sm:text-xs font-semibold text-slate-700">Receiver Name</label>
                      <input
                        type="text"
                        value={bankDetails.accountHolderName}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                        placeholder="Name of person collecting cash"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] sm:text-xs font-semibold text-slate-700">Notes (Optional)</label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                        placeholder="Any specific instructions/address"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Info Message */}
              <div className="rounded-xl border border-[rgba(0,119,194,0.3)] bg-[rgba(0,119,194,0.1)]/50 p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs font-medium text-[#004c86] leading-relaxed">
                  <span className="font-semibold">Note:</span> Your withdrawal request will be sent to admin for review. You will receive a notification once the status is updated.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 sm:py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={
                  isProcessing ||
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) <= 0 ||
                  parseFloat(withdrawAmount) > withdrawData.availableBalance
                }
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 sm:py-3 text-sm font-semibold text-white shadow-sm shadow-amber-400/40 transition hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="hidden sm:inline">Processing...</span>
                    <span className="sm:hidden">Processing</span>
                  </>
                ) : (
                  <>
                    <IoCheckmarkCircleOutline className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Confirm Withdrawal</span>
                    <span className="sm:hidden">Confirm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default WalletWithdraw

