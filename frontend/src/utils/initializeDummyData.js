// Initialize comprehensive dummy data in localStorage for all modules
// This should be called on app initialization

import {
  mockPatients,
  mockDoctors,
  mockPrescriptions,
  mockAppointments,
  mockDoctorConsultations,
  mockAdminUsers,
  mockAdminVerifications,
} from './dummyData'

export const initializeDummyData = () => {
  try {
    // Initialize Admin Module Data
    if (!localStorage.getItem('adminUsers')) {
      localStorage.setItem('adminUsers', JSON.stringify(mockAdminUsers))
    }

    if (!localStorage.getItem('adminVerifications')) {
      localStorage.setItem('adminVerifications', JSON.stringify(mockAdminVerifications))
    }

    // Initialize Admin Requests
    if (!localStorage.getItem('adminRequests')) {
      const adminRequests = []
      localStorage.setItem('adminRequests', JSON.stringify(adminRequests))
    }

    // Initialize Patient Appointments
    if (!localStorage.getItem('patientAppointments')) {
      localStorage.setItem('patientAppointments', JSON.stringify(mockAppointments))
    }

    // Initialize Doctor Appointments
    if (!localStorage.getItem('doctorAppointments')) {
      localStorage.setItem('doctorAppointments', JSON.stringify(mockAppointments))
    }

    console.log('✅ Dummy data initialized successfully!')
  } catch (error) {
    console.error('❌ Error initializing dummy data:', error)
  }
}

// Call this function on app load
if (typeof window !== 'undefined') {
  // Initialize dummy data when the module is imported
  initializeDummyData()
}
