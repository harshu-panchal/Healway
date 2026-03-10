import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { forgotPassword } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'
import { IoMailOutline, IoArrowForwardOutline, IoArrowBackOutline } from 'react-icons/io5'
import healwayLogo from '../../../assets/logo/healway-logo.png'

const AdminForgotPassword = () => {
    const navigate = useNavigate()
    const toast = useToast()
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleEmailChange = (e) => {
        setEmail(e.target.value)
        if (error) setError('')
    }

    const validateEmail = () => {
        if (!email) {
            setError('Email is required')
            return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email')
            return false
        }
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validateEmail()) return

        setIsSubmitting(true)
        try {
            const response = await forgotPassword(email)
            toast.success(response.message || 'OTP sent to your email.')
            // Store email for verify OTP step
            sessionStorage.setItem('adminResetEmail', email)
            navigate('/admin/verify-otp')
        } catch (err) {
            console.error('Forgot password error:', err)
            setError(err.message || 'Failed to send OTP. Please try again.')
            toast.error(err.message || 'Failed to send OTP. Please try again.')
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
                            Forgot Password
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Enter your registered email address to receive a 6-digit verification code.
                        </p>
                    </div>

                    <motion.form
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-4 bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100"
                        onSubmit={handleSubmit}
                    >
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                                    <IoMailOutline className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    required
                                    placeholder="admin@healway.com"
                                    className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''
                                        }`}
                                />
                            </div>
                            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-[var(--color-primary-dark)] active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? 'Sending...' : (
                                <>
                                    <span>Send OTP</span>
                                    <IoArrowForwardOutline className="h-5 w-5" />
                                </>
                            )}
                        </button>

                        <Link
                            to="/admin/login"
                            className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            <IoArrowBackOutline className="h-4 w-4" />
                            Back to Login
                        </Link>
                    </motion.form>
                </div>
            </main>
        </div>
    )
}

export default AdminForgotPassword
