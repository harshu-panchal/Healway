// Doctor service utilities for API calls
import { ApiClient, storeTokens, clearTokens, getRefreshToken } from '../../../utils/apiClient'

// Create doctor-specific API client
const apiClient = new ApiClient('doctor')

/**
 * Doctor signup
 * @param {object} signupData - Signup data
 * @returns {Promise<object>} Response data with doctor
 */
export const signupDoctor = async (signupData) => {
  try {
    const response = await apiClient.post('/doctors/auth/signup', signupData)
    if (!response.success) {
      throw new Error(response.message || 'Signup failed')
    }
    return response.data
  } catch (error) {
    console.error('Error signing up:', error)
    throw error
  }
}

/**
 * Request login OTP
 * @param {string} phone - Phone number
 * @returns {Promise<object>} Response data
 */
export const requestLoginOtp = async (phone) => {
  try {
    const response = await apiClient.post('/doctors/auth/login/otp', { phone })
    if (!response.success) {
      throw new Error(response.message || 'Failed to request OTP')
    }
    return response;
  } catch (error) {
    console.error('Error requesting OTP:', error)
    throw error
  }
}

/**
 * Verify OTP and login
 * @param {object} credentials - Login credentials (phone, otp)
 * @returns {Promise<object>} Response data with doctor and tokens
 */
export const loginDoctor = async (credentials) => {
  try {
    const response = await apiClient.post('/doctors/auth/login', credentials)
    if (!response.success) {
      throw new Error(response.message || 'Login failed')
    }
    return response.data
  } catch (error) {
    console.error('Error logging in:', error)
    throw error
  }
}

/**
 * Create an announcement
 * @param {object} announcementData
 * @returns {Promise<object>}
 */
export const createAnnouncement = async (announcementData) => {
  try {
    const response = await apiClient.post('/doctors/announcements', announcementData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to create announcement')
    }
    return response.data
  } catch (error) {
    console.error('Error creating announcement:', error)
    throw error
  }
}

/**
 * Get current doctor's announcements
 * @returns {Promise<object>}
 */
export const getMyAnnouncements = async () => {
  try {
    const response = await apiClient.get('/doctors/announcements')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch announcements')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching announcements:', error)
    throw error
  }
}

/**
 * Update an announcement
 * @param {string} id
 * @param {object} announcementData
 * @returns {Promise<object>}
 */
export const updateAnnouncement = async (id, announcementData) => {
  try {
    const response = await apiClient.patch(`/doctors/announcements/${id}`, announcementData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to update announcement')
    }
    return response.data
  } catch (error) {
    console.error('Error updating announcement:', error)
    throw error
  }
}

/**
 * Delete an announcement
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteAnnouncement = async (id) => {
  try {
    const response = await apiClient.delete(`/doctors/announcements/${id}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete announcement')
    }
    return response.data
  } catch (error) {
    console.error('Error deleting announcement:', error)
    throw error
  }
}

/**
 * Store doctor tokens after login
 * @param {object} tokens - Tokens object (accessToken, refreshToken)
 * @param {boolean} remember - Whether to use localStorage
 */
export const storeDoctorTokens = (tokens, remember = true) => {
  storeTokens('doctor', tokens, remember)
}

/**
 * Clear doctor tokens on logout
 */
export const clearDoctorTokens = () => {
  clearTokens('doctor')
}

/**
 * Get doctor profile
 * @returns {Promise<object>} Doctor profile data
 */
export const getDoctorProfile = async () => {
  try {
    const response = await apiClient.get('/doctors/auth/me')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch profile')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching doctor profile:', error)
    throw error
  }
}

/**
 * Update doctor profile
 * @param {object} profileData - Profile data to update
 * @returns {Promise<object>} Updated profile data
 */
export const updateDoctorProfile = async (profileData) => {
  try {
    const response = await apiClient.put('/doctors/auth/me', profileData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to update profile')
    }
    return response.data
  } catch (error) {
    console.error('Error updating doctor profile:', error)
    throw error
  }
}

/**
 * Doctor logout
 * @returns {Promise<object>} Response data
 */
export const logoutDoctor = async () => {
  try {
    // Get refresh token before clearing
    const refreshToken = getRefreshToken('doctor')

    // Call backend logout API to blacklist tokens
    await apiClient.post('/doctors/auth/logout', {
      refreshToken: refreshToken || null
    }).catch((error) => {
      // Even if backend call fails, we still clear tokens on frontend
      console.error('Error calling logout API:', error)
    })

    // Clear all tokens from storage
    clearDoctorTokens()

    return { success: true, message: 'Logout successful' }
  } catch (error) {
    console.error('Error logging out:', error)
    // Clear tokens even if there's an error
    clearDoctorTokens()
    throw error
  }
}

/**
 * Get doctor dashboard data
 * @returns {Promise<object>} Dashboard data
 */
export const getDoctorDashboard = async () => {
  try {
    const response = await apiClient.get('/doctors/dashboard/stats')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch dashboard data')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching doctor dashboard:', error)
    throw error
  }
}

/**
 * Get doctor appointments
 * @param {object} filters - Filter options (status, date, etc.)
 * @returns {Promise<object>} Appointments data
 */
export const getDoctorAppointments = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/appointments', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch appointments')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching doctor appointments:', error)
    throw error
  }
}

/**
 * Get doctor queue (today's appointments)
 * @param {string} date - Date in YYYY-MM-DD format (optional)
 * @returns {Promise<object>} Queue data
 */
export const getDoctorQueue = async (date) => {
  try {
    const params = date ? { date } : {}
    const response = await apiClient.get('/doctors/queue', params)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch queue')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching doctor queue:', error)
    throw error
  }
}

/**
 * Update queue status
 * @param {string} appointmentId - Appointment ID
 * @param {string} status - Status (waiting, in-consultation, completed, no-show)
 * @returns {Promise<object>} Updated appointment data
 */
export const updateQueueStatus = async (appointmentId, status) => {
  try {
    const response = await apiClient.patch(`/doctors/queue/${appointmentId}/status`, { status })
    if (!response.success) {
      throw new Error(response.message || 'Failed to update queue status')
    }
    return response.data
  } catch (error) {
    console.error('Error updating queue status:', error)
    throw error
  }
}

/**
 * Mark appointment as paid (Cash)
 * @param {string} appointmentId 
 * @returns {Promise<object>}
 */
export const markAppointmentAsPaid = async (appointmentId) => {
  try {
    const response = await apiClient.patch(`/doctors/queue/${appointmentId}/pay`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to mark as paid')
    }
    return response.data
  } catch (error) {
    console.error('Error marking as paid:', error)
    throw error
  }
}

/**
 * Update appointment status
 * @param {string} appointmentId - Appointment ID
 * @param {object} updateData - Update data (status, cancelReason, etc.)
 * @returns {Promise<object>} Updated appointment data
 */
export const updateDoctorAppointment = async (appointmentId, updateData) => {
  try {
    const response = await apiClient.patch(`/doctors/appointments/${appointmentId}`, updateData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to update appointment')
    }
    return response.data
  } catch (error) {
    console.error('Error updating appointment:', error)
    throw error
  }
}

/**
 * Cancel appointment
 * @param {string} appointmentId - Appointment ID
 * @param {string} cancelReason - Reason for cancellation
 * @returns {Promise<object>} Cancelled appointment data
 */
export const cancelDoctorAppointment = async (appointmentId, cancelReason) => {
  try {
    const response = await apiClient.patch(`/doctors/appointments/${appointmentId}`, {
      status: 'cancelled',
      cancelReason,
      cancelledBy: 'doctor',
      cancelledAt: new Date().toISOString(),
    })
    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel appointment')
    }
    return response.data
  } catch (error) {
    console.error('Error canceling appointment:', error)
    throw error
  }
}



/**
 * Get doctor patients list
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Patients data
 */
export const getDoctorPatients = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/patients/all', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch patients')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching doctor patients:', error)
    throw error
  }
}

/**
 * Get patient by ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<object>} Patient data
 */
export const getPatientById = async (patientId) => {
  try {
    const response = await apiClient.get(`/doctors/patients/${patientId}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch patient')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching patient:', error)
    throw error
  }
}

/**
 * Get patient history
 * @param {string} patientId - Patient ID
 * @returns {Promise<object>} Patient history data
 */
export const getPatientHistory = async (patientId) => {
  try {
    const response = await apiClient.get(`/doctors/patients/${patientId}/history`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch patient history')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching patient history:', error)
    throw error
  }
}

/**
 * Get patient queue (today's appointments)
 * @returns {Promise<object>} Queue data
 */
export const getPatientQueue = async (date = null) => {
  try {
    // If no date provided, use today's date in YYYY-MM-DD format
    let url = '/doctors/patients/queue'
    if (date) {
      url += `?date=${date}`
    } else {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      const todayStr = `${year}-${month}-${day}`
      url += `?date=${todayStr}`
    }
    const response = await apiClient.get(url)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch patient queue')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching patient queue:', error)
    throw error
  }
}

/**
 * Get doctor consultations (today's consultations)
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Consultations data
 */
export const getDoctorConsultations = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/consultations', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch consultations')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching doctor consultations:', error)
    throw error
  }
}

/**
 * Get all doctor consultations
 * @param {object} filters - Filter options
 * @returns {Promise<object>} All consultations data
 */
export const getAllDoctorConsultations = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/consultations/all', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch all consultations')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching all doctor consultations:', error)
    throw error
  }
}

/**
 * Get consultation by ID
 * @param {string} consultationId - Consultation ID
 * @returns {Promise<object>} Consultation data
 */
export const getConsultationById = async (consultationId) => {
  try {
    const response = await apiClient.get(`/doctors/consultations/${consultationId}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch consultation')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching consultation:', error)
    throw error
  }
}

/**
 * Create consultation
 * @param {object} consultationData - Consultation data
 * @returns {Promise<object>} Created consultation data
 */
export const createConsultation = async (consultationData) => {
  try {
    const response = await apiClient.post('/doctors/consultations', consultationData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to create consultation')
    }
    return response.data
  } catch (error) {
    console.error('Error creating consultation:', error)
    throw error
  }
}

/**
 * Update consultation
 * @param {string} consultationId - Consultation ID
 * @param {object} consultationData - Updated consultation data
 * @returns {Promise<object>} Updated consultation data
 */
export const updateConsultation = async (consultationId, consultationData) => {
  try {
    const response = await apiClient.patch(`/doctors/consultations/${consultationId}`, consultationData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to update consultation')
    }
    return response.data
  } catch (error) {
    console.error('Error updating consultation:', error)
    throw error
  }
}

/**
 * Get doctor wallet balance
 * @returns {Promise<object>} Wallet balance data
 */
export const getDoctorWalletBalance = async () => {
  try {
    const response = await apiClient.get('/doctors/wallet/balance')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch wallet balance')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    throw error
  }
}

/**
 * Get doctor wallet earnings
 * @param {object} filters - Filter options (period, etc.)
 * @returns {Promise<object>} Earnings data
 */
export const getDoctorWalletEarnings = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/wallet/earnings', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch wallet earnings')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching wallet earnings:', error)
    throw error
  }
}

/**
 * Get doctor wallet transactions
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Transactions data
 */
export const getDoctorWalletTransactions = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/wallet/transactions', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch wallet transactions')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching wallet transactions:', error)
    throw error
  }
}

/**
 * Get doctor withdrawal requests
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Withdrawal requests data
 */
export const getDoctorWithdrawals = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/wallet/withdrawals', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch withdrawals')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching withdrawals:', error)
    throw error
  }
}

/**
 * Request withdrawal
 * @param {object} withdrawalData - Withdrawal request data (amount, bankAccount, etc.)
 * @returns {Promise<object>} Created withdrawal request data
 */
export const requestWithdrawal = async (withdrawalData) => {
  try {
    const response = await apiClient.post('/doctors/wallet/withdraw', withdrawalData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to request withdrawal')
    }
    return response.data
  } catch (error) {
    console.error('Error requesting withdrawal:', error)
    throw error
  }
}

/**
 * Create support ticket
 * @param {object} ticketData - Support ticket data (subject, message, priority)
 * @returns {Promise<object>} Created ticket data
 */
export const createSupportTicket = async (ticketData) => {
  try {
    const response = await apiClient.post('/doctors/support', ticketData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to create support ticket')
    }
    return response.data
  } catch (error) {
    console.error('Error creating support ticket:', error)
    throw error
  }
}

/**
 * Get support tickets
 * @param {object} filters - Optional filters (status, page, limit)
 * @returns {Promise<object>} Support tickets data
 */
export const getSupportTickets = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/support', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch support tickets')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    throw error
  }
}

/**
 * Get support history
 * @param {object} filters - Optional filters (page, limit)
 * @returns {Promise<object>} Support history data
 */
export const getSupportHistory = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/support/history', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch support history')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching support history:', error)
    throw error
  }
}

/**
 * Upload profile image
 * @param {File} file - Image file
 * @returns {Promise<object>} Response data with URL
 */
export const uploadProfileImage = async (file) => {
  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await apiClient.upload('/doctors/upload/profile-image', formData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to upload profile image')
    }
    return response.data
  } catch (error) {
    console.error('Error uploading profile image:', error)
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

    const response = await apiClient.upload('/doctors/upload/announcement-image', formData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to upload announcement image')
    }
    return response;
  } catch (error) {
    console.error('Error uploading announcement image:', error)
    throw error
  }
}

/**
 * Upload digital signature
 * @param {File} file - Image file
 * @returns {Promise<object>} Response data with URL
 */
export const uploadSignature = async (file) => {
  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await apiClient.upload('/doctors/upload/signature', formData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to upload signature')
    }
    return response.data
  } catch (error) {
    console.error('Error uploading signature:', error)
    throw error
  }
}

/**
 * Create prescription
 * @param {object} prescriptionData - Prescription data
 * @returns {Promise<object>} Created prescription data
 */
export const createPrescription = async (prescriptionData) => {
  try {
    const response = await apiClient.post('/doctors/prescriptions', prescriptionData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to create prescription')
    }
    return response.data
  } catch (error) {
    console.error('Error creating prescription:', error)
    throw error
  }
}

/**
 * Get prescriptions
 * @param {object} filters - Filter options (patientId, consultationId, etc.)
 * @returns {Promise<object>} Prescriptions data
 */
export const getPrescriptions = async (filters = {}) => {
  try {
    const response = await apiClient.get('/doctors/prescriptions', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch prescriptions')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching prescriptions:', error)
    throw error
  }
}

/**
 * Get prescription by ID
 * @param {string} prescriptionId - Prescription ID
 * @returns {Promise<object>} Prescription data
 */
export const getPrescriptionById = async (prescriptionId) => {
  try {
    const response = await apiClient.get(`/doctors/prescriptions/${prescriptionId}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch prescription')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching prescription:', error)
    throw error
  }
}



/**
 * Get all active specialties
 * @returns {Promise<object>}
 */
export const getSpecialties = async () => {
  try {
    const response = await apiClient.get('/specialties')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch specialties')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching specialties:', error)
    throw error
  }
}

/**
 * Get all active services
 * @returns {Promise<object>}
 */
export const getServices = async () => {
  try {
    const response = await apiClient.get('/services')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch services')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching services:', error)
    throw error
  }
}

// ============== SLOT MANAGEMENT ==============

/**
 * Get slots for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object>} Slots data
 */
export const getSlotsByDate = async (date) => {
  try {
    const response = await apiClient.get(`/doctors/slots/${date}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch slots')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching slots by date:', error)
    throw error
  }
}

/**
 * Create or update slots for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array} slots - Array of slot objects with consultationType, startTime, endTime
 * @returns {Promise<object>} Created/updated slots data
 */
export const createOrUpdateSlots = async (date, slots) => {
  try {
    const response = await apiClient.post('/doctors/slots', { date, slots })
    if (!response.success) {
      throw new Error(response.message || 'Failed to create/update slots')
    }
    return response.data
  } catch (error) {
    console.error('Error creating/updating slots:', error)
    throw error
  }
}

/**
 * Mark specific slots as free
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array<number>} slotIndices - Array of slot indices to mark as free
 * @returns {Promise<object>} Updated slots data
 */
export const freeSlots = async (date, slotIndices) => {
  try {
    const response = await apiClient.patch(`/doctors/slots/${date}/free`, { slotIndices })
    if (!response.success) {
      throw new Error(response.message || 'Failed to free slots')
    }
    return response.data
  } catch (error) {
    console.error('Error freeing slots:', error)
    throw error
  }
}

/**
 * Mark specific slots as occupied (remove free status)
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array<number>} slotIndices - Array of slot indices to mark as occupied
 * @returns {Promise<object>} Updated slots data
 */
export const occupySlots = async (date, slotIndices) => {
  try {
    const response = await apiClient.patch(`/doctors/slots/${date}/occupy`, { slotIndices })
    if (!response.success) {
      throw new Error(response.message || 'Failed to occupy slots')
    }
    return response.data
  } catch (error) {
    console.error('Error occupying slots:', error)
    throw error
  }
}

/**
 * Delete all slots for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object>} Response data
 */
export const deleteSlotsByDate = async (date) => {
  try {
    const response = await apiClient.delete(`/doctors/slots/${date}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete slots')
    }
    return response.data
  } catch (error) {
    console.error('Error deleting slots:', error)
    throw error
  }
}

/**
 * Get slots for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<object>} Slots data for the date range
 */
export const getSlotsByDateRange = async (startDate, endDate) => {
  try {
    const response = await apiClient.get('/doctors/slots/range', { startDate, endDate })
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch slots for date range')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching slots by date range:', error)
    throw error
  }
}

/**
 * Get available slots for a specific date (excludes booked ones)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object>} Available slots data
 */
export const getAvailableSlots = async (date) => {
  try {
    const response = await apiClient.get(`/doctors/slots/available/${date}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch available slots')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching available slots:', error)
    throw error
  }
}

/**
 * Get analytics summary
 * @returns {Promise<object>}
 */
export const getAnalyticsSummary = async () => {
  try {
    const response = await apiClient.get('/doctors/analytics/summary')
    return response
  } catch (error) {
    console.error('Error fetching analytics summary:', error)
    throw error
  }
}

/**
 * Get followers list
 * @param {object} params - Query params (limit, page)
 * @returns {Promise<object>}
 */
export const getFollowersList = async (params = {}) => {
  try {
    const response = await apiClient.get('/doctors/analytics/followers', params)
    return response
  } catch (error) {
    console.error('Error fetching followers list:', error)
    throw error
  }
}

/**
 * Get analytics charts data
 * @param {object} params - Query params (timeframe)
 * @returns {Promise<object>}
 */
export const getAnalyticsCharts = async (params = {}) => {
  try {
    const response = await apiClient.get('/doctors/analytics/charts', params)
    return response
  } catch (error) {
    console.error('Error fetching analytics charts:', error)
    throw error
  }
}

// ============== PATIENT AUTH (Unified Login) ==============

// Create a separate patient API client for patient auth calls
const patientApiClient = new ApiClient('patient')

/**
 * Patient signup (called from unified login page)
 * @param {object} signupData - Patient signup data
 * @returns {Promise<object>} Response data with patient
 */
export const signupPatientFromDoctor = async (signupData) => {
  try {
    const response = await patientApiClient.post('/patients/auth/signup', signupData)
    if (!response.success) {
      throw new Error(response.message || 'Signup failed')
    }
    return response.data
  } catch (error) {
    console.error('Error signing up patient:', error)
    throw error
  }
}

/**
 * Request patient login OTP (called from unified login page)
 * @param {string} phone - Phone number
 * @returns {Promise<object>} Response data
 */
export const requestPatientLoginOtp = async (phone) => {
  try {
    const response = await patientApiClient.post('/patients/auth/login/otp', { phone })
    if (!response.success) {
      throw new Error(response.message || 'Failed to request OTP')
    }
    return response
  } catch (error) {
    console.error('Error requesting patient OTP:', error)
    throw error
  }
}

/**
 * Verify patient OTP and login (called from unified login page)
 * @param {object} credentials - Login credentials (phone, otp)
 * @returns {Promise<object>} Response data with patient and tokens
 */
export const loginPatientFromDoctor = async (credentials) => {
  try {
    const response = await patientApiClient.post('/patients/auth/login', credentials)
    if (!response.success) {
      throw new Error(response.message || 'Login failed')
    }
    return response.data
  } catch (error) {
    console.error('Error logging in patient:', error)
    throw error
  }
}

/**
 * Store patient tokens after login (called from unified login page)
 * @param {object} tokens - Tokens object (accessToken, refreshToken)
 * @param {boolean} remember - Whether to use localStorage
 */
export const storePatientTokensFromDoctor = (tokens, remember = true) => {
  storeTokens('patient', tokens, remember)
}

/**
 * Get states list
 * @returns {Promise<Array>}
 */
export const getStates = async () => {
  try {
    const response = await apiClient.get('/location/state')
    return response.data
  } catch (error) {
    console.error('Error fetching states:', error)
    throw error
  }
}

/**
 * Get cities by state
 * @param {string} stateId
 * @returns {Promise<object>}
 */
export const getCitiesByState = async (stateId) => {
  try {
    const response = await apiClient.get(`/location/city/${stateId}`)
    return response.data
  } catch (error) {
    console.error('Error fetching cities:', error)
    throw error
  }
}
