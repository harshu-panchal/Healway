import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IoArrowForwardOutline,
  IoCallOutline,
  IoLocationOutline,
  IoPersonOutline,
  IoCalendarClearOutline,
  IoMailOutline,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import {
  requestLoginOtp as requestOtp,
  loginPatient,
  signupPatient,
  storePatientTokens,
} from '../patient-services/patientService'
import { registerFCMToken } from '../../../services/pushNotificationService'

const initialSignupState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  termsAccepted: false,
}

const PatientLogin = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [mode, setMode] = useState('login')
  const [loginData, setLoginData] = useState({ phone: '', otp: '', remember: true })
  const [signupData, setSignupData] = useState(initialSignupState)

  // OTP flow states
  const [otpSent, setOtpSent] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  // Signup form states
  const [signupOtpSent, setSignupOtpSent] = useState(false)
  const [signupOtpTimer, setSignupOtpTimer] = useState(0)
  const [signupOtp, setSignupOtp] = useState('')
  const signupOtpInputRefs = useRef([])

  // OTP input refs
  const otpInputRefs = useRef([])

  const isLogin = mode === 'login'

  useEffect(() => {
    const restoreMode = location.state?.restoreAuthView?.mode
    if (restoreMode === 'signup' || restoreMode === 'login') {
      setMode(restoreMode)
    }
  }, [location.state])

  // OTP timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpTimer])

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setIsSubmitting(false)
    setOtpSent(false)
    setOtpTimer(0)
    setSignupOtpSent(false)
    setSignupOtpTimer(0)
    setSignupOtp('')
    setSignupData(initialSignupState)
    setLoginData({ phone: '', otp: '', remember: true })
  }

  // Signup OTP timer countdown
  useEffect(() => {
    if (signupOtpTimer > 0) {
      const timer = setTimeout(() => setSignupOtpTimer(signupOtpTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [signupOtpTimer])

  const handleLoginChange = (event) => {
    const { name, value, type, checked } = event.target
    // Restrict phone to 10 digits only
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10)
      setLoginData((prev) => ({
        ...prev,
        [name]: numericValue,
      }))
      return
    }
    setLoginData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const otpArray = (loginData.otp || '').split('').slice(0, 6)
    otpArray[index] = value.slice(-1) // Take only last character
    const newOtp = otpArray.join('').padEnd(6, ' ').slice(0, 6).replace(/\s/g, '')

    setLoginData({
      ...loginData,
      otp: newOtp,
    })

    // Auto-focus next input
    if (value && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus()
    }
  }

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      setLoginData({
        ...loginData,
        otp: pastedData,
      })
      // Focus last input
      if (otpInputRefs.current[5]) {
        otpInputRefs.current[5].focus()
      }
    }
  }

  // Handle OTP key down (backspace navigation)
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  // Send OTP function
  const handleSendOtp = async () => {
    if (!loginData.phone || loginData.phone.length < 10) {
      toast.error('Please enter a valid mobile number')
      return
    }

    setIsSendingOtp(true)

    try {
      await requestOtp(loginData.phone)
      setOtpSent(true)
      setOtpTimer(60) // 60 seconds timer
      toast.success('OTP sent to your mobile number')
    } catch (error) {
      console.error('Send OTP error:', error)
      toast.error(error.message || 'Failed to send OTP. Please try again.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Resend OTP function
  const handleResendOtp = () => {
    setOtpTimer(0)
    setOtpSent(false)
    setLoginData({ ...loginData, otp: '' })
    handleSendOtp()
  }

  const handleSignupChange = (event) => {
    const { name, value, type, checked } = event.target

    if (name === 'termsAccepted') {
      setSignupData((prev) => ({
        ...prev,
        termsAccepted: checked,
      }))
      return
    }

    // Restrict phone to 10 digits only
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10)
      setSignupData((prev) => ({
        ...prev,
        phone: numericValue,
      }))
      return
    }

    // Limit name fields
    if (name === 'firstName' || name === 'lastName') {
      const trimmedValue = value.trim().slice(0, 50)
      setSignupData((prev) => ({
        ...prev,
        [name]: trimmedValue,
      }))
      return
    }

    // Limit email
    if (name === 'email') {
      const trimmedValue = value.trim().slice(0, 100)
      setSignupData((prev) => ({
        ...prev,
        [name]: trimmedValue,
      }))
      return
    }

    setSignupData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Handle signup OTP input change
  const handleSignupOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const otpArray = (signupOtp || '').split('').slice(0, 6)
    otpArray[index] = value.slice(-1) // Take only last character
    const newOtp = otpArray.join('').padEnd(6, ' ').slice(0, 6).replace(/\s/g, '')

    setSignupOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5 && signupOtpInputRefs.current[index + 1]) {
      signupOtpInputRefs.current[index + 1].focus()
    }
  }

  // Handle signup OTP paste
  const handleSignupOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pastedData.length === 6) {
      setSignupOtp(pastedData)
      // Focus last input
      if (signupOtpInputRefs.current[5]) {
        signupOtpInputRefs.current[5].focus()
      }
    }
  }

  // Handle signup OTP key down (backspace navigation)
  const handleSignupOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      signupOtpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting || isSendingOtp) return

    // If OTP not sent, send it first
    if (!otpSent) {
      await handleSendOtp()
      return
    }

    // Verify OTP
    if (!loginData.otp || loginData.otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await loginPatient({
        phone: loginData.phone,
        otp: loginData.otp,
      })

      if (response && response.tokens) {
        storePatientTokens(response.tokens, loginData.remember)
        toast.success('Login successful! Redirecting...')
        // Register FCM token after login (fire-and-forget)
        registerFCMToken('patient', true).catch(() => { })
        navigate('/patient/dashboard', { replace: true })
      } else {
        toast.error('Login failed. Please try again.')
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error.message || 'An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleSignupSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    // If OTP not sent, create account and send OTP
    if (!signupOtpSent) {
      if (!signupData.termsAccepted) {
        toast.error('Please accept the terms to continue.')
        return
      }

      // Validate required fields
      if (!signupData.firstName || !signupData.email || !signupData.phone) {
        toast.error('Please fill in all required fields')
        return
      }

      // Validate firstName
      if (signupData.firstName.trim().length < 2) {
        toast.error('First name must be at least 2 characters')
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(signupData.email.trim())) {
        toast.error('Please enter a valid email address')
        return
      }

      // Validate phone
      if (signupData.phone.length !== 10) {
        toast.error('Please enter a valid 10-digit mobile number')
        return
      }

      setIsSubmitting(true)

      try {
        const response = await signupPatient({
          firstName: signupData.firstName,
          lastName: signupData.lastName || '',
          email: signupData.email,
          phone: signupData.phone,
        })

        if (response) {
          setSignupOtpSent(true)
          setSignupOtpTimer(60) // 60 seconds timer
          toast.success('Account created! OTP sent to your mobile number')
          setIsSubmitting(false)
        } else {
          toast.error('Signup failed. Please try again.')
          setIsSubmitting(false)
        }
      } catch (error) {
        console.error('Signup error:', error)
        toast.error(error.message || 'An error occurred. Please try again.')
        setIsSubmitting(false)
      }
      return
    }

    // Verify OTP and complete signup
    if (!signupOtp || signupOtp.length !== 6) {
      toast.error('Please enter the 6-digit OTP')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await loginPatient({
        phone: signupData.phone,
        otp: signupOtp,
      })

      if (response && response.tokens) {
        storePatientTokens(response.tokens, true)
        toast.success('Account verified successfully! Redirecting...')
        // Register FCM token after signup (fire-and-forget)
        registerFCMToken('patient', true).catch(() => { })
        navigate('/patient/dashboard', { replace: true })
      } else {
        toast.error('OTP verification failed. Please try again.')
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      toast.error(error.message || 'An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  // Resend signup OTP
  const handleResendSignupOtp = async () => {
    setSignupOtpTimer(0)
    setSignupOtpSent(false)
    setSignupOtp('')

    try {
      await requestOtp(signupData.phone)
      setSignupOtpSent(true)
      setSignupOtpTimer(60)
      toast.success('OTP resent to your mobile number')
    } catch (error) {
      console.error('Resend OTP error:', error)
      toast.error(error.message || 'Failed to resend OTP. Please try again.')
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 opacity-40">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-[rgba(0,119,194,0.08)] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[rgba(0,119,194,0.06)] blur-3xl" />
      </div>

      {/* Main Content - Centered on mobile */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        {/* Form Section - Centered with max width */}
        <div className="w-full max-w-md mx-auto">
          {/* Title */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Your Account'}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isLogin
                ? 'Sign in to access your appointments, prescriptions, and personalized care.'
                : 'Join Healway to manage your health journey with ease.'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mb-8 flex items-center justify-center">
            <div className="relative flex items-center gap-1 rounded-2xl bg-slate-100 p-1.5 shadow-inner w-full max-w-xs">
              {/* Sliding background indicator */}
              <motion.div
                layoutId="patientLoginSignupToggle"
                className="absolute rounded-xl bg-primary shadow-md shadow-[#0077C2]/15"
                style={{
                  left: isLogin ? '0.375rem' : 'calc(50% + 0.1875rem)',
                  width: 'calc(50% - 0.5625rem)',
                  height: 'calc(100% - 0.75rem)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
              />
              <motion.button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`relative z-10 flex-1 rounded-xl py-2.5 text-sm font-semibold text-center sm:py-3 sm:text-base ${isLogin
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                Sign In
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handleModeChange('signup')}
                className={`relative z-10 flex-1 rounded-xl py-2.5 text-sm font-semibold text-center sm:py-3 sm:text-base ${!isLogin
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                Sign Up
              </motion.button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex flex-col gap-5 sm:gap-6"
                onSubmit={handleLoginSubmit}
              >
                {/* Mobile Number Input */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="login-phone" className="text-sm font-semibold text-slate-700">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoCallOutline className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <input
                      id="login-phone"
                      name="phone"
                      type="tel"
                      value={loginData.phone}
                      onChange={handleLoginChange}
                      autoComplete="tel"
                      required
                      placeholder="9876543210"
                      maxLength={10}
                      inputMode="numeric"
                      disabled={otpSent}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-base text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                      style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                    />
                  </div>
                </div>

                {/* OTP Input Section - Show after OTP is sent */}
                {otpSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-1.5"
                  >
                    <label className="text-sm font-semibold text-slate-700">
                      Enter OTP
                    </label>
                    <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          ref={(el) => (otpInputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={loginData.otp[index] || ''}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-12 h-12 text-center text-lg font-semibold rounded-xl border-2 border-slate-200 bg-white text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                          style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {otpTimer > 0 ? (
                          `Resend OTP in ${otpTimer}s`
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            className="font-semibold text-primary hover:text-primary-dark transition"
                          >
                            Resend OTP
                          </button>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false)
                          setOtpTimer(0)
                          setLoginData({ ...loginData, otp: '' })
                        }}
                        className="font-semibold text-primary hover:text-primary-dark transition"
                      >
                        Change Number
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Remember me checkbox */}
                <div className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={loginData.remember}
                      onChange={handleLoginChange}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    Remember me
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isSendingOtp}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-md shadow-[rgba(0,119,194,0.25)] transition hover:bg-[var(--color-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ boxShadow: '0 4px 6px -1px rgba(0, 119, 194, 0.25)' }}
                >
                  {isSubmitting ? (
                    otpSent ? 'Verifying...' : 'Sending OTP...'
                  ) : isSendingOtp ? (
                    'Sending OTP...'
                  ) : otpSent ? (
                    <>
                      Verify OTP
                      <IoArrowForwardOutline className="h-5 w-5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Send OTP
                      <IoArrowForwardOutline className="h-5 w-5" aria-hidden="true" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-slate-600">
                  New to Healway?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeChange('signup')}
                    className="font-semibold text-primary hover:text-primary-dark transition"
                  >
                    Create an account
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex flex-col gap-5 sm:gap-6"
                onSubmit={handleSignupSubmit}
              >
                {/* Basic Information Form - Show if OTP not sent */}
                {!signupOtpSent && (
                  <>
                    <section className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="signup-firstName" className="text-sm font-semibold text-slate-700">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                            <IoPersonOutline className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <input
                            id="signup-firstName"
                            name="firstName"
                            type="text"
                            value={signupData.firstName}
                            onChange={handleSignupChange}
                            required
                            placeholder="Jane"
                            maxLength={50}
                            minLength={2}
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="signup-lastName" className="text-sm font-semibold text-slate-700">
                          Last Name
                        </label>
                        <input
                          id="signup-lastName"
                          name="lastName"
                          type="text"
                          value={signupData.lastName}
                          onChange={handleSignupChange}
                          placeholder="Doe"
                          maxLength={50}
                          disabled={isSubmitting}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                          style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label htmlFor="signup-email" className="text-sm font-semibold text-slate-700">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                            <IoMailOutline className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <input
                            id="signup-email"
                            name="email"
                            type="email"
                            value={signupData.email}
                            onChange={handleSignupChange}
                            autoComplete="email"
                            required
                            placeholder="you@example.com"
                            maxLength={100}
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label htmlFor="signup-phone" className="text-sm font-semibold text-slate-700">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                            <IoCallOutline className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <input
                            id="signup-phone"
                            name="phone"
                            type="tel"
                            value={signupData.phone}
                            onChange={handleSignupChange}
                            autoComplete="tel"
                            required
                            placeholder="9876543210"
                            maxLength={10}
                            inputMode="numeric"
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-base text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          />
                        </div>
                      </div>
                    </section>

                    <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="termsAccepted"
                        checked={signupData.termsAccepted}
                        onChange={handleSignupChange}
                        disabled={isSubmitting}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
                      />
                      <span>
                        I have read and agree to Healway's{' '}
                        <Link
                          to="/terms"
                          state={{ fromPath: location.pathname, restoreAuthView: { mode: 'signup' } }}
                          className="font-semibold text-primary hover:text-primary-dark"
                        >
                          terms of service
                        </Link>{' '}
                        and{' '}
                        <Link
                          to="/privacy"
                          state={{ fromPath: location.pathname, restoreAuthView: { mode: 'signup' } }}
                          className="font-semibold text-primary hover:text-primary-dark"
                        >
                          privacy policy
                        </Link>
                        .
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSubmitting || !signupData.termsAccepted}
                      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-md shadow-[rgba(0,119,194,0.25)] transition hover:bg-[var(--color-primary-dark)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                      style={{ boxShadow: '0 4px 6px -1px rgba(0, 119, 194, 0.25)' }}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create Account & Send OTP
                          <IoArrowForwardOutline className="h-5 w-5" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* OTP Verification - Show after OTP is sent */}
                {signupOtpSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-5"
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Verify Your Mobile Number</h3>
                      <p className="text-sm text-slate-600">
                        We've sent a 6-digit OTP to <span className="font-semibold text-slate-900">{signupData.phone}</span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-slate-700 text-center">
                        Enter OTP
                      </label>
                      <div className="flex gap-2 justify-center" onPaste={handleSignupOtpPaste}>
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <input
                            key={index}
                            ref={(el) => {
                              signupOtpInputRefs.current[index] = el
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={signupOtp[index] || ''}
                            onChange={(e) => handleSignupOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleSignupOtpKeyDown(index, e)}
                            disabled={isSubmitting}
                            className="w-12 h-12 text-center text-lg font-semibold rounded-xl border-2 border-slate-200 bg-white text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">
                          {signupOtpTimer > 0 ? (
                            `Resend OTP in ${signupOtpTimer}s`
                          ) : (
                            <button
                              type="button"
                              onClick={handleResendSignupOtp}
                              disabled={isSubmitting}
                              className="font-semibold text-primary hover:text-primary-dark transition disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Resend OTP
                            </button>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSignupOtpSent(false)
                            setSignupOtpTimer(0)
                            setSignupOtp('')
                          }}
                          disabled={isSubmitting}
                          className="font-semibold text-primary hover:text-primary-dark transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Change Number
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || signupOtp.length !== 6}
                      className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-md shadow-[rgba(0,119,194,0.25)] transition hover:bg-[var(--color-primary-dark)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                      style={{ boxShadow: '0 4px 6px -1px rgba(0, 119, 194, 0.25)' }}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify & Complete Signup
                          <IoArrowForwardOutline className="h-5 w-5" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                <p className="text-center text-sm text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeChange('login')}
                    className="font-semibold text-primary hover:text-primary-dark transition"
                  >
                    Sign in instead
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-100 bg-white/95 backdrop-blur mt-auto">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-4 text-center text-xs text-slate-500">
          <span>Secure patient access powered by Healway</span>
          <span>
            Need help? Contact your{' '}
            <Link to="/patient/support" className="font-semibold text-primary hover:text-primary-dark transition">
              care coordinator
            </Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default PatientLogin

