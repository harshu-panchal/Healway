// Patient service utilities for API calls
import { ApiClient, storeTokens, clearTokens } from '../../../utils/apiClient'

// Create patient-specific API client
const apiClient = new ApiClient('patient')

/**
 * Patient signup
 * @param {object} signupData - Signup data
 * @returns {Promise<object>} Response data with patient and tokens
 */
export const signupPatient = async (signupData) => {
  try {
    const response = await apiClient.post('/patients/auth/signup', signupData)
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
    const response = await apiClient.post('/patients/auth/login/otp', { phone })
    if (!response.success) {
      throw new Error(response.message || 'Failed to request OTP')
    }
    return response.data
  } catch (error) {
    console.error('Error requesting OTP:', error)
    throw error
  }
}

/**
 * Verify OTP and login
 * @param {object} credentials - Login credentials (phone, otp)
 * @returns {Promise<object>} Response data with patient and tokens
 */
export const loginPatient = async (credentials) => {
  try {
    const response = await apiClient.post('/patients/auth/login', credentials)
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
 * Get relevant announcements for the patient
 * @returns {Promise<object>}
 */
export const getAnnouncements = async () => {
  try {
    const response = await apiClient.get('/patients/announcements')
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
 * Store patient tokens after login/signup
 * @param {object} tokens - Tokens object (accessToken, refreshToken)
 * @param {boolean} remember - Whether to use localStorage
 */
export const storePatientTokens = (tokens, remember = true) => {
  storeTokens('patient', tokens, remember)
}

/**
 * Clear patient tokens on logout
 */
export const clearPatientTokens = () => {
  clearTokens('patient')
}

/**
 * Get patient profile
 * @returns {Promise<object>} Patient profile data
 */
export const getPatientProfile = async () => {
  try {
    const response = await apiClient.get('/patients/auth/me')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch patient profile')
    }
    return response // Return full response for proper success/data handling in component
  } catch (error) {
    console.error('Error fetching patient profile:', error)
    throw error
  }
}

/**
 * Update patient profile
 * @param {object} profileData - Profile data to update
 * @returns {Promise<object>} Updated profile data
 */
export const updatePatientProfile = async (profileData) => {
  try {
    const response = await apiClient.put('/patients/auth/me', profileData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to update patient profile')
    }
    return response // Return full response for proper success/data handling in component
  } catch (error) {
    console.error('Error updating patient profile:', error)
    throw error
  }
}

/**
 * Patient logout
 * @returns {Promise<object>} Response data
 */
export const logoutPatient = async () => {
  try {
    // Call backend logout API to blacklist tokens
    await apiClient.post('/patients/auth/logout').catch((error) => {
      // Even if backend call fails, we still clear tokens on frontend
      console.error('Error calling logout API:', error)
    })

    // Clear all tokens from storage
    clearPatientTokens()

    return { success: true, message: 'Logout successful' }
  } catch (error) {
    console.error('Error logging out:', error)
    // Clear tokens even if there's an error
    clearPatientTokens()
    throw error
  }
}

/**
 * Get patient dashboard data
 * @returns {Promise<object>} Dashboard data
 */
export const getPatientDashboard = async () => {
  try {
    const response = await apiClient.get('/patients/dashboard')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch patient dashboard')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching patient dashboard:', error)
    throw error
  }
}

/**
 * Get patient appointments list
 * @param {object} filters - Filter options (status, dateFrom, dateTo, etc.)
 * @returns {Promise<object>} Appointments data
 */
export const getPatientAppointments = async (filters = {}) => {
  try {
    const response = await apiClient.get('/patients/appointments', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch patient appointments')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching patient appointments:', error)
    throw error
  }
}

/**
 * Get upcoming appointments
 * @returns {Promise<object>} Upcoming appointments data
 */
export const getUpcomingAppointments = async () => {
  try {
    const response = await apiClient.get('/patients/appointments/upcoming')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch upcoming appointments')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error)
    throw error
  }
}

/**
 * Book an appointment
 * @param {object} appointmentData - Appointment booking data
 * @returns {Promise<object>} Created appointment data
 */
export const bookAppointment = async (appointmentData) => {
  try {
    const response = await apiClient.post('/patients/appointments', appointmentData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to book appointment')
    }
    return response;
  } catch (error) {
    console.error('Error booking appointment:', error)
    throw error
  }
}

/**
 * Cancel an appointment
 * @param {string} appointmentId - Appointment ID
 * @param {string} reason - Optional cancellation reason
 * @returns {Promise<object>} Cancellation response
 */
export const cancelAppointment = async (appointmentId, reason = '') => {
  try {
    const response = await apiClient.delete(`/patients/appointments/${appointmentId}`, { reason })
    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel appointment')
    }
    return response // Return full response to access deleted/refunded flags
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    throw error
  }
}

/**
 * Reschedule an appointment
 * @param {string} appointmentId - Appointment ID
 * @param {object} rescheduleData - Reschedule data (appointmentDate, time, reason)
 * @returns {Promise<object>} Rescheduled appointment data
 */
export const rescheduleAppointment = async (appointmentId, rescheduleData) => {
  try {
    const response = await apiClient.patch(`/patients/appointments/${appointmentId}/reschedule`, rescheduleData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to reschedule appointment')
    }
    return response;
  } catch (error) {
    console.error('Error rescheduling appointment:', error)
    throw error
  }
}

/**
 * Create payment order for an appointment
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<object>} Payment order data
 */
export const createAppointmentPaymentOrder = async (appointmentId, paymentData = {}) => {
  try {
    const response = await apiClient.post(`/patients/appointments/${appointmentId}/payment/order`, paymentData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to create payment order')
    }
    return response;
  } catch (error) {
    console.error('Error creating payment order:', error)
    throw error
  }
}

/**
 * Verify payment for an appointment
 * @param {string} appointmentId - Appointment ID
 * @param {object} paymentData - Payment data (paymentId, orderId, signature, paymentMethod)
 * @returns {Promise<object>} Payment verification response
 */
export const verifyAppointmentPayment = async (appointmentId, paymentData) => {
  try {
    const response = await apiClient.post(`/patients/appointments/${appointmentId}/payment/verify`, paymentData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to verify payment')
    }
    return response;
  } catch (error) {
    console.error('Error verifying payment:', error)
    throw error
  }
}

/**
 * Update an appointment
 * @param {string} appointmentId - Appointment ID
 * @param {object} updateData - Update data (reason, notes, etc.)
 * @returns {Promise<object>} Updated appointment data
 */
export const updateAppointment = async (appointmentId, updateData) => {
  try {
    const response = await apiClient.patch(`/patients/appointments/${appointmentId}`, updateData)
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
 * Get patient prescriptions
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Prescriptions data
 */
export const getPatientPrescriptions = async (filters = {}) => {
  try {
    const response = await apiClient.get('/patients/prescriptions', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch prescriptions')
    }
    return response;
    
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error)
    throw error
  }
}

/**
 * Get patient transactions
 * @param {object} filters - Filter options (status, type, etc.)
 * @returns {Promise<object>} Transactions data
 */
export const getPatientTransactions = async (filters = {}) => {
  try {
    const response = await apiClient.get('/patients/transactions', filters)
    return response
  } catch (error) {
    console.error('Error fetching patient transactions:', error)
    throw error
  }
}

/**
 * Get patient transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<object>} Transaction data
 */
export const getPatientTransactionById = async (transactionId) => {
  try {
    const response = await apiClient.get(`/patients/transactions/${transactionId}`)
    return response
  } catch (error) {
    console.error('Error fetching transaction details:', error)
    throw error
  }
}

/**
 * Get doctors for discovery
 * @param {object} filters - Filter options (search, specialty, city, state, etc.)
 * @returns {Promise<object>} Doctors data
 */
export const getDiscoveryDoctors = async (filters = {}) => {
  try {
    const response = await apiClient.get('/patients/doctors', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch doctors')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching doctors:', error)
    throw error
  }
}

/**
 * Get doctors (alias for getDiscoveryDoctors for backward compatibility)
 * @param {object} filters - Filter options (search, specialty, city, state, etc.)
 * @returns {Promise<object>} Doctors data
 */
export const getDoctors = getDiscoveryDoctors

/**
 * Get doctor search suggestions
 * @param {string} query - Search query text
 * @returns {Promise<Array>} Suggestions list
 */
export const getDoctorSearchSuggestions = async (query) => {
  try {
    const q = typeof query === 'string' ? query.trim() : ''
    if (q.length < 2) return []
    const response = await apiClient.get('/patients/doctors/suggestions', { q })
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch suggestions')
    }
    return response.data?.suggestions || []
  } catch (error) {
    console.error('Error fetching doctor search suggestions:', error)
    return []
  }
}

/**
 * Get doctor by ID
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<object>} Doctor data
 */
export const getDoctorById = async (doctorId) => {
  try {
    const response = await apiClient.get(`/patients/doctors/${doctorId}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch doctor details')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching doctor details:', error)
    throw error
  }
}

/**
 * Check doctor slot availability for a specific date
 * @param {string} doctorId - Doctor ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} mode - Consultation mode (IN_PERSON, CALL, VIDEO)
 * @returns {Promise<object>} Slot availability data
 */
export const checkDoctorSlotAvailability = async (doctorId, date, mode) => {
  try {
    const response = await apiClient.get(`/patients/doctors/${doctorId}/slots`, { date, mode })
    // apiClient.get returns { success, data } structure
    if (response && response.success === false) {
      throw new Error(response.message || 'Failed to check slot availability')
    }
    // Return the data directly (apiClient already unwraps it)
    return response
  } catch (error) {
    console.error('Error checking doctor slot availability:', error)
    throw error
  }
}

/**
 * Get specialties
 * @returns {Promise<object>} Specialties data
 */
export const getSpecialties = async () => {
  try {
    const response = await apiClient.get('/patients/doctors/specialties')
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
 * Get locations (cities and states)
 * @returns {Promise<object>} Locations data with cities and states
 */
export const getLocations = async () => {
  try {
    const response = await apiClient.get('/patients/doctors/locations')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch locations')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching locations:', error)
    throw error
  }
}

/**
 * Get patient requests
 * @param {object} filters - Filter options (status, type, etc.)
 * @returns {Promise<object>} Requests data
 */
export const getPatientRequests = async (filters = {}) => {
  try {
    const response = await apiClient.get('/patients/requests', filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch patient requests')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching patient requests:', error)
    throw error
  }
}

/**
 * Get request by ID
 * @param {string} requestId - Request ID
 * @returns {Promise<object>} Request data
 */
export const getPatientRequestById = async (requestId) => {
  try {
    const response = await apiClient.get(`/patients/requests/${requestId}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch request details')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching request details:', error)
    throw error
  }
}

/**
 * Get doctors by specialty
 * @param {string} specialtyId - Specialty ID
 * @param {object} filters - Optional filters (page, limit)
 * @returns {Promise<object>} Doctors data
 */
export const getSpecialtyDoctors = async (specialtyId, filters = {}) => {
  try {
    const response = await apiClient.get(`/patients/doctors/specialties/${specialtyId}/doctors`, filters)
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch specialty doctors')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching specialty doctors:', error)
    throw error
  }
}

/**
 * Get featured doctors
 * @returns {Promise<object>} Featured doctors data
 */
export const getFeaturedDoctors = async () => {
  try {
    const response = await apiClient.get('/patients/doctors/featured')
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch featured doctors')
    }
    return response.data
  } catch (error) {
    console.error('Error fetching featured doctors:', error)
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
    const response = await apiClient.post('/patients/support', ticketData)
    return response
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
    const response = await apiClient.get('/patients/support', filters)
    return response
  } catch (error) {
    console.error('Error fetching support tickets:', error)
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

    const response = await apiClient.upload('/patients/upload/profile-image', formData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to upload profile image')
    }
    return response // Return full response for proper success/data handling in component
  } catch (error) {
    console.error('Error uploading profile image:', error)
    throw error
  }
}

/**
 * Create patient request
 * @param {object} requestData - Request data (type, ...)
 * @returns {Promise<object>} Created request data
 */
export const createPatientRequest = async (requestData) => {
  try {
    const response = await apiClient.post('/patients/requests', requestData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to create request')
    }
    return response.data
  } catch (error) {
    console.error('Error creating request:', error)
    throw error
  }
}

/**
 * Create payment order for a request
 * @param {string} requestId - Request ID
 * @returns {Promise<object>} Payment order data
 */
export const createRequestPaymentOrder = async (requestId) => {
  try {
    const response = await apiClient.post(`/patients/requests/${requestId}/payment/order`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to create payment order')
    }
    return response.data
  } catch (error) {
    console.error('Error creating payment order:', error)
    throw error
  }
}

/**
 * Confirm payment for a request
 * @param {string} requestId - Request ID
 * @param {object} paymentData - Payment data (paymentId, paymentMethod, orderId, signature)
 * @returns {Promise<object>} Payment confirmation data
 */
export const confirmRequestPayment = async (requestId, paymentData) => {
  try {
    const response = await apiClient.post(`/patients/requests/${requestId}/payment`, paymentData)
    if (!response.success) {
      throw new Error(response.message || 'Failed to confirm payment')
    }
    return response.data
  } catch (error) {
    console.error('Error confirming payment:', error)
    throw error
  }
}

/**
 * Cancel a patient request
 * @param {string} requestId - Request ID
 * @returns {Promise<object>} Cancellation response
 */
export const cancelPatientRequest = async (requestId) => {
  try {
    const response = await apiClient.delete(`/patients/requests/${requestId}`)
    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel request')
    }
    return response.data
  } catch (error) {
    console.error('Error cancelling request:', error)
    throw error
  }
}

/**
 * Toggle follow doctor status
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<object>} Follow response { success, isFollowing, message }
 */
export const toggleFollowDoctor = async (doctorId) => {
  try {
    const response = await apiClient.post(`/patients/doctors/${doctorId}/follow`)
    return response
  } catch (error) {
    console.error('Error toggling follow status:', error)
    throw error
  }
}

/**
 * Get followed doctors
 * @param {object} params - Pagination params (page, limit)
 * @returns {Promise<object>} Followed doctors list
 */
export const getFollowedDoctors = async (params = {}) => {
  try {
    const response = await apiClient.get('/patients/doctors/following', params)
    return response
  } catch (error) {
    console.error('Error fetching followed doctors:', error)
    throw error
  }
}

/**
 * Record doctor profile view
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<object>} Track response
 */
export const recordDoctorProfileView = async (doctorId) => {
  try {
    const response = await apiClient.post(`/patients/doctors/${doctorId}/view`)
    return response
  } catch (error) {
    // We don't throw error for tracking as it shouldn't break UI
    console.error('Error recording profile view:', error)
    return { success: false }
  }
}
