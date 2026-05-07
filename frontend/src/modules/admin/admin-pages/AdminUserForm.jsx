import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IoArrowBackOutline,
  IoSaveOutline,
  IoCloseOutline,
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoCalendarOutline,
  IoLocationOutline,
  IoLockClosedOutline,
  IoCall,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import adminService, {
  createUser,
  getUserById,
  updateUser,
  updateUserStatus,
} from '../admin-services/adminService'

const AdminUserForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const dateInputRef = useRef(null)
  const isEditMode = !!id

  const [loading, setLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)
  const [statesList, setStatesList] = useState([])
  const [citiesList, setCitiesList] = useState([])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
    },
    emergencyContact: {
      name: '',
      phone: '',
      relation: '',
    },
    status: 'active',
    referenceName: '',
  })

  useEffect(() => {
    fetchStates()
    if (isEditMode) {
      loadUserData()
    }
  }, [id])

  const fetchStates = async () => {
    try {
      const response = await adminService.getStates()
      if (response && response.success) {
        setStatesList(response.data || [])
      }
    } catch (error) {
      console.error('Error fetching states:', error)
    }
  }

  useEffect(() => {
    const fetchCities = async () => {
      if (formData.address.state) {
        const selectedState = statesList.find(s => s.name === formData.address.state)
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
  }, [formData.address.state, statesList])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const response = await getUserById(id)
      if (response && response.success && response.data) {
        const user = response.data
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
          gender: user.gender || '',
          bloodGroup: user.bloodGroup || '',
          address: {
            line1: user.address?.line1 || '',
            line2: user.address?.line2 || '',
            city: user.address?.city || '',
            state: user.address?.state || '',
            postalCode: user.address?.postalCode || '',
            country: user.address?.country || 'India',
          },
          emergencyContact: {
            name: user.emergencyContact?.name || '',
            phone: user.emergencyContact?.phone || '',
            relation: user.emergencyContact?.relation || '',
          },
          status: user.isActive ? 'active' : 'inactive',
          referenceName: user.referenceName || '',
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      toast.error('Failed to load patient data')
      navigate('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    // Sanitize phone numbers and pincode
    if (field === 'phone' || field === 'emergencyContact.phone') {
      value = value.replace(/\D/g, '').slice(0, 10)
    } else if (field === 'address.postalCode') {
      value = value.replace(/\D/g, '').slice(0, 6)
    }

    if (field.startsWith('address.')) {
      const key = field.replace('address.', '')
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [key]: value,
        },
      }))
      return
    }

    if (field.startsWith('emergencyContact.')) {
      const key = field.replace('emergencyContact.', '')
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [key]: value,
        },
      }))
      return
    }

    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.warning('Please fill in all required fields (First Name, Email, Phone)')
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
    if (formData.emergencyContact?.phone && formData.emergencyContact.phone.replace(/\D/g, '').length !== 10) {
      toast.warning('Emergency contact number must be 10 digits')
      return false
    }
    if (formData.address?.postalCode && formData.address.postalCode.replace(/\D/g, '').length !== 6) {
      toast.warning('Pincode must be 6 digits')
      return false
    }
    if (!isEditMode && (!formData.password || formData.password.length < 8)) {
      toast.warning('Password must be at least 8 characters long')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      setIsSaving(true)
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        isActive: formData.status === 'active',
        referenceName: formData.referenceName || '',
      }

      if (formData.password) {
        payload.password = formData.password
      }

      if (isEditMode) {
        await updateUser(id, payload)
        toast.success('Patient updated successfully')
      } else {
        await createUser(payload)
        toast.success('Patient created successfully')
      }
      navigate('/admin/users')
    } catch (error) {
      console.error('Error saving patient:', error)
      toast.error(error.message || 'Failed to save patient')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-r-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading patient data...</p>
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
            onClick={() => navigate('/admin/users')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-primary transition shadow-sm"
          >
            <IoArrowBackOutline className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditMode ? 'Edit Patient' : 'Add New Patient'}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditMode ? 'Update existing patient details' : 'Register a new patient in the system'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/users')}
          className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <IoCloseOutline className="h-5 w-5" />
          Cancel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-8">
          {/* Basic Info */}
          <section className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Basic Information</h3>
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
                    placeholder="patient@example.com"
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
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Password {!isEditMode && <span className="text-red-500">*</span>}</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                    <IoLockClosedOutline className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder={isEditMode ? "Leave blank to keep current" : "Enter password (min 8 characters)"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Date of Birth</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-primary">
                    <IoCalendarOutline className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={formData.dateOfBirth ? (() => {
                      const [y, m, d] = formData.dateOfBirth.split('-');
                      return `${d}/${m}/${y.slice(-2)}`;
                    })() : ''}
                    onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                    placeholder="DD/MM/YY"
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="absolute inset-0 h-full w-full opacity-0 cursor-pointer pointer-events-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                >
                  <option value="">Select Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Reference Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-amber-600">
                    <IoPersonOutline className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    value={formData.referenceName}
                    onChange={(e) => handleInputChange('referenceName', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 pl-11 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="Referral source name"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <IoLocationOutline className="h-5 w-5 text-primary" /> Address Details
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Address Line 1</label>
                <input
                  type="text"
                  value={formData.address.line1}
                  onChange={(e) => handleInputChange('address.line1', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">State</label>
                <select
                  value={formData.address.state}
                  onChange={(e) => {
                    handleInputChange('address.state', e.target.value)
                    handleInputChange('address.city', '')
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all"
                >
                  <option value="">Select State</option>
                  {statesList.map(state => <option key={state._id} value={state.name}>{state.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">City</label>
                <select
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  disabled={!formData.address.state}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all disabled:opacity-50"
                >
                  <option value="">Select City</option>
                  {citiesList.map(city => <option key={city._id} value={city.name}>{city.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Postal Code</label>
                <input
                  type="text"
                  value={formData.address.postalCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    handleInputChange('address.postalCode', val)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="6-digit PIN code"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>
          </section>

          {/* Emergency Contact */}
          <section className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <IoCall className="h-5 w-5 text-primary" /> Emergency Contact
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                <input
                  type="text"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Relation</label>
                <input
                  type="text"
                  value={formData.emergencyContact.relation}
                  onChange={(e) => handleInputChange('emergencyContact.relation', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="e.g. Spouse, Parent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                <input
                  type="tel"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    handleInputChange('emergencyContact.phone', val)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="10-digit number"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-end gap-3">
          <button
            onClick={() => navigate('/admin/users')}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm border border-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/20 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <IoSaveOutline className="h-5 w-5" />
                {isEditMode ? 'Update Patient' : 'Register Patient'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminUserForm
