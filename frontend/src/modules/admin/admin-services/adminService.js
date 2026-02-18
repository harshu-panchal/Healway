// Admin service utilities for API calls
import apiClient, { storeTokens, clearTokens } from '../../../utils/apiClient'

/**
 * Admin login
 * @param {object} credentials - Login credentials (email, password)
 * @returns {Promise<object>} Response data with admin and tokens
 */
export const loginAdmin = async (credentials) => {
  try {
    const response = await apiClient.post('/admin/auth/login', credentials)
    return response.data
  } catch (error) {
    console.error('Error logging in:', error)
    throw error
  }
}

/**
 * Get all announcements for admin
 * @returns {Promise<object>}
 */
export const getAllAnnouncements = async () => {
  try {
    const response = await apiClient.get('/admin/announcements')
    return response;
  } catch (error) {
    console.error('Error fetching announcements:', error)
    throw error
  }
}

/**
 * Create a global admin announcement
 * @param {object} announcementData
 * @returns {Promise<object>}
 */
export const createAdminAnnouncement = async (announcementData) => {
  try {
    const response = await apiClient.post('/admin/announcements', announcementData)
    return response.data
  } catch (error) {
    console.error('Error creating announcement:', error)
    throw error
  }
}

/**
 * Update any announcement
 * @param {string} id
 * @param {object} announcementData
 * @returns {Promise<object>}
 */
export const updateAdminAnnouncement = async (id, announcementData) => {
  try {
    const response = await apiClient.patch(`/admin/announcements/${id}`, announcementData)
    return response.data
  } catch (error) {
    console.error('Error updating announcement:', error)
    throw error
  }
}

/**
 * Update announcement status (Approve/Reject)
 * @param {string} id
 * @param {string} status - 'approved' or 'rejected'
 * @returns {Promise<object>}
 */
export const updateAdminAnnouncementStatus = async (id, status) => {
  try {
    const response = await apiClient.patch(`/admin/announcements/${id}/status`, { status })
    return response.data
  } catch (error) {
    console.error('Error updating announcement status:', error)
    throw error
  }
}

/**
 * Delete any announcement
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteAdminAnnouncement = async (id) => {
  try {
    const response = await apiClient.delete(`/admin/announcements/${id}`)
    return response.data
  } catch (error) {
    console.error('Error deleting announcement:', error)
    throw error
  }
}

/**
 * Get announcement metrics
 * @returns {Promise<object>}
 */
export const getAnnouncementMetrics = async () => {
  try {
    const response = await apiClient.get('/admin/announcements/metrics')
    return response
  } catch (error) {
    console.error('Error fetching announcement metrics:', error)
    throw error
  }
}

/**
 * Upload announcement image
 * @param {File} file - Image file
 * @returns {Promise<object>} Response data with URL
 */
export const uploadAnnouncementImage = async (file) => {
  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await apiClient.upload('/admin/upload/announcement-image', formData)
    return response;
  } catch (error) {
    console.error('Error uploading announcement image:', error)
    throw error
  }
}

/**
 * Store admin tokens after login/signup
 * @param {object} tokens - Tokens object (accessToken, refreshToken)
 * @param {boolean} remember - Whether to use localStorage
 */
export const storeAdminTokens = (tokens, remember = true) => {
  storeTokens('admin', tokens, remember)
}

/**
 * Clear admin tokens on logout
 */
export const clearAdminTokens = () => {
  clearTokens('admin')
}

/**
 * Get admin dashboard statistics
 */
export const getDashboardStats = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard/stats')
    return response.data
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw error
  }
}

/**
 * Get chart data for dashboard (revenue, user growth, consultations)
 */
export const getDashboardChartData = async () => {
  try {
    const response = await apiClient.get('/admin/dashboard/charts')
    return response.data
  } catch (error) {
    console.error('Error fetching dashboard chart data:', error)
    throw error
  }
}

/**
 * Get all users with filters
 */
export const getUsers = async (filters = {}) => {
  try {
    const response = await apiClient.get('/admin/users', filters)
    return response.data
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

/**
 * Get user by ID
 */
export const getUserById = async (userId) => {
  try {
    const response = await apiClient.get(`/admin/users/${userId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching user:', error)
    throw error
  }
}

/**
 * Update user status
 */
export const updateUserStatus = async (userId, status) => {
  try {
    const response = await apiClient.patch(`/admin/users/${userId}/status`, { status })
    return response.data
  } catch (error) {
    console.error('Error updating user status:', error)
    throw error
  }
}

/**
 * Delete user
 */
export const deleteUser = async (userId) => {
  try {
    const response = await apiClient.delete(`/admin/users/${userId}`)
    return response.data
  } catch (error) {
    console.error('Error deleting user:', error)
    throw error
  }
}

/**
 * Get all doctors with filters
 */
export const getDoctors = async (filters = {}) => {
  try {
    const response = await apiClient.get('/admin/doctors', filters)
    return response.data
  } catch (error) {
    console.error('Error fetching doctors:', error)
    throw error
  }
}

/**
 * Get doctor by ID
 */
export const getDoctorById = async (doctorId) => {
  try {
    const response = await apiClient.get(`/admin/doctors/${doctorId}`)
    return response;
  } catch (error) {
    console.error('Error fetching doctor:', error)
    throw error
  }
}

/**
 * Get doctor statistics (patients and appointments count)
 * @param {string} doctorId - Doctor ID
 * @param {string} filter - 'all' or 'today'
 * @returns {Promise<object>} Doctor stats data
 */
export const getDoctorStats = async (doctorId, filter = 'all') => {
  try {
    const response = await apiClient.get(`/admin/doctors/${doctorId}/stats`, { filter })
    return response;
  } catch (error) {
    console.error('Error fetching doctor stats:', error)
    throw error
  }
}

/**
 * Verify doctor
 */
export const verifyDoctor = async (doctorId, verificationData = {}) => {
  try {
    const response = await apiClient.patch(`/admin/doctors/${doctorId}/verify`, verificationData)
    return response.data
  } catch (error) {
    console.error('Error verifying doctor:', error)
    throw error
  }
}

/**
 * Reject doctor verification
 */
export const rejectDoctor = async (doctorId, reason) => {
  try {
    const response = await apiClient.patch(`/admin/doctors/${doctorId}/reject`, { reason })
    return response.data
  } catch (error) {
    console.error('Error rejecting doctor:', error)
    throw error
  }
}

// Toggle doctor featured status
export const toggleDoctorFeatured = async (doctorId, isFeatured) => {
  try {
    const response = await apiClient.patch(`/admin/doctors/${doctorId}/toggle-featured`, { isFeatured })
    return response.data
  } catch (error) {
    console.error('Error toggling doctor featured status:', error)
    throw error
  }
}

/**
 * Reorder doctors
 * @param {Array} orders - Array of { id: string, sortOrder: number }
 */
export const reorderDoctors = async (orders) => {
  try {
    const response = await apiClient.patch('/admin/doctors/reorder', { orders })
    return response.data
  } catch (error) {
    console.error('Error reordering doctors:', error)
    throw error
  }
}

/**
 * Get recent activities
 */
export const getRecentActivities = async (limit = 10) => {
  try {
    const params = limit ? { limit } : {}
    const response = await apiClient.get('/admin/dashboard/activities', params)
    return response.data
  } catch (error) {
    console.error('Error fetching recent activities:', error)
    throw error
  }
}

/**
 * Get pending verifications
 */
export const getPendingVerifications = async (filters = {}) => {
  try {
    const response = await apiClient.get('/admin/verifications/pending', filters)
    return response.data
  } catch (error) {
    console.error('Error fetching pending verifications:', error)
    throw error
  }
}

/**
 * Get admin profile
 */
export const getAdminProfile = async () => {
  try {
    const response = await apiClient.get('/admin/auth/me')
    return response.data
  } catch (error) {
    console.error('Error fetching admin profile:', error)
    throw error
  }
}

/**
 * Update admin profile
 */
export const updateAdminProfile = async (profileData) => {
  try {
    const response = await apiClient.put('/admin/auth/me', profileData)
    return response.data
  } catch (error) {
    console.error('Error updating admin profile:', error)
    throw error
  }
}

/**
 * Update admin password
 */
export const updateAdminPassword = async (passwordData) => {
  try {
    const response = await apiClient.patch('/admin/auth/me/password', passwordData)
    return response.data
  } catch (error) {
    console.error('Error updating password:', error)
    throw error
  }
}

/**
 * Get admin settings
 */
export const getAdminSettings = async () => {
  try {
    const response = await apiClient.get('/admin/settings')
    return response.data
  } catch (error) {
    console.error('Error fetching admin settings:', error)
    throw error
  }
}

/**
 * Update admin settings
 */
export const updateAdminSettings = async (settings) => {
  try {
    const response = await apiClient.patch('/admin/settings', settings)
    return response.data
  } catch (error) {
    console.error('Error updating admin settings:', error)
    throw error
  }
}

/**
 * Logout admin
 */
export const logoutAdmin = async () => {
  try {
    await apiClient.post('/admin/auth/logout')
    // Clear tokens from storage
    clearAdminTokens()
    return { success: true, message: 'Logout successful' }
  } catch (error) {
    console.error('Error logging out:', error)
    // Clear tokens even if API call fails
    clearAdminTokens()
    throw error
  }
}

/**
 * Forgot password - Request OTP
 * @param {string} email - Email address
 * @returns {Promise<object>} Response data
 */
export const forgotPassword = async (email) => {
  try {
    const response = await apiClient.post('/admin/auth/forgot-password', { email })
    return response.data
  } catch (error) {
    console.error('Error requesting password reset:', error)
    throw error
  }
}

/**
 * Verify password reset OTP
 * @param {object} data - { email, otp }
 * @returns {Promise<object>} Response data
 */
export const verifyPasswordOtp = async (data) => {
  try {
    const response = await apiClient.post('/admin/auth/verify-otp', data)
    return response.data
  } catch (error) {
    console.error('Error verifying OTP:', error)
    throw error
  }
}

/**
 * Reset password
 * @param {object} data - { email, otp, newPassword }
 * @returns {Promise<object>} Response data
 */
export const resetPassword = async (data) => {
  try {
    const response = await apiClient.post('/admin/auth/reset-password', data)
    return response.data
  } catch (error) {
    console.error('Error resetting password:', error)
    throw error
  }
}

/**
 * Get revenue overview
 * @param {string} period - 'today', 'week', 'month', 'year', or 'all'
 */
export const getRevenueOverview = async (period = 'all') => {
  try {
    const response = await apiClient.get(`/admin/revenue?period=${period}`)
    return response.data
  } catch (error) {
    console.error('Error fetching revenue overview:', error)
    throw error
  }
}

/**
 * Get provider revenue details
 * @param {string} type - 'doctor' or other providers
 * @param {string} period - 'today', 'week', 'month', 'year', or 'all'
 */
export const getProviderRevenue = async (type, period = 'all') => {
  try {
    const response = await apiClient.get(`/admin/revenue/providers/${type}?period=${period}`)
    return response.data
  } catch (error) {
    console.error('Error fetching provider revenue:', error)
    throw error
  }
}

/**
 * Get admin wallet overview
 */
export const getAdminWalletOverview = async (period = 'all') => {
  try {
    const response = await apiClient.get('/admin/wallet/overview', {
      params: { period }
    })
    return response.data
  } catch (error) {
    console.error('Error fetching wallet overview:', error)
    throw error
  }
}

/**
 * Get provider summaries (doctors, etc.)
 */
export const getProviderSummaries = async (role = null, period = 'all') => {
  try {
    const params = {}
    if (role) params.role = role
    if (period) params.period = period
    const response = await apiClient.get('/admin/wallet/providers', { params })
    return response.data
  } catch (error) {
    console.error('Error fetching provider summaries:', error)
    throw error
  }
}

/**
 * Get withdrawal requests
 */
export const getWithdrawals = async (filters = {}) => {
  try {
    const response = await apiClient.get('/admin/wallet/withdrawals', filters)
    return response.data
  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    throw error
  }
}

/**
 * Update withdrawal status
 */
export const updateWithdrawalStatus = async (withdrawalId, status, adminNote = null, payoutReference = null) => {
  try {
    const updateData = { status }
    if (adminNote) updateData.adminNote = adminNote
    if (payoutReference) updateData.payoutReference = payoutReference
    if (typeof status === 'object') {
      // If status is an object, merge it
      Object.assign(updateData, status)
    }
    const response = await apiClient.patch(`/admin/wallet/withdrawals/${withdrawalId}`, updateData)
    return response.data
  } catch (error) {
    console.error('Error updating withdrawal status:', error)
    throw error
  }
}

/**
 * Get admin wallet balance
 * @returns {Promise<object>} Wallet balance data
 */
export const getAdminWalletBalance = async () => {
  try {
    const response = await apiClient.get('/admin/wallet/balance')
    return response.data
  } catch (error) {
    console.error('Error fetching admin wallet balance:', error)
    throw error
  }
}

/**
 * Get admin wallet transactions
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Transactions data
 */
export const getAdminWalletTransactions = async (filters = {}) => {
  try {
    const response = await apiClient.get('/admin/wallet/transactions', filters)
    return response.data
  } catch (error) {
    console.error('Error fetching admin wallet transactions:', error)
    throw error
  }
}

/**
 * Get admin appointments
 * @param {object} filters - Filter options (status, dateFrom, dateTo, etc.)
 * @returns {Promise<object>} Appointments data
 */
export const getAdminAppointments = async (filters = {}) => {
  try {
    const response = await apiClient.get('/admin/appointments', filters)
    return response.data
  } catch (error) {
    console.error('Error fetching admin appointments:', error)
    throw error
  }
}

/**
 * Get admin appointment by ID
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<object>} Appointment data
 */
export const getAdminAppointmentById = async (appointmentId) => {
  try {
    const response = await apiClient.get(`/admin/appointments/${appointmentId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching appointment:', error)
    throw error
  }
}

/**
 * Update admin appointment
 * @param {string} appointmentId - Appointment ID
 * @param {object} updateData - Update data
 * @returns {Promise<object>} Updated appointment data
 */
export const updateAdminAppointment = async (appointmentId, updateData) => {
  try {
    const response = await apiClient.patch(`/admin/appointments/${appointmentId}`, updateData)
    return response.data
  } catch (error) {
    console.error('Error updating appointment:', error)
    throw error
  }
}

/**
 * Cancel admin appointment
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<object>} Response data
 */
export const cancelAdminAppointment = async (appointmentId) => {
  try {
    const response = await apiClient.delete(`/admin/appointments/${appointmentId}`)
    return response.data
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    throw error
  }
}

/**
 * Get support tickets
 * @param {object} filters - Filter options (status, priority, userType, page, limit)
 * @returns {Promise<object>} Support tickets data
 */
export const getSupportTickets = async (filters = {}) => {
  try {
    const response = await apiClient.get('/admin/support', filters)
    return response.data
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    throw error
  }
}

/**
 * Get support ticket by ID
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<object>} Support ticket data
 */
export const getSupportTicketById = async (ticketId) => {
  try {
    const response = await apiClient.get(`/admin/support/${ticketId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching support ticket:', error)
    throw error
  }
}

/**
 * Respond to support ticket
 * @param {string} ticketId - Ticket ID
 * @param {object} responseData - Response data (message, attachments)
 * @returns {Promise<object>} Response data
 */
export const respondToSupportTicket = async (ticketId, responseData) => {
  try {
    const response = await apiClient.post(`/admin/support/${ticketId}/respond`, responseData)
    return response.data
  } catch (error) {
    console.error('Error responding to support ticket:', error)
    throw error
  }
}

/**
 * Update support ticket status
 * @param {string} ticketId - Ticket ID
 * @param {string} status - New status (open, in_progress, resolved, closed)
 * @param {string} adminNote - Optional admin note
 * @returns {Promise<object>} Response data
 */
export const updateSupportTicketStatus = async (ticketId, status, adminNote = '') => {
  try {
    const response = await apiClient.patch(`/admin/support/${ticketId}/status`, { status, adminNote })
    return response.data
  } catch (error) {
    console.error('Error updating support ticket status:', error)
    throw error
  }
}

export default {
  loginAdmin,
  storeAdminTokens,
  clearAdminTokens,
  getDashboardStats,
  getDashboardChartData,
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
  getDoctors,
  getDoctorById,
  getDoctorStats,
  verifyDoctor,
  rejectDoctor,
  toggleDoctorFeatured,
  getRecentActivities,
  getPendingVerifications,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  getAdminSettings,
  updateAdminSettings,
  logoutAdmin,
  forgotPassword,
  verifyPasswordOtp,
  resetPassword,
  getRevenueOverview,
  getProviderRevenue,
  getAdminWalletOverview,
  getProviderSummaries,
  getWithdrawals,
  updateWithdrawalStatus,
  getAdminWalletBalance,
  getAdminWalletTransactions,
  getAdminAppointments,
  getAdminAppointmentById,
  updateAdminAppointment,
  cancelAdminAppointment,
  getSupportTickets,
  getSupportTicketById,
  respondToSupportTicket,
  updateSupportTicketStatus,
  getAllSpecialties: async () => {
    try {
      const response = await apiClient.get('/admin/specialties')
      return response.data
    } catch (error) {
      console.error('Error fetching specialties:', error)
      throw error
    }
  },
  createSpecialty: async (formData) => {
    try {
      const response = await apiClient.post('/admin/specialties', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch (error) {
      console.error('Error creating specialty:', error)
      throw error
    }
  },
  updateSpecialty: async (id, formData) => {
    try {
      const response = await apiClient.put(`/admin/specialties/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch (error) {
      console.error('Error updating specialty:', error)
      throw error
    }
  },
  deleteSpecialty: async (id) => {
    try {
      const response = await apiClient.delete(`/admin/specialties/${id}`)
      return response.data
    } catch (error) {
      console.error('Error deleting specialty:', error)
      throw error
    }
  },
  toggleSpecialtyStatus: async (id) => {
    try {
      const response = await apiClient.patch(`/admin/specialties/${id}/toggle`)
      return response.data
    } catch (error) {
      console.error('Error toggling specialty status:', error)
      throw error
    }
  },
  getAllServices: async () => {
    try {
      const response = await apiClient.get('/admin/services')
      return response.data
    } catch (error) {
      console.error('Error fetching services:', error)
      throw error
    }
  },
  createService: async (serviceData) => {
    try {
      const response = await apiClient.post('/admin/services', serviceData)
      return response.data
    } catch (error) {
      console.error('Error creating service:', error)
      throw error
    }
  },
  updateService: async (id, serviceData) => {
    try {
      const response = await apiClient.put(`/admin/services/${id}`, serviceData)
      return response.data
    } catch (error) {
      console.error('Error updating service:', error)
      throw error
    }
  },
  deleteService: async (id) => {
    try {
      const response = await apiClient.delete(`/admin/services/${id}`)
      return response.data
    } catch (error) {
      console.error('Error deleting service:', error)
      throw error
    }
  },
  toggleServiceStatus: async (id) => {
    try {
      const response = await apiClient.patch(`/admin/services/${id}/toggle`)
      return response.data
    } catch (error) {
      console.error('Error toggling service status:', error)
      throw error
    }
  }
}
