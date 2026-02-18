import { useState, useEffect } from 'react'
import {
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoLockClosedOutline,
  IoCreateOutline,
  IoCheckmarkCircleOutline,
  IoCloseOutline,
  IoCameraOutline,
} from 'react-icons/io5'
import { getAdminProfile, updateAdminProfile, updateAdminPassword } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'

const AdminProfile = () => {
  const toast = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profileImage: null,
  })
  const [originalData, setOriginalData] = useState(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Fetch admin profile data on component mount
  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        setIsLoading(true)
        // First try to get from localStorage/sessionStorage (stored during login)
        const storage = localStorage.getItem('adminProfile') || sessionStorage.getItem('adminProfile')
        if (storage) {
          try {
            const cachedProfile = JSON.parse(storage)
            setFormData({
              firstName: cachedProfile.name?.split(' ')[0] || cachedProfile.firstName || '',
              lastName: cachedProfile.name?.split(' ').slice(1).join(' ') || cachedProfile.lastName || '',
              email: cachedProfile.email || '',
              phone: cachedProfile.phone || '',
              profileImage: cachedProfile.profileImage || null,
            })
            setOriginalData({
              firstName: cachedProfile.name?.split(' ')[0] || cachedProfile.firstName || '',
              lastName: cachedProfile.name?.split(' ').slice(1).join(' ') || cachedProfile.lastName || '',
              email: cachedProfile.email || '',
              phone: cachedProfile.phone || '',
              profileImage: cachedProfile.profileImage || null,
            })
          } catch (e) {
            console.error('Error parsing cached profile:', e)
          }
        }

        // Then fetch fresh data from backend
        const response = await getAdminProfile()
        if (response) {
          const admin = response.admin || response
          const profileData = {
            firstName: admin.name?.split(' ')[0] || admin.firstName || '',
            lastName: admin.name?.split(' ').slice(1).join(' ') || admin.lastName || '',
            email: admin.email || '',
            phone: admin.phone || '',
            profileImage: admin.profileImage || null,
          }
          setFormData(profileData)
          setOriginalData(profileData)
          
          // Update cached profile
          const storageType = localStorage.getItem('adminAuthToken') ? localStorage : sessionStorage
          storageType.setItem('adminProfile', JSON.stringify(admin))
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error)
        toast.error('Failed to load profile data. Please refresh the page.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAdminProfile()
  }, [toast])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePasswordChange = (field, value) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    try {
      const updateData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
      }

      const response = await updateAdminProfile(updateData)
      
      setOriginalData({ ...formData })
      setIsEditing(false)
      toast.success('Profile updated successfully!')
      
      // Update cached profile
      const storage = localStorage.getItem('adminAuthToken') ? localStorage : sessionStorage
      const cachedProfile = JSON.parse(storage.getItem('adminProfile') || '{}')
      storage.setItem('adminProfile', JSON.stringify({
        ...cachedProfile,
        ...updateData,
      }))
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'Failed to update profile. Please try again.')
    }
  }

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    if (!passwordData.currentPassword) {
      toast.error('Please enter your current password')
      return
    }

    try {
      setIsUpdatingPassword(true)
      await updateAdminPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      toast.success('Password updated successfully!')
    } catch (error) {
      console.error('Error updating password:', error)
      toast.error(error.message || 'Failed to update password. Please try again.')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <section className="flex flex-col gap-3 pb-20 pt-0">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-slate-600">Loading profile...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 pb-20 pt-0">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Manage your admin profile information</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
          >
            <IoCreateOutline className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </header>

      {/* Profile Information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Profile Information</h2>
        
        {/* Profile Image */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(0,119,194,0.1)]">
              {formData.profileImage ? (
                <img
                  src={formData.profileImage}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <IoPersonOutline className="h-10 w-10 text-primary" />
              )}
            </div>
            {isEditing && (
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary-dark"
              >
                <IoCameraOutline className="h-4 w-4" />
              </button>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {formData.firstName} {formData.lastName}
            </p>
            <p className="text-xs text-slate-600">Admin</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                  {formData.firstName}
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                  {formData.lastName}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email Address</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <IoMailOutline className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                value={formData.email}
                readOnly
                disabled
                className="block w-full rounded-lg border border-slate-300 bg-slate-100 pl-10 pr-3 py-2 text-sm text-slate-600 cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">Email address cannot be changed</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Phone Number</label>
            {isEditing ? (
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <IoCallOutline className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                <IoCallOutline className="h-5 w-5 text-slate-400" />
                {formData.phone}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-dark"
            >
              <IoCheckmarkCircleOutline className="h-4 w-4" />
              Save Changes
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                if (originalData) {
                  setFormData({ ...originalData })
                }
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
            >
              <IoCloseOutline className="h-4 w-4" />
              Cancel
            </button>
          </div>
        )}
      </section>

      {/* Change Password */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <IoLockClosedOutline className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Current Password</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <IoLockClosedOutline className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter current password"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <IoLockClosedOutline className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter new password"
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm New Password</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <IoLockClosedOutline className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <button
            onClick={handlePasswordUpdate}
            disabled={isUpdatingPassword}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdatingPassword ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Updating...
              </>
            ) : (
              <>
                <IoCheckmarkCircleOutline className="h-4 w-4" />
                Update Password
              </>
            )}
          </button>
        </div>
      </section>
    </section>
  )
}

export default AdminProfile


