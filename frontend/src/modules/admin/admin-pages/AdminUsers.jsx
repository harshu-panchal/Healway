import { useState, useEffect } from 'react'
import {
  IoSearchOutline,
  IoPersonOutline,
  IoMailOutline,
  IoCallOutline,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoCreateOutline,
  IoAddOutline,
  IoTrashOutline,
  IoCloseOutline,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import { createUser, getUsers, updateUserStatus, deleteUser } from '../admin-services/adminService'
import Pagination from '../../../components/Pagination'

const AdminUsers = () => {
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [allUsers, setAllUsers] = useState([]) // Store all users for stats
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
  })

  const getEmptyUserForm = () => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
  })

  // Load users from API
  useEffect(() => {
    setCurrentPage(1) // Reset to page 1 when filter changes
  }, [statusFilter, searchTerm])

  useEffect(() => {
    loadUsers()
  }, [statusFilter, searchTerm, currentPage])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
      loadUsers()
      } else {
        setCurrentPage(1) // Reset to page 1 when search changes
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // First, load ALL users for stats (no filters)
      const allUsersResponse = await getUsers({ page: 1, limit: 1000 })
      if (allUsersResponse) {
        const allTransformed = (allUsersResponse.items || []).map(user => ({
          id: user._id || user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          status: user.isActive ? 'active' : 'inactive', // Map isActive to status
          registeredAt: user.createdAt || new Date().toISOString(),
          totalConsultations: 0, // TODO: Add when appointments API is ready
        }))
        setAllUsers(allTransformed)
      }
      
      // Then, load filtered users for display with pagination
      const filters = {}
      if (statusFilter !== 'all') {
        filters.status = statusFilter
      }
      if (searchTerm && searchTerm.trim()) {
        filters.search = searchTerm.trim()
      }
      filters.page = currentPage
      filters.limit = itemsPerPage
      
      console.log('🔍 Loading users with filters:', filters) // Debug log
      const response = await getUsers(filters)
      console.log('📊 Users API response:', response) // Debug log
      
      if (response) {
        const usersData = response.items || response || []
        const pagination = response.pagination || {}
        
        console.log('📋 Raw users data from API:', usersData) // Debug log
        console.log('📋 Transformed users count:', usersData.length) // Debug log
        console.log('📋 Pagination info:', pagination) // Debug log
        
        const transformedUsers = usersData.map(user => ({
          id: user._id || user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          status: user.isActive ? 'active' : 'inactive', // Map isActive to status
          registeredAt: user.createdAt || new Date().toISOString(),
          totalConsultations: 0, // TODO: Add when appointments API is ready
        }))
        console.log('📋 Transformed users:', transformedUsers) // Debug log
        setUsers(transformedUsers)
        
        // Update pagination state
        setTotalPages(pagination.totalPages || 1)
        setTotalItems(pagination.total || 0)
      } else {
        console.error('❌ Invalid response from API:', response) // Debug log
        setUsers([])
        setTotalPages(1)
        setTotalItems(0)
      }
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error(error.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // No need for client-side filtering - backend handles it

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
            <IoCheckmarkCircleOutline className="h-3 w-3" />
            Active
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700">
            <IoCloseCircleOutline className="h-3 w-3" />
            Inactive
          </span>
        )
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
            <IoCloseCircleOutline className="h-3 w-3" />
            Suspended
          </span>
        )
      default:
        return null
    }
  }

  // CRUD Operations
  const handleCreate = () => {
    setEditingUser(null)
    setFormData(getEmptyUserForm())
    setShowEditModal(true)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      address: getEmptyUserForm().address,
      emergencyContact: getEmptyUserForm().emergencyContact,
      status: user.status,
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (isSaving) return

    if (editingUser) {
      // Update existing user status
      try {
        setIsSaving(true)
        await updateUserStatus(editingUser.id, formData.status)
        toast.success('User status updated successfully')
        await loadUsers()
        setShowEditModal(false)
        setEditingUser(null)
        setFormData(getEmptyUserForm())
      } catch (error) {
        console.error('Error updating user:', error)
        toast.error(error.message || 'Failed to update user')
      } finally {
        setIsSaving(false)
      }
    } else {
      if (!formData.firstName.trim() || !formData.email.trim() || !formData.phone.trim()) {
        toast.warning('Please fill first name, email, and phone.')
        return
      }

      try {
        setIsSaving(true)
        await createUser({
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
        })
        toast.success('Patient added successfully')
        await loadUsers()
        setShowEditModal(false)
        setEditingUser(null)
        setFormData(getEmptyUserForm())
      } catch (error) {
        console.error('Error creating user:', error)
        toast.error(error.message || 'Failed to add patient')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId)
        toast.success('User deleted successfully')
        await loadUsers()
      } catch (error) {
        console.error('Error deleting user:', error)
        toast.error(error.message || 'Failed to delete user')
      }
    }
  }

  const handleInputChange = (field, value) => {
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

  return (
    <section className="flex flex-col gap-2 pb-20 pt-0">
      {/* Header */}
      <header className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2.5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients Management</h1>
          <p className="mt-0.5 text-sm text-slate-600">Manage all registered patients</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:scale-[0.98]"
        >
          <IoAddOutline className="h-4 w-4" />
          Add Patient
        </button>
      </header>

      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <IoSearchOutline className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          placeholder="Search patients by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Stats Summary - Clickable Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:shadow-md ${
            statusFilter === 'all' ? 'border-primary bg-[rgba(0,119,194,0.05)]' : ''
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Patients</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-900">{allUsers.length}</p>
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:shadow-md ${
            statusFilter === 'active' ? 'border-emerald-500 bg-emerald-50' : ''
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {allUsers.filter((u) => u.status === 'active').length}
          </p>
        </button>
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:shadow-md ${
            statusFilter === 'inactive' ? 'border-slate-500 bg-slate-50' : ''
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inactive</p>
          <p className="mt-1 text-2xl font-bold text-slate-600">
            {allUsers.filter((u) => u.status === 'inactive').length}
          </p>
        </button>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suspended</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {allUsers.filter((u) => u.status === 'suspended').length}
          </p>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-600">No users found</p>
          </div>
        ) : (
          users.map((user) => (
            <article
              key={user.id}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(0,119,194,0.1)]">
                  <IoPersonOutline className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-900">
                        {user.firstName} {user.lastName}
                      </h3>
                      <div className="mt-1.5 space-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <IoMailOutline className="h-4 w-4 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <IoCallOutline className="h-4 w-4 shrink-0" />
                          <span>{user.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <IoCalendarOutline className="h-4 w-4 shrink-0" />
                          <span>Registered: {formatDate(user.registeredAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      {getStatusBadge(user.status)}
                      <button
                        type="button"
                        onClick={() => handleEdit(user)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-[rgba(0,119,194,0.1)] transition-colors"
                        aria-label="Edit user"
                      >
                        <IoCreateOutline className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete user"
                      >
                        <IoTrashOutline className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span>Consultations: {user.totalConsultations}</span>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && users.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        </div>
      )}

      {/* Edit/Create Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowEditModal(false)
            setEditingUser(null)
          }}
        >
          <div 
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <IoCloseOutline className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+91 98765 43210"
                />
              </div>

              {!editingUser && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select blood group</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'].map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">Address</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        value={formData.address.line1}
                        onChange={(e) => handleInputChange('address.line1', e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary sm:col-span-2"
                        placeholder="Address line 1"
                      />
                      <input
                        type="text"
                        value={formData.address.line2}
                        onChange={(e) => handleInputChange('address.line2', e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary sm:col-span-2"
                        placeholder="Address line 2"
                      />
                      <input
                        type="text"
                        value={formData.address.city}
                        onChange={(e) => handleInputChange('address.city', e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="City"
                      />
                      <input
                        type="text"
                        value={formData.address.state}
                        onChange={(e) => handleInputChange('address.state', e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="State"
                      />
                      <input
                        type="text"
                        value={formData.address.postalCode}
                        onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Postal code"
                      />
                      <input
                        type="text"
                        value={formData.address.country}
                        onChange={(e) => handleInputChange('address.country', e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Country"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">Emergency Contact</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <input
                        type="text"
                        value={formData.emergencyContact.name}
                        onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Name"
                      />
                      <input
                        type="tel"
                        value={formData.emergencyContact.phone}
                        onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Phone"
                      />
                      <input
                        type="text"
                        value={formData.emergencyContact.relation}
                        onChange={(e) => handleInputChange('emergencyContact.relation', e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Relation"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingUser(null)
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0e3a52] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : editingUser ? 'Update' : 'Create Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminUsers


