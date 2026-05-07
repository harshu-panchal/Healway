import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    IoArrowBackOutline,
    IoPrintOutline,
    IoShareSocialOutline,
    IoCheckmarkCircle,
    IoCloseCircle,
    IoTime,
    IoWallet,
    IoCard,
    IoDocumentTextOutline,
    IoPersonOutline,
    IoBusinessOutline,
    IoCalendarOutline,
    IoInformationCircleOutline,
} from 'react-icons/io5'
import { getPatientTransactionById } from '../patient-services/patientService'
import { useToast } from '../../../contexts/ToastContext'
import PageLoader from '../../../components/PageLoader'

const PatientTransactionDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()
    const [transaction, setTransaction] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTransaction = async () => {
            try {
                setLoading(true)
                const response = await getPatientTransactionById(id)

                if (response && response.success && response.data) {
                    setTransaction(response.data)
                } else {
                    toast.error('Transaction not found')
                    navigate('/patient/transactions')
                }
            } catch (error) {
                console.error('Error fetching transaction details:', error)
                toast.error('Failed to load transaction details')
            } finally {
                setLoading(false)
            }
        }

        fetchTransaction()
    }, [id, navigate, toast])

    if (loading) return <PageLoader />
    if (!transaction) return null

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
        }).format(amount)
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    }

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const isRefund = transaction.type === 'refund'
    const status = transaction.status || 'completed'

    return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                >
                    <IoArrowBackOutline className="h-5 w-5" />
                </button>
                <h1 className="text-lg font-bold text-slate-900">Transaction Details</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                    >
                        <IoPrintOutline className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Hero Receipt Card */}
            <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50">
                <div className={`h-2 w-full ${isRefund ? 'bg-emerald-500' : 'bg-primary'}`}></div>

                <div className="p-8 flex flex-col items-center text-center">
                    <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-3xl ${isRefund ? 'bg-emerald-50 text-emerald-500' : 'bg-primary/10 text-primary shadow-inner'}`}>
                        {isRefund ? (
                            <IoWallet className="h-10 w-10" />
                        ) : (
                            <IoCard className="h-10 w-10" />
                        )}
                    </div>

                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                        {isRefund ? 'Refund Credited' : 'Payment Debited'}
                    </p>
                    <h2 className={`text-4xl font-black tracking-tight ${isRefund ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isRefund ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </h2>

                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold ${status === 'completed' || status === 'paid' || status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                            {status === 'completed' || status === 'paid' || status === 'confirmed' ? (
                                <IoCheckmarkCircle className="h-4 w-4" />
                            ) : status === 'failed' ? (
                                <IoCloseCircle className="h-4 w-4" />
                            ) : (
                                <IoTime className="h-4 w-4" />
                            )}
                            {status.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600">
                            <IoDocumentTextOutline className="h-4 w-4" />
                            {transaction.category?.toUpperCase() || 'GENERAL'}
                        </span>
                    </div>
                </div>

                {/* Separator with circles */}
                <div className="relative h-px border-t border-dashed border-slate-200 mx-8">
                    <div className="absolute left-0 top-1/2 -ml-11 -mt-3.5 h-7 w-7 rounded-full bg-slate-50 border border-slate-200"></div>
                    <div className="absolute right-0 top-1/2 -mr-11 -mt-3.5 h-7 w-7 rounded-full bg-slate-50 border border-slate-200"></div>
                </div>

                {/* Details Table */}
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                <IoPersonOutline /> Recipient / Payee
                            </p>
                            <p className="text-sm font-bold text-slate-900">
                                {transaction.appointmentId?.doctorId?.firstName ? (
                                    `Dr. ${transaction.appointmentId.doctorId.firstName} ${transaction.appointmentId.doctorId.lastName}`
                                ) : (
                                    transaction.description || 'Healway Healthcare'
                                )}
                            </p>
                        </div>
                        <div className="space-y-1 sm:text-right">
                            <p className="flex items-center gap-2 sm:justify-end text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                <IoCalendarOutline /> Date & Time
                            </p>
                            <p className="text-sm font-bold text-slate-900">
                                {formatDate(transaction.createdAt)}, {formatTime(transaction.createdAt)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                <IoBusinessOutline /> Method
                            </p>
                            <p className="text-sm font-bold text-slate-900 capitalize">
                                {transaction.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : transaction.paymentMethod || 'Wallet Balance'}
                            </p>
                        </div>
                        <div className="space-y-1 sm:text-right">
                            <p className="flex items-center gap-2 sm:justify-end text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                <IoInformationCircleOutline /> Reference ID
                            </p>
                            <p className="text-[11px] font-mono font-medium text-slate-500 break-all">
                                {transaction.transactionId || transaction._id}
                            </p>
                        </div>
                    </div>

                    {transaction.appointmentId && (
                        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linked Appointment</p>
                                <button
                                    onClick={() => navigate('/patient/appointments')}
                                    className="text-[10px] font-bold text-primary hover:underline"
                                >
                                    View Appointment
                                </button>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Service</span>
                                    <span className="font-bold text-slate-800">
                                        {transaction.appointmentId.consultationMode || 'Consultation'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Date</span>
                                    <span className="font-bold text-slate-800">
                                        {formatDate(transaction.appointmentId.appointmentDate)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer info */}
                <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                    <p className="text-[10px] font-medium text-slate-400">
                        This is a computer generated receipt for Healway Healthcare services.
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-1">
                        <IoCheckmarkCircle className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600">Verified by Gateway</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PatientTransactionDetail
