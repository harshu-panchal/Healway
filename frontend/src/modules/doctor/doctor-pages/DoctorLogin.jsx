import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IoEyeOffOutline,
  IoEyeOutline,
  IoMailOutline,
  IoImageOutline,
  IoLockClosedOutline,
  IoArrowForwardOutline,
  IoCallOutline,
  IoPersonOutline,
  IoLocationOutline,
  IoBriefcaseOutline,
  IoMedicalOutline,
  IoSchoolOutline,
  IoLanguageOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoVideocamOutline,
  IoCloseOutline,
  IoAddOutline,
  IoSearchOutline,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import { getAuthToken } from '../../../utils/apiClient'
import {
  requestLoginOtp as requestDoctorOtp,
  loginDoctor,
  signupDoctor,
  storeDoctorTokens,
  getSpecialties,
  getServices,
  getStates,
  getCitiesByState,
  requestPatientLoginOtp,
  loginPatientFromDoctor,
  signupPatientFromDoctor,
  storePatientTokensFromDoctor,
} from '../doctor-services/doctorService'
import { registerFCMToken } from '../../../services/pushNotificationService'

// Helper to get initial login state based on role and saved "remember me" values
const getInitialLoginStateForRole = (role) => {
  if (role === 'patient') {
    return {
      phone: typeof window !== 'undefined' ? (localStorage.getItem('rememberedPatientPhone') || '') : '',
      otp: '',
      remember:
        typeof window !== 'undefined'
          ? localStorage.getItem('patientRememberMe') !== 'false'
          : true,
    }
  }

  return {
    phone: typeof window !== 'undefined' ? (localStorage.getItem('rememberedDoctorPhone') || '') : '',
    otp: '',
    remember:
      typeof window !== 'undefined'
        ? localStorage.getItem('doctorRememberMe') !== 'false'
        : true,
  }
}

const OTP_LENGTH = 4

const DoctorLogin = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // If already authenticated, skip the unified login page (unless explicitly forced)
  useEffect(() => {
    const forceLogin = new URLSearchParams(location.search).get('force') === '1'
    if (forceLogin) return

    const doctorToken = getAuthToken('doctor')
    const patientToken = getAuthToken('patient')
    const adminToken = getAuthToken('admin')

    if (doctorToken) return navigate('/doctor/dashboard', { replace: true })
    if (patientToken) return navigate('/patient/dashboard', { replace: true })
    if (adminToken) return navigate('/admin/dashboard', { replace: true })
  }, [location.search, navigate])

  const [mode, setMode] = useState(() => localStorage.getItem('doctorAuthMode') || 'login') // 'login' | 'signup'
  const [userRole, setUserRole] = useState(() => 'patient') // 'doctor' | 'patient'

  // OTP-based login data states (shared for both doctor/patient roles)
  const [doctorLoginData, setDoctorLoginData] = useState(() =>
    getInitialLoginStateForRole('patient')
  )


  // OTP flow states
  const [otpSent, setOtpSent] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  // Signup step state
  const [signupStep, setSignupStep] = useState(() => Number(localStorage.getItem('doctorSignupStep')) || 1)
  const totalSignupSteps = 3


  // Refs for indicator
  const doctorButtonRef = useRef(null)

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // OTP input refs
  const otpInputRefs = useRef([])

  // Specialization dropdown state (for doctor)
  const [showSpecializationDropdown, setShowSpecializationDropdown] = useState(false)
  const [specializationSearchTerm, setSpecializationSearchTerm] = useState('')
  const [availableSpecializations, setAvailableSpecializations] = useState([])
  const specializationInputRef = useRef(null)

  // Location states
  const [statesList, setStatesList] = useState([])
  const [citiesList, setCitiesList] = useState([])
  const specializationDropdownRef = useRef(null)

  // Services multi-select state
  const [availableServices, setAvailableServices] = useState([])
  const [showServicesDropdown, setShowServicesDropdown] = useState(false)
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')
  const servicesDropdownRef = useRef(null)



  // Doctor signup state
  const initialDoctorSignupState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    gender: '',
    licenseNumber: '',
    experienceYears: '',
    qualification: '',
    bio: '',
    consultationFee: '',
    languages: [],
    services: [],
    consultationModes: [],
    education: [{ institution: '', degree: '', year: '' }],
    clinicDetails: {
      name: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
    },
    documents: [],
    clinicImages: [], // Array for clinic/hospital images
    termsAccepted: false,
    isDoctor: true,
  }
  const [doctorSignupData, setDoctorSignupData] = useState(() => {
    const saved = localStorage.getItem('doctorSignupData')
    return saved ? JSON.parse(saved) : initialDoctorSignupState
  })

  // Patient signup state
  const initialPatientSignupState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    termsAccepted: false,
  }
  const [patientSignupData, setPatientSignupData] = useState(() => {
    const saved = localStorage.getItem('patientSignupData')
    return saved ? JSON.parse(saved) : initialPatientSignupState
  })

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('doctorAuthMode', mode)
  }, [mode])

  useEffect(() => {
    localStorage.setItem('doctorSignupStep', signupStep)
  }, [signupStep])

  useEffect(() => {
    localStorage.setItem('doctorSignupData', JSON.stringify(doctorSignupData))
  }, [doctorSignupData])

  useEffect(() => {
    localStorage.setItem('patientSignupData', JSON.stringify(patientSignupData))
  }, [patientSignupData])

  const clearAuthSession = () => {
    localStorage.removeItem('doctorAuthMode')
    localStorage.removeItem('doctorSignupStep')
    localStorage.removeItem('doctorSignupData')
    localStorage.removeItem('patientSignupData')
  }

  const isLogin = mode === 'login'

  useEffect(() => {
    const restoreAuthView = location.state?.restoreAuthView
    if (!restoreAuthView) return

    if (restoreAuthView.mode === 'signup' || restoreAuthView.mode === 'login') {
      setMode(restoreAuthView.mode)
    }

    if (restoreAuthView.userRole === 'doctor' || restoreAuthView.userRole === 'patient') {
      setUserRole(restoreAuthView.userRole)
    }

    if (typeof restoreAuthView.signupStep === 'number' && restoreAuthView.signupStep >= 1 && restoreAuthView.signupStep <= totalSignupSteps) {
      setSignupStep(restoreAuthView.signupStep)
    }
  }, [location.state, totalSignupSteps])

  // Get current login data
  const getCurrentLoginData = () => {
    return doctorLoginData
  }

  const setCurrentLoginData = (data) => {
    setDoctorLoginData(data)
  }

  // OTP timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpTimer])

  // Update indicator position and width
  useEffect(() => {
    const updateIndicatorPosition = () => {
      const container = doctorButtonRef.current?.parentElement
      if (!container) return

      const activeButton = doctorButtonRef.current
      if (!activeButton) return

      const containerRect = container.getBoundingClientRect()
      const buttonRect = activeButton.getBoundingClientRect()

      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      })
    }

    const timeoutId = setTimeout(() => {
      requestAnimationFrame(updateIndicatorPosition)
    }, 0)

    window.addEventListener('resize', updateIndicatorPosition)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateIndicatorPosition)
    }
  }, [])



  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setIsSubmitting(false)
    setOtpSent(false)
    setOtpTimer(0)
    setSignupStep(1)
  }

  const handleRoleChange = (role) => {
    setUserRole(role)
    // Reset states when switching roles
    setOtpSent(false)
    setOtpTimer(0)
    setIsSubmitting(false)
    setSignupStep(1)
    setDoctorLoginData(getInitialLoginStateForRole(role))
  }

  // Fetch specialties, services and states on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [specialtiesRes, servicesRes, statesRes] = await Promise.all([
          getSpecialties(),
          getServices(),
          getStates()
        ])
        if (specialtiesRes) {
          setAvailableSpecializations(specialtiesRes.map(s => s.name))
        }
        if (servicesRes) {
          setAvailableServices(servicesRes.map(s => s.name))
        }
        if (statesRes) {
          setStatesList(statesRes || [])
        }
      } catch (error) {
        console.error('Error fetching signup data:', error)
      }
    }
    fetchData()
  }, [])

  // Fetch cities when state changes
  useEffect(() => {
    const fetchCities = async () => {
      if (doctorSignupData.clinicDetails.address.state) {
        const selectedState = statesList.find(s => s.name === doctorSignupData.clinicDetails.address.state)
        if (selectedState) {
          try {
            const cities = await getCitiesByState(selectedState._id)
            setCitiesList(cities || [])
          } catch (error) {
            console.error('Failed to fetch cities:', error)
          }
        }
      } else {
        setCitiesList([])
      }
    }
    fetchCities()
  }, [doctorSignupData.clinicDetails.address.state, statesList])

  // Filtered specializations for dropdown
  const filteredSpecializations = useMemo(() => {
    const term = specializationSearchTerm.toLowerCase()
    return availableSpecializations.filter(s =>
      s.toLowerCase().includes(term)
    )
  }, [availableSpecializations, specializationSearchTerm])

  // Filtered services for dropdown
  const filteredServices = useMemo(() => {
    const term = serviceSearchTerm.toLowerCase()
    return availableServices.filter(s =>
      s.toLowerCase().includes(term) && !doctorSignupData.services.includes(s)
    )
  }, [availableServices, serviceSearchTerm, doctorSignupData.services])

  // Get current signup data
  const getCurrentSignupData = () => {
    return doctorSignupData
  }

  // Handle next step in signup
  const handleNextStep = () => {
    const currentData = getCurrentSignupData()
    if (!currentData) return

    // Validate current step before proceeding
    if (signupStep === 1) {
      if (!currentData.firstName || !currentData.email || !currentData.phone) {
        toast.error('Please fill in all required fields in Step 1')
        return
      }
    }

    if (signupStep < totalSignupSteps) {
      setSignupStep(signupStep + 1)
    }
  }

  // Handle previous step in signup
  const handlePreviousStep = () => {
    if (signupStep > 1) {
      setSignupStep(signupStep - 1)
    }
  }

  const handleLoginChange = (event) => {
    const { name, value, type, checked } = event.target
    const currentData = getCurrentLoginData()
    // Restrict phone to 10 digits only
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10)
      setCurrentLoginData({
        ...currentData,
        [name]: numericValue,
      })
      return
    }
    setCurrentLoginData({
      ...currentData,
      [name]: type === 'checkbox' ? checked : value,
    })
  }

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // Only allow digits

    const currentData = getCurrentLoginData()
    const otpArray = (currentData.otp || '').split('').slice(0, OTP_LENGTH)
    otpArray[index] = value.slice(-1) // Take only last character
    const newOtp = otpArray.join('').padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).replace(/\s/g, '')

    setCurrentLoginData({
      ...currentData,
      otp: newOtp,
    })

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus()
    }
  }

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pastedData.length === OTP_LENGTH) {
      const currentData = getCurrentLoginData()
      setCurrentLoginData({
        ...currentData,
        otp: pastedData,
      })
      // Focus last input
      if (otpInputRefs.current[OTP_LENGTH - 1]) {
        otpInputRefs.current[OTP_LENGTH - 1].focus()
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
    const loginData = getCurrentLoginData()

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = loginData.phone.replace(/\D/g, '')

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Please enter a valid mobile number')
      return
    }

    setIsSendingOtp(true)

    try {
      // Call the appropriate OTP endpoint based on role
      const response = userRole === 'patient'
        ? await requestPatientLoginOtp(cleanPhone)
        : await requestDoctorOtp(cleanPhone)

      console.log(response);
      if (response && response.success) {
        setOtpSent(true)
        setOtpTimer(60) // 60 seconds timer
        // Update phone in state with cleaned version
        setCurrentLoginData({ ...loginData, phone: cleanPhone })
        toast.success('OTP sent to your mobile number')
      } else {
        toast.error(response?.message || 'Failed to send OTP. Please try again.')
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Resend OTP function
  const handleResendOtp = () => {
    setOtpTimer(0)
    setOtpSent(false)
    const currentData = getCurrentLoginData()
    setCurrentLoginData({ ...currentData, otp: '' })
    handleSendOtp()
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting || isSendingOtp) return

    const loginData = getCurrentLoginData()

    // If OTP not sent, send it first
    if (!otpSent) {
      await handleSendOtp()
      return
    }

    // Verify OTP
    if (!loginData.otp || loginData.otp.length !== OTP_LENGTH) {
      toast.error('Please enter the 4-digit OTP')
      return
    }

    setIsSubmitting(true)

    try {
      if (userRole === 'patient') {
        // Patient login flow
        const response = await loginPatientFromDoctor({ phone: loginData.phone, otp: loginData.otp })

        if (response && response.tokens) {
          storePatientTokensFromDoctor(response.tokens, loginData.remember)

          // Handle Remember Me logic
          if (loginData.remember) {
            localStorage.setItem('rememberedPatientPhone', loginData.phone)
            localStorage.setItem('patientRememberMe', 'true')
          } else {
            localStorage.removeItem('rememberedPatientPhone')
            localStorage.setItem('patientRememberMe', 'false')
          }
        }

        if (response) {
          toast.success('Welcome back! Redirecting to patient dashboard...')
          // Register FCM token after patient login (fire-and-forget)
          registerFCMToken('patient', true).catch(() => { })
          setCurrentLoginData({
            phone: loginData.remember ? loginData.phone : '',
            otp: '',
            remember: loginData.remember
          })
          setOtpSent(false)
          setOtpTimer(0)
          setIsSubmitting(false)
          clearAuthSession()
          navigate('/patient/dashboard', { replace: true })
        } else {
          toast.error(response?.message || 'Login failed. Please try again.')
          setIsSubmitting(false)
        }
      } else {
        // Doctor login flow (existing)
        const response = await loginDoctor({ phone: loginData.phone, otp: loginData.otp })

        if (response && response.tokens) {
          storeDoctorTokens(response.tokens, loginData.remember)

          // Handle Remember Me logic
          if (loginData.remember) {
            localStorage.setItem('rememberedDoctorPhone', loginData.phone)
            localStorage.setItem('doctorRememberMe', 'true')
          } else {
            localStorage.removeItem('rememberedDoctorPhone')
            localStorage.setItem('doctorRememberMe', 'false')
          }
        }

        if (response) {
          toast.success(`Welcome back! Redirecting to doctor dashboard...`)
          // Register FCM token after doctor login (fire-and-forget)
          registerFCMToken('doctor', true).catch(() => { })
          setCurrentLoginData({
            phone: loginData.remember ? loginData.phone : '',
            otp: '',
            remember: loginData.remember
          })
          setOtpSent(false)
          setOtpTimer(0)
          setIsSubmitting(false)
          clearAuthSession()
          navigate('/doctor/dashboard', { replace: true })
        } else {
          toast.error(response?.message || 'Login failed. Please try again.')
          setIsSubmitting(false)
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      if (error.message && error.message.includes('approval')) {
        toast.error(error.message)
      } else {
        toast.error(error.message || 'An error occurred. Please try again.')
      }
      setIsSubmitting(false)
    }
  }

  // Patient signup change handler
  const handlePatientSignupChange = (event) => {
    const { name, value, type, checked } = event.target
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10)
      setPatientSignupData((prev) => ({ ...prev, [name]: numericValue }))
      return
    }
    setPatientSignupData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Patient signup submit handler
  const handlePatientSignupSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    if (!patientSignupData.termsAccepted) {
      toast.error('Please accept the terms to continue.')
      return
    }

    if (!patientSignupData.firstName || !patientSignupData.email || !patientSignupData.phone) {
      toast.error('Please fill in all required fields.')
      return
    }

    if (patientSignupData.firstName.trim().length < 2) {
      toast.error('First name must be at least 2 characters')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(patientSignupData.email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    if (patientSignupData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        firstName: patientSignupData.firstName,
        lastName: patientSignupData.lastName || '',
        email: patientSignupData.email,
        phone: patientSignupData.phone,
      }

      const response = await signupPatientFromDoctor(payload)

      if (response) {
        toast.success('Account created successfully! Please login with OTP to continue.')
        clearAuthSession()
        setPatientSignupData(initialPatientSignupState)
        setMode('login')
        // Pre-fill phone for convenience
        setDoctorLoginData(prev => ({ ...prev, phone: payload.phone }))
      } else {
        toast.error(response?.message || 'Signup failed. Please try again.')
      }
    } catch (error) {
      console.error('Patient signup error:', error)
      toast.error(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDoctorSignupChange = (event) => {
    const { name, value, type, checked } = event.target

    if (name === 'termsAccepted') {
      setDoctorSignupData((prev) => ({
        ...prev,
        termsAccepted: checked,
      }))
      return
    }

    if (name.startsWith('clinicDetails.address.')) {
      const key = name.split('.')[2]
      setDoctorSignupData((prev) => ({
        ...prev,
        clinicDetails: {
          ...prev.clinicDetails,
          address: {
            ...prev.clinicDetails.address,
            [key]: value,
          },
        },
      }))
      return
    }

    if (name.startsWith('clinicDetails.')) {
      const key = name.split('.')[1]
      setDoctorSignupData((prev) => ({
        ...prev,
        clinicDetails: {
          ...prev.clinicDetails,
          [key]: value,
        },
      }))
      return
    }

    if (name.startsWith('education.')) {
      const parts = name.split('.')
      const index = parseInt(parts[1])
      const field = parts[2]
      setDoctorSignupData((prev) => {
        const newEducation = [...prev.education]
        newEducation[index] = {
          ...newEducation[index],
          [field]: value,
        }
        return {
          ...prev,
          education: newEducation,
        }
      })
      return
    }

    if (name === 'consultationModes') {
      setDoctorSignupData((prev) => {
        const modes = prev.consultationModes || []
        if (checked && !modes.includes(value)) {
          return { ...prev, consultationModes: [...modes, value] }
        } else if (!checked && modes.includes(value)) {
          return { ...prev, consultationModes: modes.filter((m) => m !== value) }
        }
        return prev
      })
      return
    }

    if (name === 'languages') {
      const langValue = value.trim()
      if (langValue && !doctorSignupData.languages.includes(langValue)) {
        setDoctorSignupData((prev) => ({
          ...prev,
          languages: [...prev.languages, langValue],
        }))
      }
      return
    }

    // Handle specialization with dropdown
    if (name === 'specialization') {
      setDoctorSignupData((prev) => ({
        ...prev,
        specialization: value,
      }))
      // Update search term to match what user is typing
      setSpecializationSearchTerm(value)
      // Show dropdown if there's a search term or if specializations are available
      if (value.trim() || availableSpecializations.length > 0) {
        setShowSpecializationDropdown(true)
      } else {
        setShowSpecializationDropdown(false)
      }
      return
    }

    // Restrict phone to 10 digits only
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10)
      setDoctorSignupData((prev) => ({
        ...prev,
        [name]: numericValue,
      }))
      return
    }

    // Handle consultationFee - preserve exact value as string to avoid precision loss
    if (name === 'consultationFee') {
      // Remove any non-numeric characters except decimal point
      const cleanedValue = value.replace(/[^\d.]/g, '')
      // Ensure only one decimal point
      const parts = cleanedValue.split('.')
      const finalValue = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0]
      setDoctorSignupData((prev) => ({
        ...prev,
        [name]: finalValue,
      }))
      return
    }

    setDoctorSignupData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const addEducationEntry = () => {
    setDoctorSignupData((prev) => ({
      ...prev,
      education: [...prev.education, { institution: '', degree: '', year: '' }],
    }))
  }

  const removeEducationEntry = (index) => {
    setDoctorSignupData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
  }

  const removeLanguage = (lang) => {
    setDoctorSignupData((prev) => ({
      ...prev,
      languages: prev.languages.filter((l) => l !== lang),
    }))
  }

  const removeService = (service) => {
    setDoctorSignupData((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s !== service),
    }))
  }

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (specializationDropdownRef.current && !specializationDropdownRef.current.contains(event.target) &&
        specializationInputRef.current && !specializationInputRef.current.contains(event.target)) {
        setShowSpecializationDropdown(false)
      }
      if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target)) {
        setShowServicesDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Document upload helper functions
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve({
        name: file.name,
        data: reader.result,
        type: file.type
      })
      reader.onerror = reject
    })
  }

  const handleDocumentUpload = async (event, userType) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Validate files
    const maxSize = 5 * 1024 * 1024 // 5MB
    const maxFiles = 10

    for (const file of files) {
      // Check file type
      if (file.type !== 'application/pdf') {
        toast.error(`${file.name} is not a PDF file. Only PDF files are allowed.`)
        continue
      }

      // Check file size
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum file size is 5MB.`)
        continue
      }
    }

    // Check total files limit
    let currentDocsCount = 0
    if (userType === 'doctor') currentDocsCount = doctorSignupData.documents.length


    if (currentDocsCount + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} documents allowed. Please remove some documents first.`)
      return
    }

    // Convert files to base64
    try {
      const base64Files = await Promise.all(files.map(convertFileToBase64))

      if (userType === 'doctor') {
        setDoctorSignupData((prev) => ({
          ...prev,
          documents: [...prev.documents, ...base64Files]
        }))
      }
    } catch (error) {
      console.error('Error converting files to base64:', error)
      toast.error('Failed to process files. Please try again.')
    }

    // Reset input
    event.target.value = ''
  }

  const removeDocument = (index, userType) => {
    if (userType === 'doctor') {
      setDoctorSignupData((prev) => ({
        ...prev,
        documents: prev.documents.filter((_, i) => i !== index)
      }))
    }
  }

  // Clinic images upload handlers
  const handleClinicImagesUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    // Validate files
    const maxSize = 5 * 1024 * 1024 // 5MB
    const maxFiles = 5

    // Check total files limit
    if (doctorSignupData.clinicImages.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} clinic images allowed.`)
      return
    }

    // Validate each file
    for (const file of files) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file. Only images are allowed.`)
        continue
      }

      // Check file size
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum file size is 5MB.`)
        continue
      }
    }

    // Convert files to base64
    try {
      const base64Files = await Promise.all(files.map(convertFileToBase64))

      setDoctorSignupData((prev) => ({
        ...prev,
        clinicImages: [...prev.clinicImages, ...base64Files]
      }))
    } catch (error) {
      console.error('Error converting clinic images to base64:', error)
      toast.error('Failed to process images. Please try again.')
    }

    // Reset input
    event.target.value = ''
  }

  const removeClinicImage = (index) => {
    setDoctorSignupData((prev) => ({
      ...prev,
      clinicImages: prev.clinicImages.filter((_, i) => i !== index)
    }))
  }


  const handleDoctorSignupSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    if (!doctorSignupData.termsAccepted) {
      toast.error('Please accept the terms to continue.')
      return
    }

    if (!doctorSignupData.firstName || !doctorSignupData.email || !doctorSignupData.phone || !doctorSignupData.specialization || !doctorSignupData.gender || !doctorSignupData.licenseNumber) {
      toast.error('Please fill in all required fields.')
      return
    }

    // Validate firstName
    if (doctorSignupData.firstName.trim().length < 2) {
      toast.error('First name must be at least 2 characters')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(doctorSignupData.email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    // Validate phone
    if (doctorSignupData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        firstName: doctorSignupData.firstName,
        lastName: doctorSignupData.lastName || '',
        email: doctorSignupData.email,
        phone: doctorSignupData.phone,
        specialization: doctorSignupData.specialization,
        gender: doctorSignupData.gender,
        licenseNumber: doctorSignupData.licenseNumber,
        experienceYears: doctorSignupData.experienceYears ? Number(doctorSignupData.experienceYears) : undefined,
        qualification: doctorSignupData.qualification || undefined,
        bio: doctorSignupData.bio || undefined,
        consultationFee: doctorSignupData.consultationFee && doctorSignupData.consultationFee !== ''
          ? (() => {
            const feeStr = String(doctorSignupData.consultationFee).trim()
            const feeNum = parseFloat(feeStr)
            console.log('💰 Frontend Fee Conversion:', {
              original: doctorSignupData.consultationFee,
              string: feeStr,
              parsed: feeNum,
              isValid: !isNaN(feeNum) && isFinite(feeNum)
            })
            return !isNaN(feeNum) && isFinite(feeNum) ? feeNum : undefined
          })()
          : undefined,
        languages: doctorSignupData.languages.length > 0 ? doctorSignupData.languages : undefined,
        services: doctorSignupData.services.length > 0 ? doctorSignupData.services : undefined,
        consultationModes: doctorSignupData.consultationModes.length > 0 ? doctorSignupData.consultationModes : undefined,
        isDoctor: doctorSignupData.isDoctor,
        education: doctorSignupData.education.filter((edu) => edu.institution || edu.degree || edu.year).length > 0
          ? doctorSignupData.education.filter((edu) => edu.institution || edu.degree || edu.year)
          : undefined,
        clinicName: doctorSignupData.clinicDetails.name || undefined,
        clinicAddress: Object.values(doctorSignupData.clinicDetails.address).some((val) => val)
          ? doctorSignupData.clinicDetails.address
          : undefined,
        clinicImages: doctorSignupData.clinicImages.length > 0 ? doctorSignupData.clinicImages : undefined,
        documents: doctorSignupData.documents.length > 0 ? doctorSignupData.documents : undefined,
      }

      const response = await signupDoctor(payload)

      if (response) {
        toast.success('Registration submitted successfully! Please wait for admin approval.')
        clearAuthSession()
        setDoctorSignupData(initialDoctorSignupState)
        setSignupStep(1)
        setIsSubmitting(false)
        setMode('login')
      } else {
        toast.error(response.message || 'Signup failed. Please try again.')
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Signup error:', error)
      toast.error(error.message || 'An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-linear-to-br from-slate-50 via-white to-slate-50">
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
                ? `Sign in to your ${userRole} account to continue.`
                : `Join Healway as a ${userRole} to get started.`}
            </p>
          </div>

          {/* Login/Signup Mode Toggle */}
          <div className="mb-6 flex items-center justify-center">
            <div className="relative flex items-center gap-1 rounded-2xl bg-slate-100 p-1.5 shadow-inner w-full max-w-xs">
              {/* Sliding background indicator */}
              <motion.div
                layoutId="loginSignupToggle"
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

          {/* Role Toggle (Doctor / Patient) */}
          <div className="mb-6 flex items-center justify-center">
            <div className="relative flex items-center gap-1 rounded-2xl bg-slate-100 p-1.5 shadow-inner w-full max-w-xs">
              {/* Sliding background indicator */}
              <motion.div
                className="absolute rounded-xl bg-emerald-600 shadow-md shadow-emerald-600/15"
                style={{
                  left: userRole === 'patient' ? '0.375rem' : 'calc(50% + 0.1875rem)',
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
                onClick={() => handleRoleChange('patient')}
                className={`relative z-10 flex-1 rounded-xl py-2 text-sm font-semibold text-center ${userRole === 'patient'
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                🧑 Patient
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handleRoleChange('doctor')}
                className={`relative z-10 flex-1 rounded-xl py-2 text-sm font-semibold text-center ${userRole === 'doctor'
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                🩺 Doctor
              </motion.button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login-doctor"
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
                      value={getCurrentLoginData().phone}
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
                      {Array.from({ length: OTP_LENGTH }, (_, index) => index).map((index) => (
                        <input
                          key={index}
                          ref={(el) => (otpInputRefs.current[index] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={getCurrentLoginData().otp[index] || ''}
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
                          const currentData = getCurrentLoginData()
                          setCurrentLoginData({ ...currentData, otp: '' })
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
                      checked={getCurrentLoginData().remember}
                      onChange={handleLoginChange}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    Remember me
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isSendingOtp}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-md shadow-[rgba(0,119,194,0.25)] transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
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
            ) : userRole === 'patient' ? (
              /* Patient Signup Form */
              <motion.form
                key="signup-patient"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex flex-col gap-5 sm:gap-6"
                onSubmit={handlePatientSignupSubmit}
              >
                <div className="mb-4 pb-4 border-b border-slate-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Patient Registration</h3>
                  <p className="text-xs text-slate-500">Create your patient account to book appointments</p>
                </div>

                <section className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="patient-firstName" className="text-sm font-semibold text-slate-700">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                        <IoPersonOutline className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <input
                        id="patient-firstName"
                        name="firstName"
                        type="text"
                        value={patientSignupData.firstName}
                        onChange={handlePatientSignupChange}
                        required
                        placeholder="John"
                        maxLength={50}
                        minLength={2}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="patient-lastName" className="text-sm font-semibold text-slate-700">
                      Last Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                        <IoPersonOutline className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <input
                        id="patient-lastName"
                        name="lastName"
                        type="text"
                        value={patientSignupData.lastName}
                        onChange={handlePatientSignupChange}
                        placeholder="Doe"
                        maxLength={50}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="patient-email" className="text-sm font-semibold text-slate-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoMailOutline className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <input
                      id="patient-email"
                      name="email"
                      type="email"
                      value={patientSignupData.email}
                      onChange={handlePatientSignupChange}
                      required
                      placeholder="john@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="patient-phone" className="text-sm font-semibold text-slate-700">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoCallOutline className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <input
                      id="patient-phone"
                      name="phone"
                      type="tel"
                      value={patientSignupData.phone}
                      onChange={handlePatientSignupChange}
                      required
                      placeholder="9876543210"
                      maxLength={10}
                      inputMode="numeric"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2 text-sm">
                  <label className="flex items-start gap-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={patientSignupData.termsAccepted}
                      onChange={handlePatientSignupChange}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary mt-0.5"
                    />
                    <span>
                      I agree to the{' '}
                      <Link
                        to="/terms"
                        state={{
                          fromPath: location.pathname,
                          restoreAuthView: { mode: 'signup', userRole: 'patient' },
                        }}
                        className="text-primary hover:underline"
                      >
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link
                        to="/privacy"
                        state={{
                          fromPath: location.pathname,
                          restoreAuthView: { mode: 'signup', userRole: 'patient' },
                        }}
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-md shadow-[rgba(0,119,194,0.25)] transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ boxShadow: '0 4px 6px -1px rgba(0, 119, 194, 0.25)' }}
                >
                  {isSubmitting ? 'Creating Account...' : (
                    <>
                      Create Patient Account
                      <IoArrowForwardOutline className="h-5 w-5" aria-hidden="true" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleModeChange('login')}
                    className="font-semibold text-primary hover:text-primary-dark transition"
                  >
                    Sign in
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.div
                key="signup-doctor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex flex-col gap-5 sm:gap-6"
              >
                {/* Enhanced Step Indicator */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {[1, 2, 3].map((step) => (
                      <div key={step} className="flex items-center">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 shadow-sm ${signupStep === step
                            ? 'bg-primary text-white scale-110 shadow-md shadow-[#0077C2]/30'
                            : signupStep > step
                              ? 'bg-primary text-white'
                              : 'bg-slate-200 text-slate-500'
                            }`}
                        >
                          {signupStep > step ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            step
                          )}
                        </div>
                        {step < 3 && (
                          <div
                            className={`h-1.5 w-12 sm:w-16 rounded-full transition-all duration-300 ${signupStep > step ? 'bg-primary' : 'bg-slate-200'
                              }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Step {signupStep} of {totalSignupSteps}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {signupStep === 1 && 'Basic Information'}
                      {signupStep === 2 && 'Professional Details'}
                      {signupStep === 3 && 'Additional Information'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleDoctorSignupSubmit} className="flex flex-col gap-5 sm:gap-6">
                  {/* Step 1: Basic Information */}
                  {signupStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div className="mb-6 pb-4 border-b border-slate-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Basic Information</h3>
                        <p className="text-xs text-slate-500">Let's start with your essential details</p>
                      </div>
                      {/* Basic Information */}
                      <section className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="firstName" className="text-sm font-semibold text-slate-700">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                              <IoPersonOutline className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <input
                              id="firstName"
                              name="firstName"
                              type="text"
                              value={doctorSignupData.firstName}
                              onChange={handleDoctorSignupChange}
                              required
                              placeholder="John"
                              maxLength={50}
                              minLength={2}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="lastName" className="text-sm font-semibold text-slate-700">
                            Last Name
                          </label>
                          <input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={doctorSignupData.lastName}
                            onChange={handleDoctorSignupChange}
                            placeholder="Doe"
                            maxLength={50}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="doctor-email" className="text-sm font-semibold text-slate-700">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                              <IoMailOutline className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <input
                              id="doctor-email"
                              name="email"
                              type="email"
                              value={doctorSignupData.email}
                              onChange={handleDoctorSignupChange}
                              autoComplete="email"
                              required
                              placeholder="you@example.com"
                              maxLength={100}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="doctor-phone" className="text-sm font-semibold text-slate-700">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                              <IoCallOutline className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <input
                              id="doctor-phone"
                              name="phone"
                              type="tel"
                              value={doctorSignupData.phone}
                              onChange={handleDoctorSignupChange}
                              autoComplete="tel"
                              required
                              placeholder="9876543210"
                              maxLength={10}
                              inputMode="numeric"
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                            />
                          </div>
                        </div>
                      </section>

                    </motion.div>
                  )}

                  {/* Step 2: Professional Information */}
                  {signupStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div className="mb-6 pb-4 border-b border-slate-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Professional Information</h3>
                        <p className="text-xs text-slate-500">Tell us about your professional background</p>
                      </div>
                      {/* Professional Information */}
                      <section className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label htmlFor="specialization" className="text-sm font-semibold text-slate-700">
                            Specialization <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-primary z-10">
                              <IoMedicalOutline className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <input
                              ref={specializationInputRef}
                              id="specialization"
                              name="specialization"
                              type="text"
                              value={doctorSignupData.specialization}
                              onChange={handleDoctorSignupChange}
                              onFocus={() => {
                                if (availableSpecializations.length > 0 || doctorSignupData.specialization.trim()) {
                                  setShowSpecializationDropdown(true)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && showSpecializationDropdown) {
                                  e.preventDefault()
                                  if (filteredSpecializations.length > 0) {
                                    // Select first filtered result
                                    setDoctorSignupData(prev => ({ ...prev, specialization: filteredSpecializations[0] }))
                                    setSpecializationSearchTerm('')
                                    setShowSpecializationDropdown(false)
                                  } else if (specializationSearchTerm.trim()) {
                                    // Use typed value
                                    setDoctorSignupData(prev => ({ ...prev, specialization: specializationSearchTerm.trim() }))
                                    setSpecializationSearchTerm('')
                                    setShowSpecializationDropdown(false)
                                  }
                                } else if (e.key === 'Escape') {
                                  setShowSpecializationDropdown(false)
                                }
                              }}
                              required
                              placeholder="Type or select specialization (e.g., Cardiology, General Medicine)"
                              maxLength={100}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                            />
                            {doctorSignupData.specialization && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDoctorSignupData(prev => ({ ...prev, specialization: '' }))
                                  setSpecializationSearchTerm('')
                                  setShowSpecializationDropdown(false)
                                  setTimeout(() => {
                                    if (specializationInputRef.current) {
                                      specializationInputRef.current.focus()
                                    }
                                  }, 0)
                                }}
                                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 z-10"
                              >
                                <IoCloseOutline className="h-4 w-4" />
                              </button>
                            )}
                            {/* Dropdown */}
                            {showSpecializationDropdown && (
                              <div
                                ref={specializationDropdownRef}
                                className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
                              >
                                {filteredSpecializations.length > 0 ? (
                                  <div className="py-1">
                                    {filteredSpecializations.map((spec, index) => (
                                      <button
                                        key={index}
                                        type="button"
                                        onClick={() => {
                                          setDoctorSignupData(prev => ({ ...prev, specialization: spec }))
                                          setSpecializationSearchTerm(spec)
                                          setShowSpecializationDropdown(false)
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
                                      >
                                        <IoMedicalOutline className="h-4 w-4 shrink-0" />
                                        <span>{spec}</span>
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="px-4 py-3 text-sm text-slate-500">
                                    No matching specializations found. You can type your own.
                                  </div>
                                )}
                                {/* Option to use typed value - show when user has typed something that doesn't match any option */}
                                {doctorSignupData.specialization.trim() &&
                                  !filteredSpecializations.some(s => s.toLowerCase() === doctorSignupData.specialization.trim().toLowerCase()) && (
                                    <div className="border-t border-slate-200">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Value is already set in the input, just close dropdown
                                          setShowSpecializationDropdown(false)
                                        }}
                                        className="w-full px-4 py-2.5 text-left text-sm text-primary hover:bg-primary hover:text-white transition-colors flex items-center gap-2 font-medium"
                                      >
                                        <IoAddOutline className="h-4 w-4 shrink-0" />
                                        <span>Use "{doctorSignupData.specialization.trim()}" (Press Enter or click)</span>
                                      </button>
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Select from list or type your own specialization
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="gender" className="text-sm font-semibold text-slate-700">
                            Gender <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="gender"
                            name="gender"
                            value={doctorSignupData.gender}
                            onChange={handleDoctorSignupChange}
                            required
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          >
                            <option value="">Select gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="licenseNumber" className="text-sm font-semibold text-slate-700">
                            License Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                              <IoDocumentTextOutline className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <input
                              id="licenseNumber"
                              name="licenseNumber"
                              type="text"
                              value={doctorSignupData.licenseNumber}
                              onChange={handleDoctorSignupChange}
                              required
                              placeholder="Enter your medical license number"
                              maxLength={50}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="experienceYears" className="text-sm font-semibold text-slate-700">
                            Experience (Years)
                          </label>
                          <input
                            id="experienceYears"
                            name="experienceYears"
                            type="number"
                            min="0"
                            value={doctorSignupData.experienceYears}
                            onChange={handleDoctorSignupChange}
                            placeholder="5"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label htmlFor="qualification" className="text-sm font-semibold text-slate-700">
                            Qualification
                          </label>
                          <input
                            id="qualification"
                            name="qualification"
                            value={doctorSignupData.qualification}
                            onChange={handleDoctorSignupChange}
                            placeholder="MBBS, MD, etc."
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label htmlFor="bio" className="text-sm font-semibold text-slate-700">
                            Bio
                          </label>
                          <textarea
                            id="bio"
                            name="bio"
                            value={doctorSignupData.bio}
                            onChange={handleDoctorSignupChange}
                            rows="3"
                            placeholder="Tell us about your professional background..."
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          />
                        </div>

                        {/* Services Multi-select */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Services Provided
                          </label>
                          <div className="relative" ref={servicesDropdownRef}>
                            <div
                              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm flex flex-wrap gap-2 cursor-text transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                              onClick={() => setShowServicesDropdown(true)}
                            >
                              {doctorSignupData.services.map((service, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                                >
                                  {service}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeService(service)
                                    }}
                                    className="hover:text-primary-dark"
                                  >
                                    <IoCloseOutline className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                              ))}
                              <input
                                type="text"
                                value={serviceSearchTerm}
                                onChange={(e) => {
                                  setServiceSearchTerm(e.target.value)
                                  setShowServicesDropdown(true)
                                }}
                                onFocus={() => setShowServicesDropdown(true)}
                                placeholder={doctorSignupData.services.length === 0 ? "Select services (e.g., General Checkup, Root Canal)" : ""}
                                className="flex-1 min-w-[120px] bg-transparent outline-none text-slate-900"
                              />
                            </div>

                            <AnimatePresence>
                              {showServicesDropdown && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
                                >
                                  {filteredServices.length > 0 ? (
                                    <div className="py-1">
                                      {filteredServices.map((service, index) => (
                                        <button
                                          key={index}
                                          type="button"
                                          onClick={() => {
                                            if (!doctorSignupData.services.includes(service)) {
                                              setDoctorSignupData(prev => ({
                                                ...prev,
                                                services: [...prev.services, service]
                                              }))
                                            }
                                            setServiceSearchTerm('')
                                          }}
                                          className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
                                        >
                                          <IoBriefcaseOutline className="h-4 w-4 shrink-0" />
                                          <span>{service}</span>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="px-4 py-3 text-sm text-slate-500">
                                      {serviceSearchTerm ? "No matching services found." : "Start typing to search services..."}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <p className="text-xs text-slate-500">
                            Search and select multiple medical services you provide
                          </p>
                        </div>

                        {/* isDoctor Toggle */}
                        <div className="flex items-center justify-between gap-3 sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div className="flex flex-col gap-0.5">
                            <label className="text-sm font-bold text-slate-800">
                              Practicing Doctor?
                            </label>
                            <p className="text-xs text-slate-500">
                              Disable if you are not currently taking consultations
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDoctorSignupData(prev => ({ ...prev, isDoctor: !prev.isDoctor }))}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${doctorSignupData.isDoctor ? 'bg-primary' : 'bg-slate-200'}`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${doctorSignupData.isDoctor ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                          </button>
                        </div>

                        {doctorSignupData.isDoctor && (
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="consultationFee" className="text-sm font-semibold text-slate-700">
                              Consultation Fee (₹)
                            </label>
                            <input
                              id="consultationFee"
                              name="consultationFee"
                              type="number"
                              min="0"
                              step="1"
                              value={doctorSignupData.consultationFee}
                              onChange={handleDoctorSignupChange}
                              placeholder="500"
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                            />
                          </div>
                        )}
                      </section>

                      {/* Consultation Modes */}
                      {doctorSignupData.isDoctor && (
                        <section>
                          <label className="text-sm font-semibold text-slate-700 mb-2 block">
                            Consultation Modes
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100 transition">
                              <input
                                type="checkbox"
                                name="consultationModes"
                                value="in_person"
                                checked={doctorSignupData.consultationModes.includes('in_person')}
                                onChange={handleDoctorSignupChange}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <IoPersonOutline className="h-5 w-5 text-slate-600" />
                              <span className="text-sm text-slate-700 capitalize">In Person</span>
                            </label>
                            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100 transition">
                              <input
                                type="checkbox"
                                name="consultationModes"
                                value="voice_call"
                                checked={doctorSignupData.consultationModes.includes('voice_call')}
                                onChange={handleDoctorSignupChange}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <IoCallOutline className="h-5 w-5 text-slate-600" />
                              <span className="text-sm text-slate-700 capitalize">Voice Call</span>
                            </label>
                            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 cursor-pointer hover:bg-slate-100 transition">
                              <input
                                type="checkbox"
                                name="consultationModes"
                                value="video_call"
                                checked={doctorSignupData.consultationModes.includes('video_call')}
                                onChange={handleDoctorSignupChange}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <IoVideocamOutline className="h-5 w-5 text-slate-600" />
                              <span className="text-sm text-slate-700 capitalize">Video Call</span>
                            </label>
                          </div>
                        </section>
                      )}

                      {/* Languages */}
                      <section>
                        <label htmlFor="languages" className="text-sm font-semibold text-slate-700 mb-2 block">
                          Languages Spoken
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {doctorSignupData.languages.map((lang, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
                            >
                              {lang}
                              <button
                                type="button"
                                onClick={() => removeLanguage(lang)}
                                className="hover:text-slate-200"
                                aria-label={`Remove ${lang}`}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                            <IoLanguageOutline className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <input
                            id="languages"
                            name="languages"
                            type="text"
                            placeholder="Enter language and press Enter"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleDoctorSignupChange({ target: { name: 'languages', value: e.target.value } })
                                e.target.value = ''
                              }
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                          />
                        </div>
                      </section>

                      {/* Education */}
                      <section>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Education
                          </label>
                          <button
                            type="button"
                            onClick={addEducationEntry}
                            className="text-xs font-semibold text-primary hover:text-primary-dark transition"
                          >
                            + Add Education
                          </button>
                        </div>
                        <div className="space-y-3">
                          {doctorSignupData.education.map((edu, index) => (
                            <div key={index} className="grid gap-3 sm:gap-4 sm:grid-cols-3 p-3 rounded-xl bg-slate-50">
                              <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                                  <IoSchoolOutline className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <input
                                  name={`education.${index}.institution`}
                                  value={edu.institution}
                                  onChange={handleDoctorSignupChange}
                                  placeholder="Institution"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                                />
                              </div>
                              <input
                                name={`education.${index}.degree`}
                                value={edu.degree}
                                onChange={handleDoctorSignupChange}
                                placeholder="Degree"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                              />
                              <div className="flex gap-2">
                                <input
                                  name={`education.${index}.year`}
                                  type="number"
                                  value={edu.year}
                                  onChange={handleDoctorSignupChange}
                                  placeholder="Year"
                                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                                />
                                {doctorSignupData.education.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeEducationEntry(index)}
                                    className="px-3 text-red-500 hover:text-red-700 transition"
                                    aria-label="Remove education entry"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {/* Step 3: Clinic Details & Terms */}
                  {signupStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div className="mb-6 pb-4 border-b border-slate-200">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Hospital Details</h3>
                        <p className="text-xs text-slate-500">Tell us about your clinic or practice</p>
                      </div>
                      {/* Clinic Details */}
                      <section>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <IoLocationOutline className="h-5 w-5 text-primary" />
                          Hospital Details
                        </h3>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="clinicDetails.name" className="text-sm font-semibold text-slate-700">
                              Hospital Name
                            </label>
                            <input
                              id="clinicDetails.name"
                              name="clinicDetails.name"
                              value={doctorSignupData.clinicDetails.name}
                              onChange={handleDoctorSignupChange}
                              placeholder="ABC Medical Clinic"
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                            />
                          </div>
                          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                              <label htmlFor="clinicDetails.address.line1" className="text-sm font-semibold text-slate-700">
                                Address Line 1
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                                  <IoLocationOutline className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <input
                                  id="clinicDetails.address.line1"
                                  name="clinicDetails.address.line1"
                                  value={doctorSignupData.clinicDetails.address.line1}
                                  onChange={handleDoctorSignupChange}
                                  placeholder="123 Health Street"
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label htmlFor="clinicDetails.address.line2" className="text-sm font-semibold text-slate-700">
                                Address Line 2 (optional)
                              </label>
                              <input
                                id="clinicDetails.address.line2"
                                name="clinicDetails.address.line2"
                                value={doctorSignupData.clinicDetails.address.line2}
                                onChange={handleDoctorSignupChange}
                                placeholder="Apartment or suite"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label htmlFor="clinicDetails.address.city" className="text-sm font-semibold text-slate-700">
                                City
                              </label>
                              <select
                                id="clinicDetails.address.city"
                                name="clinicDetails.address.city"
                                required
                                disabled={!doctorSignupData.clinicDetails.address.state}
                                value={doctorSignupData.clinicDetails.address.city}
                                onChange={handleDoctorSignupChange}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400"
                                style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                              >
                                <option value="">Select City</option>
                                {citiesList.map(city => (
                                  <option key={city._id} value={city.name}>{city.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label htmlFor="clinicDetails.address.state" className="text-sm font-semibold text-slate-700">
                                State
                              </label>
                              <select
                                id="clinicDetails.address.state"
                                name="clinicDetails.address.state"
                                required
                                value={doctorSignupData.clinicDetails.address.state}
                                onChange={(e) => {
                                  // Update state and clear city
                                  handleDoctorSignupChange(e)
                                  setDoctorSignupData(prev => ({
                                    ...prev,
                                    clinicDetails: {
                                      ...prev.clinicDetails,
                                      address: {
                                        ...prev.clinicDetails.address,
                                        city: ''
                                      }
                                    }
                                  }))
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                              >
                                <option value="">Select State</option>
                                {statesList.map(state => (
                                  <option key={state._id} value={state.name}>{state.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label htmlFor="clinicDetails.address.postalCode" className="text-sm font-semibold text-slate-700">
                                Postal Code
                              </label>
                              <input
                                id="clinicDetails.address.postalCode"
                                name="clinicDetails.address.postalCode"
                                value={doctorSignupData.clinicDetails.address.postalCode}
                                onChange={handleDoctorSignupChange}
                                placeholder="400001"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label htmlFor="clinicDetails.address.country" className="text-sm font-semibold text-slate-700">
                                Country
                              </label>
                              <input
                                id="clinicDetails.address.country"
                                name="clinicDetails.address.country"
                                value={doctorSignupData.clinicDetails.address.country}
                                onChange={handleDoctorSignupChange}
                                placeholder="India"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                style={{ '--tw-ring-color': 'var(--color-primary-border)' }}
                              />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Document Uploads */}
                      <section>
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <IoDocumentTextOutline className="h-5 w-5 text-primary" />
                            Upload Documents (PDF)
                          </h3>
                          <p className="text-xs text-slate-500 mb-3">
                            Upload your professional documents for verification (License, Certificates, etc.)
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="file"
                              accept=".pdf"
                              multiple
                              onChange={(e) => handleDocumentUpload(e, 'doctor')}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
                            />
                            <p className="text-xs text-slate-500">
                              Accepted format: PDF only. Maximum file size: 5MB per file. Maximum 10 files.
                            </p>
                          </div>
                          {doctorSignupData.documents.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-slate-700">
                                Uploaded Documents ({doctorSignupData.documents.length}/10):
                              </p>
                              <div className="space-y-2">
                                {doctorSignupData.documents.map((doc, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <IoDocumentTextOutline className="h-4 w-4 text-primary shrink-0" />
                                      <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeDocument(index, 'doctor')}
                                      className="ml-2 text-red-500 hover:text-red-700 transition shrink-0"
                                      aria-label={`Remove ${doc.name}`}
                                    >
                                      <IoCloseOutline className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* Clinic/Hospital Images Upload */}
                      <section>
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <IoImageOutline className="h-5 w-5 text-primary" />
                            Hospital Images
                          </h3>
                          <p className="text-xs text-slate-500 mb-3">
                            Upload images of your hospital (Maximum 5 images)
                          </p>
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleClinicImagesUpload}
                              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
                            />
                            <p className="text-xs text-slate-500">
                              Accepted formats: JPG, PNG. Maximum file size: 5MB per image. Maximum 5 images.
                            </p>
                          </div>
                          {doctorSignupData.clinicImages.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-slate-700">
                                Uploaded Images ({doctorSignupData.clinicImages.length}/5):
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {doctorSignupData.clinicImages.map((img, index) => (
                                  <div
                                    key={index}
                                    className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                                  >
                                    <img
                                      src={img.data}
                                      alt={img.name}
                                      className="w-full h-24 object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeClinicImage(index)}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                      aria-label={`Remove ${img.name}`}
                                    >
                                      <IoCloseOutline className="h-4 w-4" />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 truncate">
                                      {img.name}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* Terms */}
                      <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          name="termsAccepted"
                          checked={doctorSignupData.termsAccepted}
                          onChange={handleDoctorSignupChange}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span>
                          I have read and agree to Healway's{' '}
                          <Link
                            to="/terms"
                            state={{
                              fromPath: location.pathname,
                              restoreAuthView: { mode: 'signup', userRole: 'doctor', signupStep },
                            }}
                            className="font-semibold text-primary hover:text-primary-dark"
                          >
                            terms of service
                          </Link>{' '}
                          and{' '}
                          <Link
                            to="/privacy"
                            state={{
                              fromPath: location.pathname,
                              restoreAuthView: { mode: 'signup', userRole: 'doctor', signupStep },
                            }}
                            className="font-semibold text-primary hover:text-primary-dark"
                          >
                            privacy policy
                          </Link>
                          .
                        </span>
                      </label>
                    </motion.div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex flex-col gap-3 mt-8">
                    <div className="flex gap-3">
                      {signupStep > 1 && (
                        <button
                          type="button"
                          onClick={handlePreviousStep}
                          className="flex h-12 flex-1 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-base font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          Previous
                        </button>
                      )}
                      {signupStep < totalSignupSteps ? (
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className={`flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-md shadow-[rgba(0,119,194,0.25)] transition hover:bg-primary-dark hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${signupStep > 1 ? 'flex-1' : 'w-full'
                            }`}
                          style={{ boxShadow: '0 4px 6px -1px rgba(0, 119, 194, 0.25)' }}
                        >
                          Next
                          <IoArrowForwardOutline className="h-5 w-5" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting || !doctorSignupData.termsAccepted}
                          className={`flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-white shadow-md shadow-[rgba(0,119,194,0.25)] transition hover:bg-primary-dark hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${signupStep > 1 ? 'flex-1' : 'w-full'
                            }`}
                          style={{ boxShadow: '0 4px 6px -1px rgba(0, 119, 194, 0.25)' }}
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Submitting...
                            </>
                          ) : (
                            <>
                              Complete Signup
                              <IoArrowForwardOutline className="h-5 w-5" aria-hidden="true" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </form>

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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-auto border-t border-slate-100 bg-white/95 backdrop-blur px-4 pt-4 pb-[calc(3rem+var(--app-safe-bottom))]">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center text-xs text-slate-500">
          <span>Secure access powered by Healway</span>
        </div>
      </footer>
    </div>
  )
}

export default DoctorLogin

