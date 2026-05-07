import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  IoArrowBackOutline,
  IoArrowForwardOutline,
  IoSaveOutline,
  IoCloseOutline,
  IoAddOutline,
  IoMedicalOutline,
  IoBriefcaseOutline,
  IoLanguageOutline,
  IoSchoolOutline,
  IoLocationOutline,
  IoDocumentTextOutline,
  IoImageOutline,
  IoVideocamOutline,
  IoCallOutline,
  IoPersonOutline,
  IoMailOutline,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import adminService, {
  createDoctor,
  updateDoctor,
  getDoctorById,
  verifyDoctor,
} from '../admin-services/adminService'

const AdminDoctorForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const isEditMode = !!id
  const searchParams = new URLSearchParams(location.search)
  const shouldApproveAfterSave = searchParams.get('approve') === '1'
  const returnTo = searchParams.get('returnTo') || (shouldApproveAfterSave ? '/admin/verification' : '/admin/doctors')

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)
  
  // Lists for dropdowns
  const [availableSpecializations, setAvailableSpecializations] = useState([])
  const [availableServices, setAvailableServices] = useState([])
  const [statesList, setStatesList] = useState([])
  const [citiesList, setCitiesList] = useState([])

  // Dropdown states
  const [showSpecializationDropdown, setShowSpecializationDropdown] = useState(false)
  const [specializationSearchTerm, setSpecializationSearchTerm] = useState('')
  const [languageInput, setLanguageInput] = useState('')
  const [showServicesDropdown, setShowServicesDropdown] = useState(false)
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')

  // Refs for dropdowns
  const specializationInputRef = useRef(null)
  const specializationDropdownRef = useRef(null)
  const servicesDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    specialization: '',
    licenseNumber: '',
    experienceYears: '',
    qualification: '',
    bio: '',
    consultationFee: '',
    languages: [],
    services: [],
    consultationModes: [],
    education: [{ institution: '', degree: '', year: '' }],
    clinicName: '',
    clinicAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
    documents: [],
    clinicImages: [],
    isDoctor: true,
    fees: {
      inPerson: { original: '', discount: 0, final: 0 },
      videoCall: { original: '', discount: 0, final: 0 },
      voiceCall: { original: '', discount: 0, final: 0 },
    }
  })

  useEffect(() => {
    fetchDropdownData()
    if (isEditMode) {
      loadDoctorData()
    }
  }, [id])

  const fetchDropdownData = async () => {
    try {
      const [specialtiesRes, servicesRes, statesRes] = await Promise.all([
        adminService.getAllSpecialties(),
        adminService.getAllServices(),
        adminService.getStates()
      ])
      if (specialtiesRes && specialtiesRes.success) setAvailableSpecializations((specialtiesRes.data || []).map(s => s.name))
      if (servicesRes && servicesRes.success) setAvailableServices((servicesRes.data || []).map(s => s.name))
      if (statesRes && statesRes.success) setStatesList(statesRes.data || [])
    } catch (error) {
      console.error('Error fetching dropdown data:', error)
    }
  }

  useEffect(() => {
    const fetchCities = async () => {
      if (formData.clinicAddress.state) {
        const selectedState = statesList.find(s => s.name === formData.clinicAddress.state)
        if (selectedState) {
          try {
            const response = await adminService.getCitiesByState(selectedState._id)
            if (response && response.success) {
              setCitiesList(response.data || [])
            }
          } catch (error) {
            console.error('Failed to fetch cities:', error)
          }
        }
      } else {
        setCitiesList([])
      }
    }
    fetchCities()
  }, [formData.clinicAddress.state, statesList])

  const loadDoctorData = async () => {
    try {
      setLoading(true)
      const response = await getDoctorById(id)
      if (response && response.data) {
        const doctor = response.data
        setFormData({
          firstName: doctor.firstName || '',
          lastName: doctor.lastName || '',
          email: doctor.email || '',
          phone: doctor.phone || '',
          gender: doctor.gender || '',
          specialization: doctor.specialization || '',
          licenseNumber: doctor.licenseNumber || '',
          experienceYears: doctor.experienceYears || '',
          qualification: doctor.qualification || '',
          bio: doctor.bio || '',
          consultationFee: doctor.consultationFee || '',
          languages: doctor.languages || [],
          services: doctor.services || [],
          consultationModes: doctor.consultationModes || [],
          education: doctor.education?.length > 0 ? doctor.education : [{ institution: '', degree: '', year: '' }],
          clinicName: doctor.clinicDetails?.name || '',
          clinicAddress: {
            line1: doctor.clinicDetails?.address?.line1 || '',
            line2: doctor.clinicDetails?.address?.line2 || '',
            city: doctor.clinicDetails?.address?.city || '',
            state: doctor.clinicDetails?.address?.state || '',
            postalCode: doctor.clinicDetails?.address?.postalCode || '',
            country: doctor.clinicDetails?.address?.country || 'India',
          },
          documents: doctor.documents || [],
          clinicImages: doctor.clinicDetails?.images || [],
          isDoctor: doctor.isDoctor !== false,
          fees: {
            inPerson: { 
              original: doctor.fees?.inPerson?.original ?? doctor.consultationFee ?? '', 
              discount: doctor.fees?.inPerson?.discount ?? 0, 
              final: doctor.fees?.inPerson?.final ?? doctor.consultationFee ?? 0 
            },
            videoCall: { 
              original: doctor.fees?.videoCall?.original ?? '', 
              discount: doctor.fees?.videoCall?.discount ?? 0, 
              final: doctor.fees?.videoCall?.final ?? 0 
            },
            voiceCall: { 
              original: doctor.fees?.voiceCall?.original ?? '', 
              discount: doctor.fees?.voiceCall?.discount ?? 0, 
              final: doctor.fees?.voiceCall?.final ?? 0 
            },
          }
        })
        setSpecializationSearchTerm(doctor.specialization || '')
      }
    } catch (error) {
      console.error('Error loading doctor data:', error)
      toast.error('Failed to load doctor data')
      navigate(returnTo, { replace: true })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    if (field.startsWith('clinicAddress.')) {
      const key = field.replace('clinicAddress.', '')
      setFormData(prev => ({
        ...prev,
        clinicAddress: {
          ...prev.clinicAddress,
          [key]: value,
        },
      }))
      return
    }

    if (field.startsWith('fees.')) {
      const [_, mode, key] = field.split('.')
      setFormData(prev => ({
        ...prev,
        fees: {
          ...prev.fees,
          [mode]: {
            ...prev.fees[mode],
            [key]: value,
          }
        }
      }))
      return
    }

    setFormData(prev => ({
      ...prev,
      [field]: value,
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

  const filteredSpecializations = useMemo(() => {
    const term = specializationSearchTerm.toLowerCase()
    return availableSpecializations.filter(s =>
      s.toLowerCase().includes(term)
    )
  }, [availableSpecializations, specializationSearchTerm])

  const filteredServices = useMemo(() => {
    const term = serviceSearchTerm.toLowerCase()
    return availableServices.filter(s =>
      s.toLowerCase().includes(term) && !formData.services.includes(s)
    )
  }, [availableServices, serviceSearchTerm, formData.services])

  const handleEducationChange = (index, field, value) => {
    const newEducation = [...formData.education]
    newEducation[index] = { ...newEducation[index], [field]: value }
    setFormData(prev => ({ ...prev, education: newEducation }))
  }

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { institution: '', degree: '', year: '' }]
    }))
  }

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }))
  }

  const handleFileChange = async (event, field) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    const convertToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve({
          name: file.name,
          data: reader.result,
          type: file.type
        })
        reader.onerror = error => reject(error)
      })
    }

    try {
      const base64Files = await Promise.all(files.map(convertToBase64))
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], ...base64Files]
      }))
    } catch (error) {
      toast.error('Failed to process files')
    }
  }

  const removeFile = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const handleModeToggle = (mode) => {
    setFormData(prev => {
      const modes = prev.consultationModes || []
      return {
        ...prev,
        consultationModes: modes.includes(mode)
          ? modes.filter(item => item !== mode)
          : [...modes, mode],
      }
    })
  }

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.email.trim() || !formData.phone.trim()) {
        toast.warning('Please fill in all required fields in Step 1')
        return false
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        toast.warning('Please enter a valid email address')
        return false
      }
      if (formData.phone.replace(/\D/g, '').length !== 10) {
        toast.warning('Please enter a valid 10-digit phone number')
        return false
      }
    } else if (step === 2) {
      if (!formData.specialization.trim() || !formData.gender || !formData.licenseNumber.trim()) {
        toast.warning('Please fill in all required fields in Step 2')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(3, prev + 1))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1))
  }

  const handleHeaderBack = () => {
    if (currentStep > 1) {
      handleBack()
      return
    }

    navigate(returnTo)
  }

  const getMissingApprovalFields = () => {
    const missing = []
    const address = formData.clinicAddress || {}
    const completeEducation = formData.education.some(
      edu => edu.institution?.trim() && edu.degree?.trim() && String(edu.year || '').trim()
    )

    if (!formData.firstName.trim()) missing.push('First Name')
    if (!formData.lastName.trim()) missing.push('Last Name')
    if (!formData.email.trim()) missing.push('Email Address')
    if (!formData.phone.trim()) missing.push('Phone Number')
    if (!formData.gender) missing.push('Gender')
    if (!formData.specialization.trim()) missing.push('Specialization')
    if (!formData.licenseNumber.trim()) missing.push('License Number')
    if (formData.experienceYears === '' || formData.experienceYears === null) missing.push('Experience')
    if (!formData.qualification.trim()) missing.push('Qualification')
    if (!formData.bio.trim()) missing.push('Bio')
    const hasRequiredFees = formData.consultationModes.every(mode => {
      if (mode === 'in_person') return formData.fees.inPerson.original !== ''
      if (mode === 'voice_call') return formData.fees.voiceCall.original !== ''
      if (mode === 'video_call') return formData.fees.videoCall.original !== ''
      return true
    })

    if (!hasRequiredFees || formData.consultationModes.length === 0) {
      if (!hasRequiredFees) missing.push('Consultation Fee')
    }

    if (formData.languages.length === 0 && !languageInput.trim()) missing.push('Languages')
    if (formData.services.length === 0) missing.push('Services')
    if (formData.consultationModes.length === 0) missing.push('Consultation Modes')
    if (!completeEducation) missing.push('Education')
    if (!formData.clinicName.trim()) missing.push('Hospital / Clinic Name')
    if (!address.line1?.trim()) missing.push('Address Line 1')
    if (!address.city?.trim()) missing.push('City')
    if (!address.state?.trim()) missing.push('State')
    if (!address.postalCode?.trim()) missing.push('Postal Code')
    if (!address.country?.trim()) missing.push('Country')
    if (formData.documents.length === 0) missing.push('Verification Documents')
    if (formData.clinicImages.length === 0) missing.push('Hospital Images')

    return missing
  }

  const handleSave = async () => {
    // Auto-add pending language if any
    let finalLanguages = formData.languages
    if (languageInput.trim() && !finalLanguages.includes(languageInput.trim())) {
      finalLanguages = [...finalLanguages, languageInput.trim()]
      setFormData(prev => ({ ...prev, languages: finalLanguages }))
      setLanguageInput('')
    }

    if (!validateStep(1) || !validateStep(2)) return

    if (shouldApproveAfterSave) {
      const missingFields = getMissingApprovalFields()
      if (missingFields.length > 0) {
        toast.warning(`Complete all required doctor details before approval. Missing: ${missingFields.slice(0, 4).join(', ')}${missingFields.length > 4 ? '...' : ''}`)
        return
      }
    }

    try {
      setIsSaving(true)
      
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        specialization: formData.specialization.trim(),
        licenseNumber: formData.licenseNumber.trim(),
        experienceYears: formData.experienceYears ? Number(formData.experienceYears) : undefined,
        qualification: formData.qualification.trim() || undefined,
        bio: formData.bio.trim() || undefined,
        consultationFee: formData.consultationFee ? Number(formData.consultationFee) : undefined,
        languages: finalLanguages.length > 0 ? finalLanguages : undefined,
        services: formData.services.length > 0 ? formData.services : undefined,
        consultationModes: formData.consultationModes.length > 0 ? formData.consultationModes : undefined,
        education: formData.education.filter(edu => edu.institution || edu.degree || edu.year).length > 0 
          ? formData.education.filter(edu => edu.institution || edu.degree || edu.year) 
          : undefined,
        clinicName: formData.clinicName.trim() || undefined,
        clinicAddress: Object.values(formData.clinicAddress).some(val => val) ? formData.clinicAddress : undefined,
        clinicImages: formData.clinicImages.length > 0 ? formData.clinicImages : undefined,
        documents: formData.documents.length > 0 ? formData.documents : undefined,
        isDoctor: formData.isDoctor,
        fees: {
          inPerson: {
            original: formData.fees.inPerson.original ? Number(formData.fees.inPerson.original) : 0,
            discount: Number(formData.fees.inPerson.discount || 0),
            final: formData.fees.inPerson.original ? Number(formData.fees.inPerson.original) - Number(formData.fees.inPerson.discount || 0) : 0,
          },
          videoCall: {
            original: formData.fees.videoCall.original ? Number(formData.fees.videoCall.original) : 0,
            discount: Number(formData.fees.videoCall.discount || 0),
            final: formData.fees.videoCall.original ? Number(formData.fees.videoCall.original) - Number(formData.fees.videoCall.discount || 0) : 0,
          },
          voiceCall: {
            original: formData.fees.voiceCall.original ? Number(formData.fees.voiceCall.original) : 0,
            discount: Number(formData.fees.voiceCall.discount || 0),
            final: formData.fees.voiceCall.original ? Number(formData.fees.voiceCall.original) - Number(formData.fees.voiceCall.discount || 0) : 0,
          },
        },
      }

      if (isEditMode) {
        await updateDoctor(id, payload)
        if (shouldApproveAfterSave) {
          await verifyDoctor(id)
          toast.success('Doctor details saved and approved successfully')
        } else {
          toast.success('Doctor updated successfully')
        }
      } else {
        await createDoctor(payload)
        toast.success('Doctor created successfully')
      }
      navigate(returnTo)
    } catch (error) {
      console.error('Error saving doctor:', error)
      toast.error(error.message || 'Failed to save doctor')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-r-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading doctor data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleHeaderBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-primary transition shadow-sm"
          >
            <IoArrowBackOutline className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {shouldApproveAfterSave ? 'Complete Doctor Details' : isEditMode ? 'Edit Doctor' : 'Add New Doctor'}
            </h1>
            <p className="text-sm text-slate-500">
              {shouldApproveAfterSave
                ? 'Fill all remaining doctor profile fields before approval'
                : isEditMode
                  ? 'Update existing doctor details'
                  : 'Register a new doctor in the system'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button
            onClick={() => navigate(returnTo)}
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <IoCloseOutline className="h-5 w-5" />
            Cancel
          </button>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { step: 1, label: 'Basic Info' },
            { step: 2, label: 'Professional' },
            { step: 3, label: 'Additional' },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2 relative z-10">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    currentStep === item.step
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : currentStep > item.step
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {currentStep > item.step ? '✓' : item.step}
                </div>
                <span className={`text-xs font-bold ${currentStep === item.step ? 'text-primary' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </div>
              {index < 2 && (
                <div className="flex-1 h-1 mx-4 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: currentStep > item.step ? '100%' : '0%' }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 sm:p-8">
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">First Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoPersonOutline className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Enter first name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Last Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoPersonOutline className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Email Address <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoMailOutline className="h-5 w-5" />
                    </span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="doctor@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Phone Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoCallOutline className="h-5 w-5" />
                    </span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                        handleInputChange('phone', val)
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Enter 10-digit number"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Specialization <span className="text-red-500">*</span></label>
                  <div className="relative" ref={specializationDropdownRef}>
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary z-10">
                      <IoMedicalOutline className="h-5 w-5" />
                    </span>
                    <input
                      ref={specializationInputRef}
                      type="text"
                      value={formData.specialization}
                      onFocus={() => setShowSpecializationDropdown(true)}
                      onChange={(e) => {
                        setSpecializationSearchTerm(e.target.value)
                        handleInputChange('specialization', e.target.value)
                        setShowSpecializationDropdown(true)
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Type or select specialization"
                    />
                    {showSpecializationDropdown && (
                      <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {filteredSpecializations.length > 0 ? (
                          <div className="py-1">
                            {filteredSpecializations.map((spec, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  handleInputChange('specialization', spec)
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
                          <div className="px-4 py-3 text-sm text-slate-500">No results. Type to add new.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Gender <span className="text-red-500">*</span></label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">License Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoDocumentTextOutline className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="Medical license ID"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Qualification</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoSchoolOutline className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => handleInputChange('qualification', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="e.g. MBBS, MD"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.experienceYears}
                    onChange={(e) => handleInputChange('experienceYears', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Services Provided</label>
                <div className="relative" ref={servicesDropdownRef}>
                  <div 
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm flex flex-wrap gap-2 cursor-text focus-within:bg-white focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all"
                    onClick={() => setShowServicesDropdown(true)}
                  >
                    {formData.services.map((service, index) => (
                      <span key={index} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {service}
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleInputChange('services', formData.services.filter(s => s !== service)) }}>
                          <IoCloseOutline className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={serviceSearchTerm}
                      onChange={(e) => { setServiceSearchTerm(e.target.value); setShowServicesDropdown(true) }}
                      placeholder={formData.services.length === 0 ? "Select services" : ""}
                      className="flex-1 bg-transparent outline-none min-w-[120px]"
                    />
                  </div>
                  {showServicesDropdown && (
                    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      {filteredServices.length > 0 ? (
                        <div className="py-1">
                          {filteredServices.map((service, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                handleInputChange('services', [...formData.services, service])
                                setServiceSearchTerm('')
                                setShowServicesDropdown(false)
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
                            >
                              <IoBriefcaseOutline className="h-4 w-4 shrink-0" />
                              <span>{service}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500">No matching services.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Languages Spoken</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.languages.map((lang, index) => (
                    <span key={index} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
                      {lang}
                      <button type="button" onClick={() => handleInputChange('languages', formData.languages.filter(l => l !== lang))}>×</button>
                    </span>
                  ))}
                </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                      <IoLanguageOutline className="h-5 w-5" />
                    </span>
                    <input
                      type="text"
                      value={languageInput}
                      onChange={(e) => setLanguageInput(e.target.value)}
                      placeholder="e.g. English, Hindi"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (languageInput.trim() && !formData.languages.includes(languageInput.trim())) {
                            handleInputChange('languages', [...formData.languages, languageInput.trim()])
                            setLanguageInput('')
                          }
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 pr-20 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (languageInput.trim() && !formData.languages.includes(languageInput.trim())) {
                          handleInputChange('languages', [...formData.languages, languageInput.trim()])
                          setLanguageInput('')
                        }
                      }}
                      className="absolute right-2 top-1.5 bottom-1.5 px-3 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Add
                    </button>
                  </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Education</label>
                <div className="space-y-3">
                  {formData.education.map((edu, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <input
                        placeholder="Institution"
                        value={edu.institution}
                        onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                      <input
                        placeholder="Degree"
                        value={edu.degree}
                        onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          placeholder="Year"
                          type="number"
                          value={edu.year}
                          onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        />
                        <button type="button" onClick={() => removeEducation(index)} className="text-red-500 hover:text-red-700">
                          <IoCloseOutline className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addEducation} className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark">
                    <IoAddOutline className="h-5 w-5" /> Add Education
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700">Consultation Modes</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { value: 'in_person', label: 'Clinic Visit', icon: IoPersonOutline },
                    { value: 'voice_call', label: 'Voice Call', icon: IoCallOutline },
                    { value: 'video_call', label: 'Video Call', icon: IoVideocamOutline },
                  ].map(mode => (
                    <label 
                      key={mode.value} 
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                        formData.consultationModes.includes(mode.value)
                          ? 'border-primary bg-primary/5 text-primary shadow-sm'
                          : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-primary/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.consultationModes.includes(mode.value)}
                        onChange={() => handleModeToggle(mode.value)}
                        className="h-5 w-5 rounded-lg border-slate-300 text-primary focus:ring-primary"
                      />
                      <mode.icon className="h-5 w-5" />
                      <span className="text-sm font-semibold">{mode.label}</span>
                    </label>
                  ))}
                </div>

                {/* Conditional Fees Section */}
                {formData.consultationModes.length > 0 && (
                  <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-fadeIn">
                    <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                      <IoBriefcaseOutline className="h-4 w-4 text-primary" /> Set Consultation Fees (₹)
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                      {formData.consultationModes.includes('in_person') && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                            <IoPersonOutline className="h-3 w-3" /> Clinic Visit Fee
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.fees.inPerson.original}
                            onChange={(e) => handleInputChange('fees.inPerson.original', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            placeholder="e.g. 500"
                          />
                        </div>
                      )}
                      {formData.consultationModes.includes('voice_call') && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                            <IoCallOutline className="h-3 w-3" /> Voice Call Fee
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.fees.voiceCall.original}
                            onChange={(e) => handleInputChange('fees.voiceCall.original', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            placeholder="e.g. 300"
                          />
                        </div>
                      )}
                      {formData.consultationModes.includes('video_call') && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                            <IoVideocamOutline className="h-3 w-3" /> Video Call Fee
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.fees.videoCall.original}
                            onChange={(e) => handleInputChange('fees.videoCall.original', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                            placeholder="e.g. 400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Bio / Professional Summary</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                  placeholder="Tell patients about your background, expertise..."
                />
              </div>

              <div className="flex items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="text-sm font-bold text-slate-800">Practicing Doctor?</label>
                  <p className="text-xs text-slate-500">Enable if currently taking consultations</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('isDoctor', !formData.isDoctor)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${formData.isDoctor ? 'bg-primary' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${formData.isDoctor ? 'translate-x-5' : 'translate-x-0'} mt-0.5 ml-0.5`} />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8 animate-fadeIn">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Hospital / Clinic Name</label>
                  <input
                    type="text"
                    value={formData.clinicName}
                    onChange={(e) => handleInputChange('clinicName', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="e.g. HealthFirst Clinic"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-6 space-y-6">
                  <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2">
                    <IoLocationOutline className="h-5 w-5 text-primary" /> Hospital Address
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Address Line 1</label>
                      <input
                        type="text"
                        value={formData.clinicAddress.line1}
                        onChange={(e) => handleInputChange('clinicAddress.line1', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="Street address"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">State</label>
                      <select
                        value={formData.clinicAddress.state}
                        onChange={(e) => {
                          handleInputChange('clinicAddress.state', e.target.value)
                          handleInputChange('clinicAddress.city', '')
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none transition-all"
                      >
                        <option value="">Select State</option>
                        {statesList.map(state => <option key={state._id} value={state.name}>{state.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">City</label>
                      <select
                        value={formData.clinicAddress.city}
                        onChange={(e) => handleInputChange('clinicAddress.city', e.target.value)}
                        disabled={!formData.clinicAddress.state}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none transition-all disabled:bg-slate-50"
                      >
                        <option value="">Select City</option>
                        {citiesList.map(city => <option key={city._id} value={city.name}>{city.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Postal Code</label>
                      <input
                        type="text"
                        value={formData.clinicAddress.postalCode}
                        onChange={(e) => handleInputChange('clinicAddress.postalCode', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none transition-all"
                        placeholder="6-digit code"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
                      <input
                        type="text"
                        value={formData.clinicAddress.country}
                        onChange={(e) => handleInputChange('clinicAddress.country', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <IoDocumentTextOutline className="h-5 w-5 text-primary" /> Verification Documents (PDF)
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => handleFileChange(e, 'documents')}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {formData.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="text-sm truncate max-w-[200px]">{doc.name}</span>
                          <button type="button" onClick={() => removeFile('documents', index)} className="text-red-500"><IoCloseOutline className="h-5 w-5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <IoImageOutline className="h-5 w-5 text-primary" /> Hospital Images
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileChange(e, 'clinicImages')}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {formData.clinicImages.map((img, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group">
                          <img src={img.data || img.url} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeFile('clinicImages', index)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <IoCloseOutline className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
              currentStep === 1
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm border border-slate-200'
            }`}
          >
            Back
          </button>
          
          <div className="flex items-center gap-3">
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/20 transition-all"
              >
                Continue
                <IoArrowForwardOutline className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md shadow-green-600/20 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <IoSaveOutline className="h-5 w-5" />
                    {shouldApproveAfterSave ? 'Save & Approve' : isEditMode ? 'Update Doctor' : 'Complete Registration'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDoctorForm
