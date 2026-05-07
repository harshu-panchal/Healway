import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatientProfile, updatePatientProfile, uploadProfileImage } from '../patient-services/patientService'
import { useToast } from '../../../contexts/ToastContext'
import { getAuthToken, getFileUrl } from '../../../utils/apiClient'
import {
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoCalendarOutline,
  IoPulseOutline,
  IoMedicalOutline,
  IoWarningOutline,
  IoNotificationsOutline,
  IoShieldCheckmarkOutline,
  IoLogOutOutline,
  IoCreateOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoCameraOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoHelpCircleOutline,
  IoTimeOutline,
  IoWalletOutline,
  IoCashOutline,
  IoEyeOutline,
  IoEyeOffOutline,
} from 'react-icons/io5'

// Mock data removed - using real backend data now

const PatientProfile = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [activeSection, setActiveSection] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef(null)
  const dobInputRef = useRef(null)
  const [newAllergy, setNewAllergy] = useState('')
  const [showBalance, setShowBalance] = useState(false)

  // Initialize with empty/default data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    profileImage: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    emergencyContact: {
      name: '',
      phone: '',
      relation: '',
    },
    allergies: [],
    walletBalance: 0,
  })

  // Fetch patient profile from backend
  useEffect(() => {
    const fetchPatientProfile = async () => {
      const token = getAuthToken('patient')
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Try to load from cache first for faster initial render
        const storage = localStorage.getItem('patientAuthToken') ? localStorage : sessionStorage
        const cachedProfile = JSON.parse(storage.getItem('patientProfile') || '{}')
        if (Object.keys(cachedProfile).length > 0) {
          // Set initial form data from cache
          const cachedData = {
            firstName: cachedProfile.firstName || '',
            lastName: cachedProfile.lastName || '',
            email: cachedProfile.email || '',
            phone: cachedProfile.phone || '',
            dateOfBirth: cachedProfile.dateOfBirth
              ? (cachedProfile.dateOfBirth.includes('T')
                ? cachedProfile.dateOfBirth.split('T')[0]
                : cachedProfile.dateOfBirth)
              : '',
            gender: cachedProfile.gender || '',
            bloodGroup: cachedProfile.bloodGroup || '',
            profileImage: cachedProfile.profileImage || '',
            address: cachedProfile.address || {
              line1: '',
              line2: '',
              city: '',
              state: '',
              postalCode: '',
              country: '',
            },
            emergencyContact: cachedProfile.emergencyContact || {
              name: '',
              phone: '',
              relation: '',
            },
            allergies: Array.isArray(cachedProfile.allergies) ? cachedProfile.allergies : [],
            walletBalance: cachedProfile.walletBalance || 0,
          }
          setFormData(cachedData)
        }

        // Then fetch fresh data from backend
        const response = await getPatientProfile()
        if (response.success && response.data) {
          const patient = response.data.patient || response.data

          // Transform backend data to frontend format
          const transformedData = {
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            email: patient.email || '',
            phone: patient.phone || '',
            dateOfBirth: patient.dateOfBirth
              ? (patient.dateOfBirth.includes('T')
                ? patient.dateOfBirth.split('T')[0]
                : patient.dateOfBirth)
              : '',
            gender: patient.gender || '',
            bloodGroup: patient.bloodGroup || '',
            profileImage: patient.profileImage || '',
            address: patient.address || {
              line1: '',
              line2: '',
              city: '',
              state: '',
              postalCode: '',
              country: '',
            },
            emergencyContact: patient.emergencyContact || {
              name: '',
              phone: '',
              relation: '',
            },
            allergies: Array.isArray(patient.allergies) ? patient.allergies : [],
            walletBalance: patient.walletBalance || 0,
          }

          setFormData(transformedData)

          // Update cache
          const storage = localStorage.getItem('patientAuthToken') ? localStorage : sessionStorage
          storage.setItem('patientProfile', JSON.stringify(patient))
        }
      } catch (error) {
        console.error('Error fetching patient profile:', error)
        toast.error('Failed to load profile data. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPatientProfile()
  }, [toast])

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  const formatAddress = (address) => {
    if (!address) return '—'
    const parts = [
      address.line1,
      address.line2,
      [address.city, address.state].filter(Boolean).join(', '),
      address.postalCode,
      address.country,
    ].filter(Boolean)
    return parts.join(', ') || '—'
  }

  const handleInputChange = (field, value) => {
    // Sanitize phone numbers and pincode
    if (field === 'phone' || field === 'emergencyContact.phone') {
      value = value.replace(/\D/g, '').slice(0, 10)
    } else if (field === 'address.postalCode') {
      value = value.replace(/\D/g, '').slice(0, 6)
    }

    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  const handleSave = async () => {
    const token = getAuthToken('patient')
    if (!token) {
      toast.error('Please login to save profile')
      return
    }

    // Validation
    if (formData.phone && formData.phone.length !== 10) {
      toast.warning('Mobile number must be exactly 10 digits')
      return
    }

    if (formData.emergencyContact?.phone && formData.emergencyContact.phone.length !== 10) {
      toast.warning('Emergency contact number must be exactly 10 digits')
      return
    }

    if (formData.address?.postalCode && formData.address.postalCode.length !== 6) {
      toast.warning('Pincode must be exactly 6 digits')
      return
    }

    try {
      setIsSaving(true)

      // Prepare data for backend (match backend expected format)
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        profileImage: formData.profileImage,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        allergies: formData.allergies,
      }

      const response = await updatePatientProfile(updateData)

      if (response.success) {
        // Update cache
        const storage = localStorage.getItem('patientAuthToken') ? localStorage : sessionStorage
        storage.setItem('patientProfile', JSON.stringify(response.data?.patient || response.data))

        toast.success('Profile updated successfully!')
        setNewAllergy('')
        setIsEditing(false)
        setActiveSection(null)
      } else {
        toast.error(response.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error(error.message || 'Failed to update profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = async () => {
    // Reload original data from backend
    try {
      const response = await getPatientProfile()
      if (response.success && response.data) {
        const patient = response.data.patient || response.data
        const transformedData = {
          firstName: patient.firstName || '',
          lastName: patient.lastName || '',
          email: patient.email || '',
          phone: patient.phone || '',
          dateOfBirth: patient.dateOfBirth
            ? (patient.dateOfBirth.includes('T')
              ? patient.dateOfBirth.split('T')[0]
              : patient.dateOfBirth)
            : '',
          gender: patient.gender || '',
          bloodGroup: patient.bloodGroup || '',
          profileImage: patient.profileImage || '',
          address: patient.address || {
            line1: '',
            line2: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
          },
          emergencyContact: patient.emergencyContact || {
            name: '',
            phone: '',
            relation: '',
          },
          allergies: Array.isArray(patient.allergies) ? patient.allergies : [],
        }
        setFormData(transformedData)
      }
    } catch (error) {
      console.error('Error reloading profile:', error)
      toast.error('Failed to reload profile data')
    }
    setNewAllergy('')
    setIsEditing(false)
    setActiveSection(null)
  }

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.warning('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('Image size should be less than 5MB')
      return
    }

    try {
      toast.info('Uploading image...')
      const response = await uploadProfileImage(file)
      if (response.success && response.data?.url) {
        setFormData((prev) => ({
          ...prev,
          profileImage: response.data.url,
        }))
        toast.success('Profile image uploaded successfully!')
      }
    } catch (error) {
      console.error('Error uploading profile image:', error)
      toast.error(error.message || 'Failed to upload profile image')
    } finally {
      // Reset input value to allow selecting the same file again
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleProfileImageClick = () => {
    fileInputRef.current?.click()
  }

  // Profile image loading is now handled in the main fetchPatientProfile useEffect

  // Show loading state
  if (isLoading) {
    return (
      <section className="flex flex-col gap-4 pb-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-slate-600">Loading profile...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4 pb-4">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-[#0077C2] via-[#0077C2] to-[var(--color-primary-dark)] px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

          <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
            {/* Profile Image */}
            <div className="relative shrink-0">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                  aria-label="Upload profile picture"
                />
                <img
                  src={formData.profileImage ? getFileUrl(formData.profileImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent((formData.firstName + ' ' + formData.lastName).trim() || 'Patient')}&background=0077C2&color=fff&size=128&bold=true`}
                  alt={`${formData.firstName} ${formData.lastName}`}
                  className="h-full w-full rounded-full object-cover ring-4 ring-white/20 shadow-xl bg-white/10"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((formData.firstName + ' ' + formData.lastName).trim() || 'Patient')}&background=0077C2&color=fff&size=128&bold=true`
                  }}
                />
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleProfileImageClick}
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-primary shadow-lg transition hover:scale-110"
                    aria-label="Change profile picture"
                  >
                    <IoCameraOutline className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {formData.firstName || formData.lastName
                  ? `${formData.firstName || ''} ${formData.lastName || ''}`.trim()
                  : 'Patient'}
              </h1>
              <p className="text-sm sm:text-base text-white/90 mb-3">{formData.email}</p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white border border-white/30">
                  <IoPulseOutline className="h-3.5 w-3.5" />
                  {formData.bloodGroup || 'Not set'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white border border-white/30">
                  <IoPersonOutline className="h-3.5 w-3.5" />
                  {formData.gender ? formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1) : 'Not set'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 rounded-lg bg-white text-primary px-4 py-2.5 text-sm font-semibold shadow-lg transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <IoCheckmarkCircleOutline className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20 active:scale-95"
                  >
                    <IoCloseOutline className="h-4 w-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {/* Actions (Edit Profile) */}
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-white text-primary px-4 py-2.5 text-sm font-bold shadow-lg transition-all hover:bg-white/90 active:scale-95 whitespace-nowrap"
                  >
                    <IoCreateOutline className="h-5 w-5" />
                    Edit Profile
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to sign out?')) {
                        try {
                          // Import logout function from patientService
                          const { logoutPatient } = await import('../patient-services/patientService')
                          await logoutPatient()
                          toast.success('Logged out successfully')
                        } catch (error) {
                          console.error('Error during logout:', error)
                          // Clear tokens manually if API call fails
                          const { clearPatientTokens } = await import('../patient-services/patientService')
                          clearPatientTokens()
                          toast.success('Logged out successfully')
                        }
                        // Navigate to login page
                        navigate('/patient/login', { replace: true })
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20 active:scale-95"
                  >
                    <IoLogOutOutline className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Wallet Card */}
      <div className="group relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/20 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-orange-100/50 blur-3xl group-hover:bg-orange-200/50 transition-colors"></div>

        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 shadow-lg shadow-orange-200 ring-4 ring-orange-50">
              <IoWalletOutline className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 mb-1 leading-none">
                Available Credits
              </span>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  {showBalance
                    ? `₹${formData.walletBalance?.toLocaleString('en-IN') || '0'}`
                    : '₹ ••••••'
                  }
                </span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm active:scale-90"
                  aria-label={showBalance ? "Hide balance" : "Show balance"}
                >
                  {showBalance ? (
                    <IoEyeOffOutline className="h-4.5 w-4.5" />
                  ) : (
                    <IoEyeOutline className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* Personal Information */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveSection(activeSection === 'personal' ? null : 'personal')}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(0,119,194,0.1)]">
                <IoPersonOutline className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Personal Information</h2>
            </div>
            {activeSection === 'personal' || isEditing ? (
              <IoChevronUpOutline className="h-5 w-5 text-slate-400" />
            ) : (
              <IoChevronDownOutline className="h-5 w-5 text-slate-400" />
            )}
          </button>

          {(activeSection === 'personal' || isEditing) && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-slate-100">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    First Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-900 py-2.5">{formData.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Last Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-900 py-2.5">{formData.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Date of Birth
                  </label>
                  {isEditing ? (
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={formData.dateOfBirth ? (() => {
                          const [y, m, d] = formData.dateOfBirth.split('-');
                          return `${d}/${m}/${y.slice(-2)}`;
                        })() : ''}
                        onClick={() => dobInputRef.current?.showPicker?.() || dobInputRef.current?.click()}
                        placeholder="DD/MM/YY"
                        className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                      />
                      <input
                        ref={dobInputRef}
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer pointer-events-none"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-600 py-2.5">
                      <IoCalendarOutline className="h-4 w-4 text-slate-400" />
                      <span>{formatDate(formData.dateOfBirth)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Gender
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-slate-900 py-2.5">
                      {formData.gender ? formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1) : 'Not set'}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Blood Group
                </label>
                {isEditing ? (
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-600 py-2.5">
                    <IoPulseOutline className="h-4 w-4 text-slate-400" />
                    <span>{formData.bloodGroup || 'Not set'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveSection(activeSection === 'contact' ? null : 'contact')}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(0,119,194,0.1)]">
                <IoCallOutline className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Contact Information</h2>
            </div>
            {activeSection === 'contact' || isEditing ? (
              <IoChevronUpOutline className="h-5 w-5 text-slate-400" />
            ) : (
              <IoChevronDownOutline className="h-5 w-5 text-slate-400" />
            )}
          </button>

          {(activeSection === 'contact' || isEditing) && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-slate-100">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-600 py-2.5">
                    <IoMailOutline className="h-4 w-4 text-slate-400" />
                    <span>{formData.email}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Phone
                </label>
                {isEditing ? (
                   <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    pattern="[0-9]{10}"
                    maxLength="10"
                    title="Phone number should be 10 digits"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-600 py-2.5">
                    <IoCallOutline className="h-4 w-4 text-slate-400" />
                    <span>{formData.phone}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Address
                </label>
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Address Line 1"
                      value={formData.address?.line1 || ''}
                      onChange={(e) => handleInputChange('address.line1', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                    />
                    <input
                      type="text"
                      placeholder="Address Line 2 (Optional)"
                      value={formData.address?.line2 || ''}
                      onChange={(e) => handleInputChange('address.line2', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        value={formData.address?.city || ''}
                        onChange={(e) => handleInputChange('address.city', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={formData.address?.state || ''}
                        onChange={(e) => handleInputChange('address.state', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Postal Code"
                        value={formData.address?.postalCode || ''}
                        onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                        pattern="[0-9]{6}"
                        maxLength="6"
                        title="Pincode should be 6 digits"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        value={formData.address?.country || ''}
                        onChange={(e) => handleInputChange('address.country', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-slate-600 py-2.5">
                    <IoLocationOutline className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>{formatAddress(formData.address)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Medical Information */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveSection(activeSection === 'medical' ? null : 'medical')}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(0,119,194,0.1)]">
                <IoMedicalOutline className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Medical Information</h2>
            </div>
            {activeSection === 'medical' || isEditing ? (
              <IoChevronUpOutline className="h-5 w-5 text-slate-400" />
            ) : (
              <IoChevronDownOutline className="h-5 w-5 text-slate-400" />
            )}
          </button>

          {(activeSection === 'medical' || isEditing) && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-slate-100">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Allergies
                </label>
                {formData.allergies && formData.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.allergies.map((allergy, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-100"
                      >
                        <IoWarningOutline className="h-3.5 w-3.5" />
                        {allergy}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedAllergies = formData.allergies.filter((_, i) => i !== index)
                              setFormData({ ...formData, allergies: updatedAllergies })
                            }}
                            className="ml-1.5 hover:bg-red-100 rounded-full p-0.5 transition-colors"
                            aria-label="Remove allergy"
                          >
                            <IoCloseOutline className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  !isEditing && <p className="text-sm text-slate-500 py-2.5 mb-3">No allergies recorded</p>
                )}

                {isEditing && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newAllergy.trim()) {
                          e.preventDefault()
                          const trimmedAllergy = newAllergy.trim()
                          if (!formData.allergies.includes(trimmedAllergy)) {
                            setFormData({
                              ...formData,
                              allergies: [...formData.allergies, trimmedAllergy]
                            })
                            setNewAllergy('')
                          } else {
                            toast.error('This allergy is already added')
                            setNewAllergy('')
                          }
                        }
                      }}
                      placeholder="Add allergy (press Enter)"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newAllergy.trim()) {
                          const trimmedAllergy = newAllergy.trim()
                          if (!formData.allergies.includes(trimmedAllergy)) {
                            setFormData({
                              ...formData,
                              allergies: [...formData.allergies, trimmedAllergy]
                            })
                            setNewAllergy('')
                          } else {
                            toast.error('This allergy is already added')
                            setNewAllergy('')
                          }
                        }
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveSection(activeSection === 'emergency' ? null : 'emergency')}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(0,119,194,0.1)]">
                <IoShieldCheckmarkOutline className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Emergency Contact</h2>
            </div>
            {activeSection === 'emergency' || isEditing ? (
              <IoChevronUpOutline className="h-5 w-5 text-slate-400" />
            ) : (
              <IoChevronDownOutline className="h-5 w-5 text-slate-400" />
            )}
          </button>

          {(activeSection === 'emergency' || isEditing) && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4 border-t border-slate-100">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.emergencyContact?.name || ''}
                      onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-900 py-2.5">
                      {formData.emergencyContact?.name || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Relation
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.emergencyContact?.relation || ''}
                      onChange={(e) => handleInputChange('emergencyContact.relation', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-900 py-2.5">
                      {formData.emergencyContact?.relation || 'Not set'}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.emergencyContact?.phone || ''}
                    onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                    pattern="[0-9]{10}"
                    maxLength="10"
                    title="Emergency contact number should be 10 digits"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-600 py-2.5">
                    <IoCallOutline className="h-4 w-4 text-slate-400" />
                    <span>{formData.emergencyContact?.phone || 'Not set'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default PatientProfile
