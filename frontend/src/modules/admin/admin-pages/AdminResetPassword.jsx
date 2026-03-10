import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { resetPassword } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'
import { IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline, IoArrowForwardOutline } from 'react-icons/io5'
import healwayLogo from '../../../assets/logo/healway-logo.png'

const AdminResetPassword = () => {
    const navigate = useNavigate()
    const toast = useToast()
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        new: false,
        confirm: false
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState({})

    const email = sessionStorage.getItem('adminResetEmail')
    const resetToken = sessionStorage.getItem('adminResetToken')

    if (!email || !resetToken) {
        navigate('/admin/forgot-password')
        return null
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setPasswords(prev => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validate = () => {
        const newErrors = {}
        if (passwords.newPassword.length < 8) {
            newErrors.newPassword = 'Password must be at least 8 characters'
        }
        // Match the backend complexity if possible, or at least basics
        if (!/[A-Z]/.test(passwords.newPassword)) {
            newErrors.newPassword = 'Must contain at least one uppercase letter'
        }
        if (!/[0-9]/.test(passwords.newPassword)) {
            newErrors.newPassword = 'Must contain at least one number'
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setIsSubmitting(true)
        try {
            await resetPassword({
                email,
                resetToken,
                newPassword: passwords.newPassword,
                confirmPassword: passwords.confirmPassword
            })
            toast.success('Password reset successfully. Please login.')
            sessionStorage.removeItem('adminResetEmail')
            sessionStorage.removeItem('adminResetToken')
            navigate('/admin/login')
        } catch (err) {
            console.error('Reset password error:', err)
            toast.error(err.message || 'Failed to reset password. Please try again.')
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
                            Reset Password
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Create a strong new password for your account.
                        </p>
                    </div>

                    <motion.form
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-4 bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100"
                        onSubmit={handleSubmit}
                    >
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="newPassword" h className="text-sm font-semibold text-slate-700">
                                New Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                                    <IoLockClosedOutline className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type={showPasswords.new ? 'text' : 'password'}
                                    value={passwords.newPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 ${errors.newPassword ? 'border-red-300' : ''
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPasswords.new ? <IoEyeOffOutline className="h-5 w-5" /> : <IoEyeOutline className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.newPassword && <p className="text-xs text-red-600 mt-1">{errors.newPassword}</p>}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="confirmPassword" h className="text-sm font-semibold text-slate-700">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                                    <IoLockClosedOutline className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={passwords.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 pr-11 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 ${errors.confirmPassword ? 'border-red-300' : ''
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPasswords.confirm ? <IoEyeOffOutline className="h-5 w-5" /> : <IoEyeOutline className="h-5 w-5" />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-[var(--color-primary-dark)] active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? 'Resetting...' : (
                                <>
                                    <span>Reset Password</span>
                                    <IoArrowForwardOutline className="h-5 w-5" />
                                </>
                            )}
                        </button>
                    </motion.form>
                </div>
            </main>
        </div>
    )
}

export default AdminResetPassword
