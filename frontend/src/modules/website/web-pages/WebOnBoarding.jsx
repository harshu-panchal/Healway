import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoArrowForwardOutline,
  IoArrowBackOutline,
  IoDocumentTextOutline,
  IoMedicalOutline,
  IoLanguageOutline,
  IoSchoolOutline,
  IoBriefcaseOutline,
  IoTimeOutline,
  IoCloudUploadOutline,
  IoCloseCircleOutline,
  IoEyeOutline,
} from 'react-icons/io5'
import {
  FaUserMd,
} from 'react-icons/fa'
import { useToast } from '../../../contexts/ToastContext'
import { signupPatient } from '../../patient/patient-services/patientService'
import { signupDoctor } from '../../doctor/doctor-services/doctorService'

import WebFooter from '../web-components/WebFooter'
import onboardingImage from '../../../assets/images/img4.png'
import healwayLogo from '../../../assets/logo/healway-logo.png'

const WebOnBoarding = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [selectedUserType, setSelectedUserType] = useState('patient') // 'patient' | 'doctor'
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Refs for user type buttons to measure positions for indicator
  const patientButtonRef = useRef(null)
  const doctorButtonRef = useRef(null)

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // Patient signup state
  const initialPatientState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    termsAccepted: false,
  }
  const [patientData, setPatientData] = useState(initialPatientState)

  // Doctor signup state
  const initialDoctorState = {
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
    original_fees: '',
    discount_amount: '',
    consultationFee: '',
    languages: [],
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
    termsAccepted: false,
  }
  const [doctorData, setDoctorData] = useState(initialDoctorState)
  const [doctorDocuments, setDoctorDocuments] = useState([]) // Array of {file, preview, id}
  const [clinicImages, setClinicImages] = useState([]) // Array of {file, preview, id} for clinic images


  // Document upload handlers
  const handleDoctorDocumentUpload = (e) => {
    const files = Array.from(e.target.files || [])
    const maxSize = 10 * 1024 * 1024 // 10MB

    files.forEach((file) => {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`)
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const newDoc = {
          id: Date.now() + Math.random(),
          file: file,
          preview: reader.result,
          name: file.name,
          type: file.type,
          size: file.size,
        }
        setDoctorDocuments((prev) => [...prev, newDoc])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    e.target.value = ''
  }

  const removeDoctorDocument = (id) => {
    setDoctorDocuments((prev) => prev.filter((doc) => doc.id !== id))
  }

  // Clinic images upload handlers
  const handleClinicImagesUpload = (e) => {
    const files = Array.from(e.target.files || [])
    const maxSize = 5 * 1024 * 1024 // 5MB per image
    const maxImages = 5

    if (clinicImages.length + files.length > maxImages) {
      toast.error(`You can upload maximum ${maxImages} clinic images`)
      return
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return
      }

      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum size is 5MB.`)
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const newImage = {
          id: Date.now() + Math.random(),
          file: file,
          preview: reader.result,
          name: file.name,
          type: file.type,
          size: file.size,
        }
        setClinicImages((prev) => [...prev, newImage])
      }
      reader.readAsDataURL(file)
    })

    // Reset input
    e.target.value = ''
  }

  const removeClinicImage = (id) => {
    setClinicImages((prev) => prev.filter((img) => img.id !== id))
  }


  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState(null)

  // Convert file to base64 for submission
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  // Scroll to top when component mounts or route changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const formContainer = document.querySelector('.overflow-y-auto')
    if (formContainer) {
      formContainer.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  // Update indicator position based on selected user type
  useEffect(() => {
    const updateIndicatorPosition = () => {
      const container = patientButtonRef.current?.parentElement
      if (!container) return

      const activeButtonRef =
        selectedUserType === 'patient'
          ? patientButtonRef
          : selectedUserType === 'doctor'
            ? doctorButtonRef
            : null

      const activeButton = activeButtonRef.current
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
  }, [selectedUserType])

  const handleUserTypeChange = (userType) => {
    setSelectedUserType(userType)
    setIsSubmitting(false)
    setDoctorDocuments([])
    setClinicImages([])
  }

  const handlePatientChange = (e) => {
    const { name, value, type, checked } = e.target
    setPatientData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handlePatientSubmit = async (e) => {
    e.preventDefault()

    if (!patientData.termsAccepted) {
      toast.error('Please accept the terms and conditions')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        firstName: patientData.firstName,
        lastName: patientData.lastName || undefined,
        email: patientData.email,
        phone: patientData.phone,
      }

      const response = await signupPatient(payload)

      if (response.success) {
        toast.success('Registration successful! Redirecting to home...')
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        toast.error(response.message || 'Registration failed. Please try again.')
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Signup error:', error)
      toast.error(error.message || 'An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const addEducationEntry = () => {
    setDoctorData((prev) => ({
      ...prev,
      education: [...prev.education, { institution: '', degree: '', year: '' }],
    }))
  }

  const removeEducationEntry = (index) => {
    setDoctorData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }))
  }

  const removeLanguage = (lang) => {
    setDoctorData((prev) => ({
      ...prev,
      languages: prev.languages.filter((l) => l !== lang),
    }))
  }

  const handleDoctorChange = (e) => {
    const { name, value, type, checked } = e.target

    if (name === 'termsAccepted') {
      setDoctorData((prev) => ({
        ...prev,
        termsAccepted: checked,
      }))
      return
    }

    if (name === 'original_fees' || name === 'discount_amount') {
      const cleanedValue = value.replace(/[^\d.]/g, '')
      const parts = cleanedValue.split('.')
      const finalPrice = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0]

      setDoctorData((prev) => {
        const nextData = { ...prev, [name]: finalPrice }
        const original = parseFloat(name === 'original_fees' ? finalPrice : prev.original_fees) || 0
        const discount = parseFloat(name === 'discount_amount' ? finalPrice : prev.discount_amount) || 0
        nextData.consultationFee = Math.max(0, original - discount).toString()
        return nextData
      })
      return
    }

    if (name === 'consultationFee') {
      const cleanedValue = value.replace(/[^\d.]/g, '')
      const parts = cleanedValue.split('.')
      const finalValue = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : parts[0]
      setDoctorData((prev) => ({
        ...prev,
        [name]: finalValue,
      }))
      return
    }

    if (name.startsWith('clinicDetails.address.')) {
      const key = name.split('.')[2]
      setDoctorData((prev) => ({
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
      if (key === 'name') {
        setDoctorData((prev) => ({
          ...prev,
          clinicDetails: {
            ...prev.clinicDetails,
            name: value,
          },
        }))
      }
      return
    }

    if (name.startsWith('education.')) {
      const parts = name.split('.')
      const index = parseInt(parts[1])
      const field = parts[2]
      setDoctorData((prev) => {
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
      setDoctorData((prev) => {
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

    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10)
      setDoctorData((prev) => ({
        ...prev,
        [name]: numericValue,
      }))
      return
    }

    setDoctorData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleLanguageInput = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const langValue = e.target.value.trim()
      if (langValue && !doctorData.languages.includes(langValue)) {
        setDoctorData((prev) => ({
          ...prev,
          languages: [...prev.languages, langValue],
        }))
        e.target.value = ''
      }
    }
  }

  const handleDoctorSubmit = async (e) => {
    e.preventDefault()

    if (!doctorData.termsAccepted) {
      toast.error('Please accept the terms and conditions')
      return
    }

    if (!doctorData.firstName || !doctorData.email || !doctorData.phone || !doctorData.specialization || !doctorData.gender || !doctorData.licenseNumber) {
      toast.error('Please fill in all required fields.')
      return
    }

    if (doctorData.firstName.trim().length < 2) {
      toast.error('First name must be at least 2 characters')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(doctorData.email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    if (doctorData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setIsSubmitting(true)
    try {
      const documentsBase64 = await Promise.all(
        doctorDocuments.map((doc) => fileToBase64(doc.file).then((base64) => ({
          name: doc.name,
          type: doc.type,
          data: base64,
        })))
      )

      // Convert clinic images to base64
      const clinicImagesBase64 = await Promise.all(
        clinicImages.map((img) => fileToBase64(img.file).then((base64) => ({
          name: img.name,
          type: img.type,
          data: base64,
        })))
      )

      const payload = {
        firstName: doctorData.firstName,
        lastName: doctorData.lastName || undefined,
        email: doctorData.email,
        phone: doctorData.phone,
        specialization: doctorData.specialization,
        gender: doctorData.gender,
        licenseNumber: doctorData.licenseNumber,
        experienceYears: doctorData.experienceYears ? Number(doctorData.experienceYears) : undefined,
        qualification: doctorData.qualification || undefined,
        bio: doctorData.bio || undefined,
        original_fees: doctorData.original_fees ? Number(doctorData.original_fees) : 0,
        discount_amount: doctorData.discount_amount ? Number(doctorData.discount_amount) : 0,
        consultationFee: doctorData.consultationFee && doctorData.consultationFee !== ''
          ? (() => {
            const feeNum = parseFloat(doctorData.consultationFee)
            return !isNaN(feeNum) && isFinite(feeNum) ? feeNum : undefined
          })()
          : undefined,
        languages: doctorData.languages.length > 0 ? doctorData.languages : undefined,
        consultationModes: doctorData.consultationModes.length > 0 ? doctorData.consultationModes : undefined,
        education: doctorData.education.filter((edu) => edu.institution || edu.degree || edu.year).length > 0
          ? doctorData.education.filter((edu) => edu.institution || edu.degree || edu.year)
          : undefined,
        clinicName: doctorData.clinicDetails.name || undefined,
        clinicAddress: Object.values(doctorData.clinicDetails.address).some((val) => val)
          ? doctorData.clinicDetails.address
          : undefined,
        clinicImages: clinicImagesBase64.length > 0 ? clinicImagesBase64 : undefined,
        documents: documentsBase64.length > 0 ? documentsBase64 : undefined,
      }

      const response = await signupDoctor(payload)

      if (response.success) {
        toast.success('Registration submitted successfully! Please wait for admin approval. Redirecting to home...')
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        toast.error(response.message || 'Registration failed. Please try again.')
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Signup error:', error)
      toast.error(error.message || 'An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row flex-1">
        {/* Left Side - Logo and Image (Sticky) */}
        <div className="w-full md:w-1/2 bg-white flex flex-col items-center justify-center p-8 order-1 md:order-1 md:sticky md:top-0 md:h-screen md:overflow-hidden relative">
          <button
            onClick={() => navigate('/')}
            className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/30 z-10"
            aria-label="Back to home"
          >
            <IoArrowBackOutline className="h-5 w-5" />
            <span className="text-sm font-semibold hidden sm:inline">Back to Home</span>
          </button>

          <div className="mb-8 md:mb-12">
            <img src={healwayLogo} alt="Healway Logo" className="h-12 md:h-16 w-auto object-contain" />
          </div>
          <img src={onboardingImage} alt="Healthcare Onboarding" className="w-full max-w-xs md:max-w-lg h-auto object-contain" />
        </div>

        {/* Right Side - Form (Scrollable) */}
        <div className="w-full md:w-1/2 bg-primary flex items-start justify-center order-2 md:order-2 overflow-y-auto md:h-screen">
          <div className="w-full max-w-2xl px-6 sm:px-8 lg:px-12 py-8">
            <div className="mb-10 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Join Healway</h1>
              <p className="text-white/80 text-sm sm:text-base">Start your healthcare journey with us</p>
            </div>

            {/* User Type Selection */}
            <div className="mb-10">
              <div className="relative flex items-center gap-1 rounded-2xl bg-white/10 p-1.5 backdrop-blur-sm">
                <div
                  className="absolute rounded-xl bg-white/20 backdrop-blur-md transition-all duration-300 ease-in-out"
                  style={{
                    left: `${indicatorStyle.left}px`,
                    width: `${indicatorStyle.width}px`,
                    height: 'calc(100% - 12px)',
                    top: '6px',
                  }}
                />
                <button
                  ref={patientButtonRef}
                  type="button"
                  onClick={() => handleUserTypeChange('patient')}
                  className={`relative z-10 flex-1 rounded-xl py-3 px-4 text-xs sm:text-sm font-semibold text-center transition ${selectedUserType === 'patient' ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <IoPersonOutline className="h-4 w-4" />
                    <span>Patient</span>
                  </div>
                </button>
                <button
                  ref={doctorButtonRef}
                  type="button"
                  onClick={() => handleUserTypeChange('doctor')}
                  className={`relative z-10 flex-1 rounded-xl py-3 px-4 text-xs sm:text-sm font-semibold text-center transition ${selectedUserType === 'doctor' ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FaUserMd className="h-4 w-4" />
                    <span>Doctor</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl">
              {selectedUserType === 'patient' ? (
                <form onSubmit={handlePatientSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="firstName" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">First Name *</label>
                      <div className="relative">
                        <IoPersonOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                        <input type="text" id="firstName" name="firstName" required value={patientData.firstName} onChange={handlePatientChange} placeholder="Enter your first name" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="lastName" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Last Name</label>
                      <div className="relative">
                        <IoPersonOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                        <input type="text" id="lastName" name="lastName" value={patientData.lastName} onChange={handlePatientChange} placeholder="Enter your last name" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address *</label>
                    <div className="relative">
                      <IoMailOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                      <input type="email" id="email" name="email" required value={patientData.email} onChange={handlePatientChange} placeholder="your@email.com" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Mobile Number *</label>
                    <div className="relative">
                      <IoCallOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                      <input type="tel" id="phone" name="phone" required value={patientData.phone} onChange={handlePatientChange} placeholder="10-digit mobile number" className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-2">
                    <input type="checkbox" id="termsAccepted" name="termsAccepted" required checked={patientData.termsAccepted} onChange={handlePatientChange} className="mt-1 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                    <label htmlFor="termsAccepted" className="text-sm text-slate-600 leading-relaxed cursor-pointer selection:bg-primary/10">
                      I agree to the <button type="button" className="text-primary font-bold hover:underline">Terms of Service</button> and <button type="button" className="text-primary font-bold hover:underline">Privacy Policy</button>
                    </label>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 transition-all hover:bg-primary-dark hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <IoArrowForwardOutline className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleDoctorSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">First Name *</label>
                      <input type="text" name="firstName" required value={doctorData.firstName} onChange={handleDoctorChange} placeholder="Dr. John" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Last Name</label>
                      <input type="text" name="lastName" value={doctorData.lastName} onChange={handleDoctorChange} placeholder="Smith" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address *</label>
                      <input type="email" name="email" required value={doctorData.email} onChange={handleDoctorChange} placeholder="doctor@example.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Mobile Number *</label>
                      <input type="tel" name="phone" required value={doctorData.phone} onChange={handleDoctorChange} placeholder="10-digit number" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Specialization *</label>
                      <select name="specialization" required value={doctorData.specialization} onChange={handleDoctorChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm appearance-none bg-white">
                        <option value="">Select Specialization</option>
                        <option value="Cardiologist">Cardiologist</option>
                        <option value="Dermatologist">Dermatologist</option>
                        <option value="Pediatrician">Pediatrician</option>
                        <option value="Orthopedic">Orthopedic</option>
                        <option value="General Physician">General Physician</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Gender *</label>
                      <select name="gender" required value={doctorData.gender} onChange={handleDoctorChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm appearance-none bg-white">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Original Fees *</label>
                      <input type="text" name="original_fees" required value={doctorData.original_fees} onChange={handleDoctorChange} placeholder="e.g. 1000" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Discount Amount</label>
                      <input type="text" name="discount_amount" value={doctorData.discount_amount} onChange={handleDoctorChange} placeholder="e.g. 200" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-semibold text-emerald-600" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Final Consultation Fee</span>
                    <span className="text-xl font-bold text-primary">₹{doctorData.consultationFee || '0'}</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Medical License Number *</label>
                    <input type="text" name="licenseNumber" required value={doctorData.licenseNumber} onChange={handleDoctorChange} placeholder="Reg. No. 123456" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm" />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Verifications Documents *</label>
                    <div className="grid grid-cols-1 gap-3">
                      <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                        <IoCloudUploadOutline className="h-10 w-10 text-slate-400 group-hover:text-primary transition-colors mb-2" />
                        <span className="text-sm font-semibold text-slate-600">Upload License, Degree & ID</span>
                        <span className="text-xs text-slate-400 mt-1">PDF, JPG or PNG (Max 10MB)</span>
                        <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleDoctorDocumentUpload} className="hidden" />
                      </label>
                      {doctorDocuments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {doctorDocuments.map((doc) => (
                            <div key={doc.id} className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg group animate-in slide-in-from-bottom-2 duration-300">
                              <IoDocumentTextOutline className="h-4 w-4 text-primary" />
                              <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{doc.name}</span>
                              <button type="button" onClick={() => removeDoctorDocument(doc.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <IoCloseCircleOutline className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinic/Hospital Images Upload */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Clinic/Hospital Images</label>
                    <div className="grid grid-cols-1 gap-3">
                      <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                        <IoCloudUploadOutline className="h-10 w-10 text-slate-400 group-hover:text-primary transition-colors mb-2" />
                        <span className="text-sm font-semibold text-slate-600">Upload Clinic/Hospital Photos</span>
                        <span className="text-xs text-slate-400 mt-1">JPG or PNG (Max 5 images, 5MB each)</span>
                        <input type="file" multiple accept="image/*" onChange={handleClinicImagesUpload} className="hidden" />
                      </label>

                      {clinicImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {clinicImages.map((img) => (
                            <div key={img.id} className="relative group animate-in slide-in-from-bottom-2 duration-300">
                              <img
                                src={img.preview}
                                alt={img.name}
                                className="w-full h-24 object-cover rounded-lg border-2 border-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeClinicImage(img.id)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <IoCloseCircleOutline className="h-4 w-4" />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 rounded-b-lg truncate">
                                {img.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 py-2">
                    <input type="checkbox" name="termsAccepted" required checked={doctorData.termsAccepted} onChange={handleDoctorChange} className="mt-1 h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" />
                    <label className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                      I certify that all provided information is accurate and I agree to Healway's <button type="button" className="text-primary font-bold hover:underline">Provider Agreement</button>
                    </label>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 transition-all hover:bg-primary-dark hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
                    {isSubmitting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>Submit for Verification</span>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
      <WebFooter />
      {previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setPreviewDoc(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewDoc(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"><IoCloseCircleOutline className="h-8 w-8" /></button>
            <div className="h-full overflow-y-auto p-4 flex items-center justify-center min-h-[50vh]">
              {previewDoc.type.includes('image') ? <img src={previewDoc.preview} alt={previewDoc.name} className="max-w-full h-auto rounded-lg shadow-lg" /> : <div className="text-center p-12"><IoDocumentTextOutline className="h-20 w-20 text-primary mx-auto mb-4" /><p className="text-xl font-bold text-slate-900 mb-2">{previewDoc.name}</p><p className="text-slate-500 mb-6">PDF document preview not available in this browser.</p><a href={previewDoc.preview} download={previewDoc.name} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all">Download to View</a></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WebOnBoarding
