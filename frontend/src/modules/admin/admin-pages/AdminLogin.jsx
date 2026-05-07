import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { loginAdmin, storeAdminTokens } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'
import { getAuthToken } from '../../../utils/apiClient'
import {
  IoEyeOffOutline,
  IoEyeOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoArrowForwardOutline,
} from 'react-icons/io5'
import healwayLogo from '../../../assets/logo/healway-logo.png'

const AdminLogin = () => {
  const navigate = useNavigate()
  const toast = useToast()

  // Login state
  const [loginData, setLoginData] = useState({
    email: localStorage.getItem('rememberedAdminEmail') || '',
    password: '',
    remember: localStorage.getItem('adminRememberMe') !== 'false'
  })
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginErrors, setLoginErrors] = useState({})

  // Check if user is already authenticated - redirect to dashboard
  const token = getAuthToken('admin')
  if (token) {
    return <Navigate to="/admin/dashboard" replace />
  }

  // Login handlers
  const handleLoginChange = (event) => {
    const { name, value, type, checked } = event.target
    setLoginData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (loginErrors[name]) {
      setLoginErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateLogin = () => {
    const newErrors = {}
    if (!loginData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    if (!loginData.password) {
      newErrors.password = 'Password is required'
    } else if (loginData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    setLoginErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    if (!validateLogin()) return

    setIsLoggingIn(true)
    try {
      const response = await loginAdmin({
        email: loginData.email,
        password: loginData.password,
      })

      // The API response structure is { success: true, data: { tokens, admin }, message: '...' }
      // but we handle both direct and nested structure for robustness
      const result = response.data || response

      // Store tokens and profile
      if (result?.tokens) {
        storeAdminTokens(result.tokens, loginData.remember)

        // Handle Remember Me logic
        if (loginData.remember) {
          localStorage.setItem('rememberedAdminEmail', loginData.email)
          localStorage.setItem('adminRememberMe', 'true')
        } else {
          localStorage.removeItem('rememberedAdminEmail')
          localStorage.setItem('adminRememberMe', 'false')
        }

        // Store admin profile
        if (result.admin) {
          const storage = loginData.remember ? localStorage : sessionStorage
          storage.setItem('adminProfile', JSON.stringify(result.admin))
        }

        toast.success('Login successful! Redirecting...')
        setLoginData(prev => ({
          ...prev,
          password: '',
        }))
        
        // Navigation will be handled by the useEffect or Navigate component at the top
        // But we still call navigate here as a backup
        navigate('/admin/dashboard', { replace: true })
      } else {
        throw new Error('Invalid response from server: Missing tokens')
      }
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error.message || 'An error occurred. Please try again.'
      toast.error(errorMessage)
      setLoginErrors({ submit: errorMessage })
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-y-auto">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-[rgba(0,119,194,0.08)] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[rgba(0,119,194,0.06)] blur-3xl" />
      </div>

      {/* Main Content - Centered on mobile */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-4 sm:px-6 sm:py-6 min-h-screen">
        {/* Form Section - Centered with max width */}
        <div className="w-full max-w-md mx-auto">
          {/* Logo and Title */}
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
              Welcome Back
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sign in to your admin account to continue.
            </p>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col gap-4 bg-white p-6 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100"
            onSubmit={handleLoginSubmit}
          >
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                  <IoMailOutline className="h-5 w-5" aria-hidden="true" />
                </span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  autoComplete="email"
                  required
                  placeholder="admin@healway.com"
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 ${loginErrors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                    : ''
                    }`}
                />
              </div>
              {loginErrors.email && (
                <p className="text-xs text-red-600 mt-1">{loginErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                  <IoLockClosedOutline className="h-5 w-5" aria-hidden="true" />
                </span>
                <input
                  id="login-password"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginData.password}
                  onChange={handleLoginChange}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 ${loginErrors.password
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                    : ''
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? (
                    <IoEyeOffOutline className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <IoEyeOutline className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {loginErrors.password && (
                <p className="text-xs text-red-600 mt-1">{loginErrors.password}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between mt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  name="remember"
                  checked={loginData.remember}
                  onChange={handleLoginChange}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary transition-colors cursor-pointer"
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/admin/forgot-password')}
                className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Error */}
            {loginErrors.submit && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600"
              >
                {loginErrors.submit}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-[var(--color-primary-dark)] hover:shadow-primary/30 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <IoArrowForwardOutline className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </>
              )}
            </button>
          </motion.form>
        </div>
      </main>
    </div>
  )
}

export default AdminLogin
