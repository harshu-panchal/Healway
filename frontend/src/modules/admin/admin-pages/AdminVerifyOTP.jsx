import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { verifyPasswordOtp, forgotPassword } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'
import { IoArrowForwardOutline, IoArrowBackOutline, IoShieldCheckmarkOutline } from 'react-icons/io5'
import healwayLogo from '../../../assets/logo/healway-logo.png'

const AdminVerifyOTP = () => {
    const navigate = useNavigate()
    const toast = useToast()
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [timer, setTimer] = useState(60)
    const [canResend, setCanResend] = useState(false)
    const inputRefs = useRef([])
    const email = sessionStorage.getItem('adminResetEmail')

    useEffect(() => {
        if (!email) {
            navigate('/admin/forgot-password')
            return
        }

        let interval
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1)
            }, 1000)
        } else {
            setCanResend(true)
        }
        return () => clearInterval(interval)
    }, [timer, email, navigate])

    const handleChange = (index, value) => {
        if (isNaN(value)) return
        const newOtp = [...otp]
        newOtp[index] = value.substring(value.length - 1)
        setOtp(newOtp)

        // Move to next input
        if (value && index < 5) {
            inputRefs.current[index + 1].focus()
        }
    }

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus()
        }
    }

    const handlePaste = (e) => {
        const data = e.clipboardData.getData('text').slice(0, 6).split('')
        if (data.length === 6) {
            setOtp(data)
            inputRefs.current[5].focus()
        }
    }

    const handleResend = async () => {
        if (!canResend) return
        try {
            await forgotPassword(email)
            toast.success('New OTP sent to your email.')
            setTimer(60)
            setCanResend(false)
            setOtp(['', '', '', '', '', ''])
            inputRefs.current[0].focus()
        } catch (err) {
            toast.error(err.message || 'Failed to resend OTP.')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const otpString = otp.join('')
        if (otpString.length !== 6) {
            toast.error('Please enter complete 6-digit OTP')
            return
        }

        setIsSubmitting(true)
        try {
            const response = await verifyPasswordOtp({ email, otp: otpString })
            toast.success(response.message || 'OTP verified successfully.')
            // Store reset token for the final step
            sessionStorage.setItem('adminResetToken', response.data.resetToken)
            navigate('/admin/reset-password')
        } catch (err) {
            console.error('OTP verification error:', err)
            toast.error(err.message || 'Invalid OTP. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-y-auto">
            <div className="absolute inset-0 -z-10 opacity-40">
                <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-[rgba(0,119,194,0.08)] blur-3xl" />
                <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[rgba(0,119,194,0.06)] blur-3xl" />
            </div>

            <main className="flex flex-1 flex-col items-center justify-center px-4 py-4 sm:px-6 sm:py-6 min-h-screen">
                <div className="w-full max-w-md mx-auto">
                    <div className="mb-6 text-center">
                        <div className="mb-4 flex justify-center">
                            <img
                                src={healwayLogo}
                                alt="Healway"
                                className="h-12 w-auto object-contain"
                                loading="lazy"
                            />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">
                            Verify OTP
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{email}</span>
                        </p>
                    </div>

                    <motion.form
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-6 bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100"
                        onSubmit={handleSubmit}
                    >
                        <div className="flex justify-center items-center gap-2 sm:gap-4 flex-nowrap" onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength="1"
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-center text-lg sm:text-xl font-bold bg-slate-50 border-2 border-slate-200 rounded-lg sm:rounded-xl outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-[var(--color-primary-dark)] active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? 'Verifying...' : (
                                <>
                                    <span>Verify OTP</span>
                                    <IoShieldCheckmarkOutline className="h-5 w-5" />
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <p className="text-sm text-slate-600 mb-2">
                                Didn't receive the code?
                            </p>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={!canResend}
                                className={`text-sm font-bold ${canResend ? 'text-primary hover:text-primary-dark' : 'text-slate-400 cursor-not-allowed'}`}
                            >
                                {canResend ? 'Resend OTP' : `Resend in ${timer}s`}
                            </button>
                        </div>

                        <Link
                            to="/admin/forgot-password"
                            className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            <IoArrowBackOutline className="h-4 w-4" />
                            Change Email
                        </Link>
                    </motion.form>
                </div>
            </main>
        </div>
    )
}

export default AdminVerifyOTP
