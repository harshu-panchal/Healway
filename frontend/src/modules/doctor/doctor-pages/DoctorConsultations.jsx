import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import DoctorNavbar from '../doctor-components/DoctorNavbar'
import { useToast } from '../../../contexts/ToastContext'
import { useCall } from '../../../contexts/CallContext'
import { getDoctorConsultations, getAllDoctorConsultations, getConsultationById, createConsultation, updateConsultation, getPatientById, getPatientHistory, createPrescription, getPrescriptions, getPatientQueue, updateQueueStatus } from '../doctor-services/doctorService'
import { getSocket } from '../../../utils/socketClient'
import {
  IoDocumentTextOutline,
  IoSearchOutline,
  IoPersonOutline,
  IoMedicalOutline,
  IoAddOutline,
  IoCloseOutline,
  IoTrashOutline,
  IoDownloadOutline,
  IoAttachOutline,
  IoCheckmarkCircleOutline,
  IoTimeOutline,
  IoCalendarOutline,
  IoHeartOutline,
  IoBodyOutline,
  IoThermometerOutline,
  IoPulseOutline,
  IoWaterOutline,
  IoPrintOutline,
  IoEyeOutline,
  IoArrowBackOutline,
  IoCreateOutline,
  IoVideocamOutline,
  IoCallOutline,
} from 'react-icons/io5'

// Get doctor info from localStorage (set when doctor saves profile)
const getDoctorInfo = () => {
  try {
    const savedProfile = localStorage.getItem('doctorProfile')
    if (savedProfile) {
      const profile = JSON.parse(savedProfile)
      console.log('Loaded profile from localStorage:', profile)
      console.log('Digital Signature:', profile.digitalSignature)

      // Get signature - check multiple possible paths
      let signature = ''
      if (profile.digitalSignature?.imageUrl) {
        signature = profile.digitalSignature.imageUrl
      } else if (profile.digitalSignature) {
        // If it's a string directly
        signature = typeof profile.digitalSignature === 'string' ? profile.digitalSignature : ''
      }

      return {
        name: `${profile.firstName || 'Dr.'} ${profile.lastName || ''}`.trim() || profile.name || 'Dr. Unknown',
        qualification: profile.qualification || 'MBBS',
        licenseNumber: profile.licenseNumber || 'N/A',
        clinicName: profile.clinicDetails?.name || profile.clinicName || 'Clinic',
        clinicAddress: profile.clinicDetails?.address
          ? `${profile.clinicDetails.address.line1 || ''}${profile.clinicDetails.address.line2 ? ', ' + profile.clinicDetails.address.line2 : ''}, ${profile.clinicDetails.address.city || ''}, ${profile.clinicDetails.address.state || ''} - ${profile.clinicDetails.address.postalCode || ''}`
          : profile.clinicAddress || '',
        phone: profile.phone || profile.contactNumber || '',
        email: profile.email || '',
        specialization: profile.specialization || 'General Physician',
        digitalSignature: signature,
      }
    }
  } catch (error) {
    console.error('Error loading doctor profile:', error)
  }

  // Default fallback
  return {
    name: 'Dr. Sarah Mitchell',
    qualification: 'MBBS, MD (Cardiology)',
    licenseNumber: 'MD-12345',
    clinicName: 'Heart Care Clinic',
    clinicAddress: '123 Medical Center Drive, Suite 200, New York, NY 10001',
    phone: '+1-555-123-4567',
    email: 'sarah.mitchell@example.com',
    specialization: 'General Physician',
    digitalSignature: '',
  }
}

// Mock data removed - using API data now

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const DoctorConsultations = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const filterParam = searchParams.get('filter') || 'all'
  const isDashboardPage = location.pathname === '/doctor/dashboard' || location.pathname === '/doctor/'

  const [loadingConsultations, setLoadingConsultations] = useState(false)
  const [consultationsError, setConsultationsError] = useState(null)
  const { startCall } = useCall()

  // Helper function to calculate age from dateOfBirth
  const calculateAge = useCallback((dateOfBirth) => {
    if (!dateOfBirth) return null
    try {
      const birthDate = new Date(dateOfBirth)
      if (isNaN(birthDate.getTime())) return null
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    } catch (error) {
      console.error('Error calculating age:', error)
      return null
    }
  }, [])

  // Helper function to transform consultation data from API
  const transformConsultationData = useCallback((cons) => {
    const patientDateOfBirth = cons.patientId?.dateOfBirth
    const calculatedAge = patientDateOfBirth ? calculateAge(patientDateOfBirth) : (cons.patientId?.age || cons.age || null)

    // Format patient address properly
    let formattedAddress = 'Not provided'

    // Debug: Log address data
    if (cons.patientId?.address) {
      console.log('Address found for patient:', cons.patientId._id || cons.patientId.id, cons.patientId.address)
    }

    if (cons.patientId?.address) {
      const address = cons.patientId.address
      // Check if address object has any non-empty values
      const hasAddressData = address && typeof address === 'object' && (
        address.line1 ||
        address.line2 ||
        address.city ||
        address.state ||
        address.postalCode ||
        address.country
      )

      if (hasAddressData) {
        const addressParts = [
          address.line1,
          address.line2,
          address.city,
          address.state,
          address.postalCode,
          address.country
        ].filter(part => part && typeof part === 'string' && part.trim() !== '')

        if (addressParts.length > 0) {
          formattedAddress = addressParts.join(', ')
        }
      }
    } else if (cons.patientAddress && typeof cons.patientAddress === 'string' && cons.patientAddress.trim() !== '') {
      formattedAddress = cons.patientAddress
    }

    return {
      id: cons._id || cons.id,
      _id: cons._id || cons.id,
      appointmentId: cons.appointmentId?._id || cons.appointmentId?.id || cons.appointmentId, // Ensure appointmentId is passed
      patientId: cons.patientId?._id || cons.patientId?.id || cons.patientId || 'pat-unknown',
      patientName: cons.patientId?.firstName && cons.patientId?.lastName
        ? `${cons.patientId.firstName} ${cons.patientId.lastName}`
        : cons.patientId?.name || cons.patientName || 'Unknown Patient',
      age: calculatedAge,
      gender: cons.patientId?.gender || cons.gender || 'male',
      appointmentTime: (() => {
        if (cons.appointmentId?.appointmentDate) {
          const dateStr = typeof cons.appointmentId.appointmentDate === 'string'
            ? cons.appointmentId.appointmentDate.split('T')[0]
            : cons.appointmentId.appointmentDate instanceof Date
              ? cons.appointmentId.appointmentDate.toISOString().split('T')[0]
              : null
          if (dateStr) {
            return `${dateStr}T${cons.appointmentId.time || '00:00'}`
          }
        }
        if (cons.appointmentTime) return cons.appointmentTime
        if (cons.consultationDate) {
          const dateStr = typeof cons.consultationDate === 'string'
            ? cons.consultationDate.split('T')[0]
            : cons.consultationDate instanceof Date
              ? cons.consultationDate.toISOString().split('T')[0]
              : null
          if (dateStr) return `${dateStr}T00:00`
        }
        return new Date().toISOString()
      })(),
      appointmentDate: (() => {
        const dateValue = cons.appointmentId?.appointmentDate || cons.appointmentDate || cons.consultationDate
        if (!dateValue) return null
        if (typeof dateValue === 'string') {
          return dateValue.split('T')[0]
        }
        if (dateValue instanceof Date) {
          if (isNaN(dateValue.getTime())) return null
          return dateValue.toISOString().split('T')[0]
        }
        return null
      })(),
      appointmentType: cons.appointmentId?.appointmentType || cons.appointmentType || 'New',
      consultationMode: (() => {
        // Get mode from either field and normalize to lowercase
        const rawMode = (cons.appointmentId?.consultationMode || cons.consultationMode || cons.appointmentId?.appointmentType || cons.appointmentType || "").toLowerCase();

        if (rawMode.includes("video")) return "video_call";
        if (rawMode.includes("voice") || rawMode.includes("call") || rawMode.includes("online") || rawMode.includes("audio")) return "voice_call";

        return "in-person";
      })(),
      status: cons.status || 'pending',
      reason: cons.chiefComplaint || cons.reason || 'Consultation',
      patientImage: cons.patientId?.profileImage || cons.patientId?.image || cons.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(cons.patientId?.firstName || 'Patient')}&background=0077C2&color=fff&size=160`,
      patientPhone: cons.patientId?.phone || cons.patientPhone || '',
      patientEmail: cons.patientId?.email || cons.patientEmail || '',
      patientAddress: formattedAddress,
      diagnosis: cons.diagnosis || '',
      vitals: cons.vitals || {},
      investigations: cons.investigations || [],
      advice: cons.advice || cons.notes || '',
      attachments: cons.attachments || [],
      originalData: cons,
    }
  }, [calculateAge])

  // Fetch consultations from API
  const fetchConsultations = useCallback(async () => {
    try {
      setLoadingConsultations(true)
      setConsultationsError(null)
      const response = await getDoctorConsultations()

      if (response) {
        const consultationsData = Array.isArray(response)
          ? response
          : response.consultations || response.items || []

        // Transform API data to match component structure
        const transformed = consultationsData.map(transformConsultationData)

        // Remove duplicates based on consultation ID or patient ID + status
        const uniqueConsultations = transformed.reduce((acc, current) => {
          // Check if consultation with same ID already exists
          const existsById = acc.find(c => (c.id || c._id) === (current.id || current._id))
          if (existsById) {
            return acc // Skip duplicate
          }

          // Check if consultation with same patient ID and status already exists (for in-progress consultations)
          if (current.status === 'in-progress' || current.status === 'called') {
            const currentPatientId = current.patientId?._id || current.patientId
            const existsByPatient = acc.find(c => {
              const cPatientId = c.patientId?._id || c.patientId
              return cPatientId?.toString() === currentPatientId?.toString() &&
                (c.status === 'in-progress' || c.status === 'called')
            })
            if (existsByPatient) {
              return acc // Skip duplicate
            }
          }

          acc.push(current)
          return acc
        }, [])

        // Set consultations from API data only (without duplicates)
        setConsultations(uniqueConsultations)
      }
    } catch (err) {
      console.error('Error fetching consultations:', err)
      // Check if it's a connection error
      const isConnectionError = err.message?.includes('Failed to fetch') ||
        err.message?.includes('ERR_CONNECTION_REFUSED') ||
        err.message?.includes('NetworkError') ||
        err instanceof TypeError && err.message === 'Failed to fetch'

      if (isConnectionError) {
        setConsultationsError('Unable to connect to server. Please check if the backend server is running.')
      } else {
        setConsultationsError(err.message || 'Failed to load consultations')
      }
      // Don't show toast here as it might be too frequent
    } finally {
      setLoadingConsultations(false)
    }
  }, [transformConsultationData])

  // Fetch consultations from API
  useEffect(() => {
    // Only fetch if not viewing from all consultations page
    if (!location.state?.loadSavedData) {
      fetchConsultations()
      // Refresh every 30 seconds
      const interval = setInterval(fetchConsultations, 30000)
      return () => clearInterval(interval)
    }
  }, [location.state?.loadSavedData, fetchConsultations])

  // Consultations state - loaded from API only
  const [consultations, setConsultations] = useState([])

  // Filter consultations based on URL parameter
  const filteredConsultations = useMemo(() => {
    let filtered = consultations

    if (filterParam === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Get today's date string in YYYY-MM-DD format for comparison
      const todayDateStr = today.toISOString().split('T')[0]

      filtered = consultations.filter((consultation) => {
        // Priority 1: Use appointmentDate (YYYY-MM-DD format) - this is updated after reschedule
        if (consultation.appointmentDate) {
          const aptDateStr = consultation.appointmentDate.split('T')[0]
          return aptDateStr === todayDateStr
        }

        // Priority 2: Extract date from appointmentTime
        if (consultation.appointmentTime) {
          try {
            const appointmentDate = new Date(consultation.appointmentTime)
            if (isNaN(appointmentDate.getTime())) return false

            // Normalize to start of day for comparison
            appointmentDate.setHours(0, 0, 0, 0)
            return appointmentDate >= today && appointmentDate < tomorrow
          } catch (error) {
            console.error('Error parsing appointmentTime:', error, consultation.appointmentTime)
            return false
          }
        }

        return false
      })
    } else if (filterParam === 'pending') {
      filtered = consultations.filter((consultation) =>
        consultation.status === 'waiting' || consultation.status === 'pending'
      )
    }

    // Sort by status: in-progress/called first, then completed
    return filtered.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1
      if (a.status !== 'completed' && b.status === 'completed') return -1
      return 0
    })
  }, [consultations, filterParam])

  // Check if consultation is passed via navigation state
  const passedConsultation = location.state?.selectedConsultation

  const [selectedConsultation, setSelectedConsultation] = useState(() => {
    // First check if consultation is passed via navigation state (from all consultations page or called patient)
    if (location.state?.selectedConsultation) {
      // If loadSavedData flag is set, we're viewing from all consultations - don't check session
      if (location.state?.loadSavedData) {
        return location.state.selectedConsultation
      }
      // Otherwise, check if session is active (for called patients)
      try {
        const session = localStorage.getItem('doctorCurrentSession')
        if (!session) {
          // No active session, but if consultation is passed, still show it
          return location.state.selectedConsultation
        }
      } catch (error) {
        console.error('Error checking session:', error)
      }
      return location.state.selectedConsultation
    }

    // If no passed consultation, load from localStorage ONLY if session is active
    // This prevents showing consultations when there's no active session
    try {
      const saved = localStorage.getItem('doctorSelectedConsultation')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Only load if it's an active consultation (not completed)
        if (parsed.status === 'in-progress' || parsed.status === 'called') {
          // Check session is active - if not, don't load consultation
          const session = localStorage.getItem('doctorCurrentSession')
          if (session) {
            try {
              const sessionData = JSON.parse(session)
              // Only load if session is active
              if (sessionData.status === 'active' || sessionData.status === 'live') {
                console.log('✅ Restored consultation from localStorage with active session:', parsed)
                return parsed
              } else {
                // Session not active, clear consultation
                console.log('⚠️ Session not active, clearing consultation from localStorage')
                localStorage.removeItem('doctorSelectedConsultation')
                return null
              }
            } catch (sessionError) {
              // Invalid session data, clear consultation
              console.log('⚠️ Invalid session data, clearing consultation from localStorage')
              localStorage.removeItem('doctorSelectedConsultation')
              return null
            }
          } else {
            // No session, clear consultation
            console.log('⚠️ No active session, clearing consultation from localStorage')
            localStorage.removeItem('doctorSelectedConsultation')
            return null
          }
        } else {
          // Consultation is completed, clear it
          localStorage.removeItem('doctorSelectedConsultation')
          return null
        }
      }
    } catch (error) {
      console.error('Error loading selected consultation from localStorage:', error)
      // Clear invalid data
      localStorage.removeItem('doctorSelectedConsultation')
    }

    // If no passed consultation and no saved consultation, check for active session
    try {
      const session = localStorage.getItem('doctorCurrentSession')
      if (!session) {
        // No active session, clear consultation data
        localStorage.removeItem('doctorSelectedConsultation')
        localStorage.removeItem('doctorConsultations')
        return null
      }
    } catch (error) {
      console.error('Error checking session:', error)
    }

    // Don't auto-select from filteredConsultations - only show if explicitly called
    return null
  })

  // Save consultations to localStorage whenever they change
  useEffect(() => {
    try {
      // Save all consultations (only called patients, no mock data)
      if (consultations.length > 0) {
        localStorage.setItem('doctorConsultations', JSON.stringify(consultations))
      } else {
        localStorage.removeItem('doctorConsultations')
      }
    } catch (error) {
      console.error('Error saving consultations to localStorage:', error)
    }
  }, [consultations])

  // Save selectedConsultation to localStorage for persistence
  useEffect(() => {
    try {
      if (selectedConsultation) {
        // Only save if it's an active consultation (not completed)
        if (selectedConsultation.status === 'in-progress' || selectedConsultation.status === 'called') {
          localStorage.setItem('doctorSelectedConsultation', JSON.stringify(selectedConsultation))
        } else {
          // Remove from localStorage if completed
          localStorage.removeItem('doctorSelectedConsultation')
        }
      } else {
        localStorage.removeItem('doctorSelectedConsultation')
      }
    } catch (error) {
      console.error('Error saving selected consultation to localStorage:', error)
    }
  }, [selectedConsultation])

  // IMPORTANT: Ensure selectedConsultation is in consultations list when loaded from localStorage
  // This prevents the "empty consultation" flash when navigating back
  useEffect(() => {
    if (selectedConsultation && !location.state?.loadSavedData) {
      // Check if selectedConsultation is already in consultations list
      const exists = consultations.find((c) => {
        // Check by ID first (most reliable)
        if ((c.id || c._id) === (selectedConsultation.id || selectedConsultation._id)) {
          return true
        }
        // Also check by patient ID and status to avoid duplicates
        const cPatientId = c.patientId?._id || c.patientId
        const selectedPatientId = selectedConsultation.patientId?._id || selectedConsultation.patientId
        return cPatientId?.toString() === selectedPatientId?.toString() &&
          c.status === selectedConsultation.status &&
          (c.status === 'in-progress' || c.status === 'called')
      })

      if (!exists) {
        // Add selectedConsultation to consultations list immediately
        // This ensures it shows up right away when navigating back
        console.log('✅ Adding selectedConsultation to consultations list:', selectedConsultation)
        setConsultations((prev) => {
          // Check again to avoid duplicates (by ID and by patient+status)
          const alreadyExists = prev.find((c) => {
            // Check by ID
            if ((c.id || c._id) === (selectedConsultation.id || selectedConsultation._id)) {
              return true
            }
            // Check by patient ID and status
            const cPatientId = c.patientId?._id || c.patientId
            const selectedPatientId = selectedConsultation.patientId?._id || selectedConsultation.patientId
            return cPatientId?.toString() === selectedPatientId?.toString() &&
              c.status === selectedConsultation.status &&
              (c.status === 'in-progress' || c.status === 'called')
          })
          if (alreadyExists) {
            return prev
          }
          // Add at the beginning to show active consultations first
          return [selectedConsultation, ...prev]
        })
      }
    }
  }, [selectedConsultation, consultations, location.state?.loadSavedData])

  // Add passed consultation to consultations list and set as selected
  // Track if vitals have been manually edited to prevent auto-reset
  const [vitalsEdited, setVitalsEdited] = useState(false)
  const isRestoringRef = useRef(false) // Prevent multiple simultaneous restorations
  const lastRestoredPatientIdRef = useRef(null) // Track last restored patient to prevent unnecessary restorations
  const isConsultationActiveRef = useRef(false) // Track if doctor is actively working on consultation
  const isManuallySelectedRef = useRef(false) // Track if consultation was manually selected by doctor (clicked on)

  useEffect(() => {
    if (passedConsultation) {
      // Create a mutable copy of passedConsultation
      let updatedConsultation = { ...passedConsultation }

      // Load saved prescription data if loadSavedData flag is set
      if (location.state?.loadSavedData && passedConsultation.id) {
        const loadSavedData = async () => {
          try {
            // Load prescription from API using consultation ID
            const consultationResponse = await getConsultationById(passedConsultation.id)
            if (consultationResponse) {
              const consultation = consultationResponse

              // Transform consultation data to get updated patient info (age, email, address)
              const transformedConsultation = transformConsultationData(consultation)

              // Load prescription data from consultation
              // Only load if user hasn't manually edited vitals
              if (consultation.investigations && consultation.investigations.length > 0) {
                // Load prescription data into form
                setDiagnosis(consultation.diagnosis || '')
                setSymptoms(consultation.symptoms || '')
                setInvestigations(consultation.investigations || [])
                setAdvice(consultation.advice || '')
                setFollowUpDate(consultation.followUpDate || '')
                // Only set vitals if they haven't been manually edited
                // This prevents overwriting user input while they're typing
                if (!vitalsEdited) {
                  if (consultation.vitals && Object.keys(consultation.vitals).length > 0) {
                    setVitals(consultation.vitals)
                  } else {
                    setVitals({
                      bloodPressure: { systolic: '', diastolic: '' },
                      temperature: '',
                      pulse: '',
                      respiratoryRate: '',
                      oxygenSaturation: '',
                      weight: '',
                      height: '',
                      bmi: '',
                    })
                  }
                }
              }

              // Update consultation with fresh patient data and prescription data
              // IMPORTANT: Preserve appointmentId from passedConsultation or get from consultation
              updatedConsultation = {
                ...transformedConsultation,
                // Preserve appointmentId if it exists in passedConsultation
                appointmentId: passedConsultation.appointmentId || consultation.appointmentId?._id || consultation.appointmentId || updatedConsultation.appointmentId,
                appointmentIdObj: passedConsultation.appointmentIdObj || (consultation.appointmentId ? { _id: consultation.appointmentId._id || consultation.appointmentId } : undefined) || updatedConsultation.appointmentIdObj,
                // Preserve originalData if it exists
                originalData: passedConsultation.originalData || consultation.appointmentId || updatedConsultation.originalData,
                diagnosis: consultation.diagnosis || updatedConsultation.diagnosis || '',
                symptoms: consultation.symptoms || updatedConsultation.symptoms || '',
                vitals: consultation.vitals || updatedConsultation.vitals || {},
                investigations: consultation.investigations || updatedConsultation.investigations || [],
                advice: consultation.advice || updatedConsultation.advice || '',
                followUpDate: consultation.followUpDate || updatedConsultation.followUpDate || '',
              }
            }
          } catch (error) {
            console.error('Error loading saved prescription data:', error)
          }
        }
        loadSavedData()
      }

      setConsultations((prev) => {
        // Check if consultation already exists
        const exists = prev.find((c) => c.id === updatedConsultation.id || c.patientId === updatedConsultation.patientId)
        if (!exists) {
          // Add new consultation at the beginning
          return [updatedConsultation, ...prev]
        }
        // Update existing consultation with passed data (but preserve status if it was completed)
        return prev.map((c) => {
          if (c.id === updatedConsultation.id || c.patientId === updatedConsultation.patientId) {
            // If existing consultation is completed, don't overwrite with in-progress
            if (c.status === 'completed') {
              return c
            }
            return updatedConsultation
          }
          return c
        })
      })
      setSelectedConsultation(updatedConsultation)

      // Load shared prescriptions from consultation data (if patient shared them during booking)
      if (updatedConsultation.sharedPrescriptions && updatedConsultation.sharedPrescriptions.length > 0) {
        // Shared prescriptions are already in consultation data
        console.log('Shared prescriptions loaded:', updatedConsultation.sharedPrescriptions)
      }

      // Load patient history from API
      if (passedConsultation.patientId) {
        const loadPatientHistory = async () => {
          try {
            // Extract patient ID - handle both string and object
            const patientId = typeof passedConsultation.patientId === 'object'
              ? (passedConsultation.patientId._id || passedConsultation.patientId.id || passedConsultation.patientId)
              : passedConsultation.patientId
            const historyResponse = await getPatientHistory(patientId)
            if (historyResponse) {
              // Patient history will be used in history tab
              // If viewing from all consultations page, show history tab
              if (location.state?.loadSavedData) {
                setActiveTab('history')
              }
            }
          } catch (error) {
            console.error('Error loading patient history:', error)
          }
        }
        loadPatientHistory()
      }

      // Clear the navigation state after using it
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [passedConsultation, location.state?.loadSavedData, transformConsultationData]) // Run when passedConsultation changes

  // Consultations are managed via API - no localStorage session checks needed

  // Update selected consultation when filter changes (but only if consultation was passed)
  useEffect(() => {
    // Don't override if we just set it from passed consultation
    if (passedConsultation && selectedConsultation?.id === passedConsultation.id) {
      return
    }

    // IMPORTANT: Don't clear selectedConsultation when switching tabs or filters
    // Only clear when explicitly needed (e.g., next patient is called)
    // Keep consultation selected even if filter changes or consultations list is empty
    // This prevents consultation page from disappearing when doctor switches tabs
  }, [filteredConsultations, filterParam, passedConsultation])

  // Reset vitalsEdited flag and load vitals when consultation changes (only if not manually edited)
  useEffect(() => {
    if (selectedConsultation?.id) {
      // Only reset if this is a different consultation (check by ID)
      const currentConsultationId = selectedConsultation.id
      const lastConsultationId = lastRestoredPatientIdRef.current

      // CRITICAL: Don't reset vitals if doctor is actively working on consultation
      // Check BOTH flags to ensure we don't reset while user is typing
      if (isConsultationActiveRef.current || vitalsEdited) {
        console.log('⚠️ Preserving vitals - doctor is actively working on consultation', {
          isActive: isConsultationActiveRef.current,
          vitalsEdited,
          currentId: currentConsultationId,
          lastId: lastConsultationId
        })
        return // Don't reset anything if doctor is working
      }

      // Only reset vitals if consultation actually changed (different patient or new consultation)
      // AND user is not actively editing vitals
      if (currentConsultationId !== lastConsultationId) {
        console.log('✅ Loading vitals for new consultation:', currentConsultationId)
        // Reset edit flag when switching consultations (new consultation selected)
        setVitalsEdited(false)
        lastRestoredPatientIdRef.current = currentConsultationId
        // Reset active consultation flag when switching to new consultation
        isConsultationActiveRef.current = false

        // Load vitals from selected consultation if available
        if (selectedConsultation.vitals && Object.keys(selectedConsultation.vitals).length > 0) {
          setVitals(selectedConsultation.vitals)
        } else {
          // Reset to empty if no vitals in consultation
          setVitals({
            bloodPressure: { systolic: '', diastolic: '' },
            temperature: '',
            pulse: '',
            respiratoryRate: '',
            oxygenSaturation: '',
            weight: '',
            height: '',
            bmi: '',
          })
        }
      } else {
        // Same consultation ID - don't reset vitals even if object reference changed
        console.log('⚠️ Same consultation ID, preserving current vitals')
      }
    }
  }, [selectedConsultation?.id]) // Only run when consultation ID changes, NOT when object reference changes

  // Setup socket listener for patient call events and restore consultation state from appointment status
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const restoreConsultationFromAppointmentStatus = async () => {
      // Prevent multiple simultaneous restorations
      if (isRestoringRef.current) {
        console.log('⚠️ Restoration already in progress, skipping...')
        return
      }

      // IMPORTANT: Don't restore if doctor is actively working on consultation
      if (isConsultationActiveRef.current || vitalsEdited) {
        console.log('⚠️ Skipping restoration - doctor is actively working on consultation')
        return
      }

      try {
        isRestoringRef.current = true

        // Check if there's an active session
        const sessionStr = localStorage.getItem('doctorCurrentSession')
        if (!sessionStr) {
          isRestoringRef.current = false
          return
        }

        const session = JSON.parse(sessionStr)

        // Get today's appointments to check for called patients
        const today = new Date().toISOString().split('T')[0]
        const queueResponse = await getPatientQueue(today)

        if (queueResponse && queueResponse.appointments) {
          const appointments = queueResponse.appointments

          // Find active appointment that matches an ongoing consultation
          const calledAppointment = appointments.find(apt =>
            // In the new status flow, an active consultation might stay as 'confirmed' or 'scheduled'
            // until completed. We rely on the selectedConsultation state or socket events.
            apt.status === 'confirmed' || apt.status === 'scheduled'
          )

          // IMPORTANT: Always verify consultation state, even if already loaded from localStorage
          // If there's a called appointment but no selected consultation, restore it
          // If there's a selected consultation but appointment is no longer called, clear it
          if (calledAppointment) {
            // Check if current selected consultation matches the called appointment
            const currentPatientId = selectedConsultation?.patientId?._id || selectedConsultation?.patientId
            const calledPatientId = calledAppointment.patientId?._id || calledAppointment.patientId

            // If no selected consultation OR selected consultation doesn't match called appointment, restore
            // BUT: Don't restore if user is actively editing vitals (preserve their work)
            if ((!selectedConsultation || currentPatientId?.toString() !== calledPatientId?.toString()) && !vitalsEdited) {
              // Fetch complete patient data including email and address
              let fullPatientData = null
              try {
                const patientId = calledAppointment.patientId?._id || calledAppointment.patientId
                if (patientId) {
                  const patientResponse = await getPatientById(patientId)
                  if (patientResponse) {
                    fullPatientData = patientResponse
                    console.log('✅ Fetched full patient data for consultation restore:', fullPatientData)
                  }
                }
              } catch (error) {
                console.error('Error fetching patient data:', error)
              }

              // Format patient address
              let formattedAddress = 'Not provided'
              if (fullPatientData?.address) {
                const address = fullPatientData.address
                if (typeof address === 'object') {
                  const addressParts = []
                  if (address.line1) addressParts.push(address.line1)
                  if (address.line2) addressParts.push(address.line2)
                  if (address.city) addressParts.push(address.city)
                  if (address.state) addressParts.push(address.state)
                  if (address.pincode || address.postalCode) addressParts.push(address.pincode || address.postalCode)
                  formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Not provided'
                } else if (typeof address === 'string' && address.trim() !== '') {
                  formattedAddress = address
                }
              }

              // Calculate age from date of birth if available
              let patientAge = calledAppointment.age || calledAppointment.patientId?.age || 0
              if (fullPatientData?.dateOfBirth) {
                try {
                  const dob = new Date(fullPatientData.dateOfBirth)
                  const today = new Date()
                  let age = today.getFullYear() - dob.getFullYear()
                  const monthDiff = today.getMonth() - dob.getMonth()
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                    age--
                  }
                  if (age > 0) patientAge = age
                } catch (e) {
                  console.error('Error calculating age:', e)
                }
              }

              // Create consultation data from appointment with real patient data
              // Preserve existing vitals if user was editing - use current vitals state
              const existingVitals = vitalsEdited
                ? vitalsRef.current // Use current vitals state from ref to preserve what user is typing
                : (selectedConsultation?.vitals || {})

              const consultationData = {
                id: `cons-${calledAppointment._id || calledAppointment.id}-${Date.now()}`,
                patientId: calledAppointment.patientId?._id || calledAppointment.patientId,
                // IMPORTANT: Store appointmentId so it can be used later for saving vitals
                appointmentId: calledAppointment._id || calledAppointment.id,
                appointmentIdObj: { _id: calledAppointment._id || calledAppointment.id },
                patientName: fullPatientData?.firstName && fullPatientData?.lastName
                  ? `${fullPatientData.firstName} ${fullPatientData.lastName}`
                  : (calledAppointment.patientId?.firstName && calledAppointment.patientId?.lastName
                    ? `${calledAppointment.patientId.firstName} ${calledAppointment.patientId.lastName}`
                    : calledAppointment.patientName || 'Patient'),
                age: patientAge,
                gender: fullPatientData?.gender || calledAppointment.patientId?.gender || calledAppointment.gender || 'M',
                appointmentTime: calledAppointment.appointmentDate || new Date().toISOString(),
                appointmentType: calledAppointment.appointmentType || 'Follow-up',
                status: 'in-progress',
                reason: calledAppointment.reason || 'Consultation',
                patientImage: fullPatientData?.profileImage || calledAppointment.patientId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(calledAppointment.patientName || 'Patient')}&background=0077C2&color=fff&size=160`,
                patientPhone: fullPatientData?.phone || calledAppointment.patientId?.phone || '',
                patientEmail: fullPatientData?.email || calledAppointment.patientId?.email || '',
                patientAddress: formattedAddress,
                diagnosis: selectedConsultation?.diagnosis || '',
                symptoms: selectedConsultation?.symptoms || '',
                vitals: existingVitals, // Preserve existing vitals if editing
                investigations: selectedConsultation?.investigations || [],
                advice: selectedConsultation?.advice || '',
                followUpDate: selectedConsultation?.followUpDate || '',
                attachments: selectedConsultation?.attachments || [],
                sessionId: session._id || session.id,
                sessionDate: session.date,
                calledAt: new Date().toISOString(),
                // Store original appointment data for reference
                originalData: calledAppointment,
              }

              // If user is editing vitals for same patient, preserve current vitals state
              const currentPatientId = selectedConsultation?.patientId?._id || selectedConsultation?.patientId
              const newPatientId = consultationData.patientId?._id || consultationData.patientId
              const isSamePatient = currentPatientId?.toString() === newPatientId?.toString()

              if (vitalsEdited && isSamePatient) {
                // User is editing - preserve current vitals state
                consultationData.vitals = vitalsRef.current
                console.log('✅ Preserving current vitals state for same patient during restoration')
              }

              setConsultations((prev) => {
                const exists = prev.find((c) => c.patientId === consultationData.patientId)
                if (!exists) {
                  return [consultationData, ...prev]
                }
                return prev.map((c) =>
                  c.patientId === consultationData.patientId
                    ? (c.status === 'completed' ? c : consultationData)
                    : c
                )
              })

              // IMPORTANT: Only update selectedConsultation if user is NOT actively editing
              // If editing, preserve current consultation state to prevent vitals reset
              if (!isConsultationActiveRef.current && !vitalsEdited) {
                setSelectedConsultation(consultationData)
                // Update last restored patient ID
                lastRestoredPatientIdRef.current = consultationData.id
                console.log('✅ Restored consultation from appointment status:', consultationData)
              } else {
                console.log('⚠️ Skipping selectedConsultation update - doctor is actively working on consultation')
              }
            } else if (vitalsEdited) {
              // User is editing vitals - don't restore, preserve their work
              console.log('⚠️ Skipping restoration - user is editing vitals')
            } else {
              // Selected consultation matches called appointment - verify it's still valid
              console.log('✅ Selected consultation matches called appointment - keeping it')
            }
          } else if (selectedConsultation) {
            // No called appointment but we have a selected consultation
            // IMPORTANT: Don't clear consultation if doctor is actively working on it OR manually selected it
            if (isConsultationActiveRef.current || vitalsEdited || isManuallySelectedRef.current) {
              console.log('⚠️ Doctor is actively working on consultation or manually selected it, preserving it', {
                isActive: isConsultationActiveRef.current,
                vitalsEdited,
                manuallySelected: isManuallySelectedRef.current
              })
              return // Don't check or clear consultation while doctor is working or manually selected it
            }

            // Check if the selected consultation's appointment is still active
            const currentPatientId = selectedConsultation?.patientId?._id || selectedConsultation?.patientId
            const appointment = appointments.find(apt => {
              const aptPatientId = apt.patientId?._id || apt.patientId
              return aptPatientId?.toString() === currentPatientId?.toString()
            })

            // If appointment is completed or cancelled, clear the consultation
            // BUT only if doctor is not actively working on it AND not manually selected
            if (appointment && (appointment.status === 'completed' || appointment.status === 'cancelled' || appointment.status === 'cancelled_by_session')) {
              console.log('⚠️ Appointment is completed/cancelled, clearing consultation')
              setSelectedConsultation(null)
              localStorage.removeItem('doctorSelectedConsultation')
              lastRestoredPatientIdRef.current = null
              isManuallySelectedRef.current = false
            } else if (!appointment) {
              // Appointment not found in queue - might be from different session or doctor clicked on consultation
              // IMPORTANT: Keep consultation if doctor manually selected it (clicked on it)
              // Only clear when next patient is explicitly called
              // Don't clear just because appointment is not in current queue
              console.log('⚠️ Appointment not found in current queue, but keeping consultation (doctor may have manually selected it)')
            }
          }
        }
      } catch (error) {
        console.error('Error restoring consultation from appointment status:', error)
      } finally {
        isRestoringRef.current = false
      }
    }

    // Restore on mount - but don't block if consultation is already loaded from localStorage
    // This ensures consultation shows immediately while verification happens in background
    // Only restore if doctor is not actively working on consultation
    if (!selectedConsultation) {
      // Only restore if no consultation is already loaded (from localStorage or navigation state)
      if (!isConsultationActiveRef.current && !vitalsEdited) {
        restoreConsultationFromAppointmentStatus()
      }
    } else {
      // Consultation is already loaded, but verify it's still valid in background
      // Only verify if doctor is not actively working to prevent flickering
      if (!isConsultationActiveRef.current && !vitalsEdited) {
        // Delay verification to avoid blocking initial render
        setTimeout(() => {
          restoreConsultationFromAppointmentStatus()
        }, 1000) // Wait 1 second after mount
      }
    }

    // Listen for queue:next:called event (when patient is called via callNextPatient)
    const handleQueueNextCalled = async (data) => {
      if (data?.appointment) {
        // IMPORTANT: If consultation was manually selected, only clear it if a DIFFERENT patient is being called
        const newPatientId = data.appointment.patientId?._id || data.appointment.patientId
        const currentPatientId = selectedConsultation?.patientId?._id || selectedConsultation?.patientId

        // If same patient is being called again, don't clear manually selected consultation
        if (isManuallySelectedRef.current && newPatientId?.toString() === currentPatientId?.toString()) {
          console.log('⚠️ Same patient called again, keeping manually selected consultation')
          return
        }

        // If different patient is being called, clear the manually selected flag and proceed
        if (isManuallySelectedRef.current && newPatientId?.toString() !== currentPatientId?.toString()) {
          console.log('✅ Different patient called, clearing manually selected consultation')
          isManuallySelectedRef.current = false
        }

        // Prevent restoration if doctor is actively working on consultation
        if (isConsultationActiveRef.current || vitalsEdited) {
          console.log('⚠️ Skipping queue:next:called - doctor is actively working on consultation')
          return
        }

        console.log('📞 Patient called via queue:next:called:', data)

        // Prevent multiple simultaneous restorations
        if (isRestoringRef.current) {
          console.log('⚠️ Restoration already in progress, skipping queue:next:called')
          return
        }

        isRestoringRef.current = true

        try {
          // Create consultation data from appointment
          const appointment = data.appointment
          const session = data.session

          const sessionStr = localStorage.getItem('doctorCurrentSession')
          const currentSession = sessionStr ? JSON.parse(sessionStr) : session

          // Fetch complete patient data including email and address
          let fullPatientData = null
          try {
            const patientId = appointment.patientId?._id || appointment.patientId
            if (patientId) {
              const patientResponse = await getPatientById(patientId)
              if (patientResponse) {
                fullPatientData = patientResponse
                console.log('✅ Fetched full patient data from socket event:', fullPatientData)
              }
            }
          } catch (error) {
            console.error('Error fetching patient data:', error)
          }

          // Format patient address
          let formattedAddress = 'Not provided'
          if (fullPatientData?.address) {
            const address = fullPatientData.address
            if (typeof address === 'object') {
              const addressParts = []
              if (address.line1) addressParts.push(address.line1)
              if (address.line2) addressParts.push(address.line2)
              if (address.city) addressParts.push(address.city)
              if (address.state) addressParts.push(address.state)
              if (address.pincode || address.postalCode) addressParts.push(address.pincode || address.postalCode)
              formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Not provided'
            } else if (typeof address === 'string' && address.trim() !== '') {
              formattedAddress = address
            }
          }

          // Calculate age from date of birth if available
          let patientAge = appointment.age || appointment.patientId?.age || 0
          if (fullPatientData?.dateOfBirth) {
            try {
              const dob = new Date(fullPatientData.dateOfBirth)
              const today = new Date()
              let age = today.getFullYear() - dob.getFullYear()
              const monthDiff = today.getMonth() - dob.getMonth()
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                age--
              }
              if (age > 0) patientAge = age
            } catch (e) {
              console.error('Error calculating age:', e)
            }
          }

          // Preserve existing consultation data if same patient
          const currentPatientId = selectedConsultation?.patientId?._id || selectedConsultation?.patientId
          const newPatientId = appointment.patientId?._id || appointment.patientId
          const isSamePatient = currentPatientId?.toString() === newPatientId?.toString()

          // Preserve existing form data if same patient and user was editing
          // Use current vitals state instead of selectedConsultation.vitals to preserve what user is typing
          const existingVitals = (isSamePatient && vitalsEdited)
            ? vitalsRef.current // Use current vitals state from ref
            : (selectedConsultation?.vitals || {})

          const consultationData = {
            id: `cons-${appointment._id || appointment.id}-${Date.now()}`,
            patientId: appointment.patientId?._id || appointment.patientId,
            // IMPORTANT: Store appointmentId so it can be used later for saving vitals
            appointmentId: appointment._id || appointment.id,
            appointmentIdObj: { _id: appointment._id || appointment.id },
            patientName: fullPatientData?.firstName && fullPatientData?.lastName
              ? `${fullPatientData.firstName} ${fullPatientData.lastName}`
              : (appointment.patientId?.firstName && appointment.patientId?.lastName
                ? `${appointment.patientId.firstName} ${appointment.patientId.lastName}`
                : appointment.patientName || 'Patient'),
            age: patientAge,
            gender: fullPatientData?.gender || appointment.patientId?.gender || appointment.gender || 'M',
            appointmentTime: appointment.appointmentDate || new Date().toISOString(),
            appointmentType: appointment.appointmentType || 'Follow-up',
            status: 'in-progress',
            reason: appointment.reason || 'Consultation',
            patientImage: fullPatientData?.profileImage || appointment.patientId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(appointment.patientName || 'Patient')}&background=0077C2&color=fff&size=160`,
            patientPhone: fullPatientData?.phone || appointment.patientId?.phone || '',
            patientEmail: fullPatientData?.email || appointment.patientId?.email || '',
            patientAddress: formattedAddress,
            diagnosis: (isSamePatient ? selectedConsultation?.diagnosis : '') || '',
            symptoms: (isSamePatient ? selectedConsultation?.symptoms : '') || '',
            vitals: existingVitals, // Preserve if same patient and editing
            investigations: (isSamePatient ? selectedConsultation?.investigations : []) || [],
            advice: (isSamePatient ? selectedConsultation?.advice : '') || '',
            followUpDate: (isSamePatient ? selectedConsultation?.followUpDate : '') || '',
            attachments: (isSamePatient ? selectedConsultation?.attachments : []) || [],
            sessionId: currentSession._id || currentSession.id,
            sessionDate: currentSession.date || currentSession.sessionDate,
            calledAt: new Date().toISOString(),
            // Store original appointment data for reference
            originalData: appointment,
          }

          setConsultations((prev) => {
            const exists = prev.find((c) =>
              (c.patientId === consultationData.patientId || c.id === consultationData.id) &&
              c.status !== 'completed'
            )
            if (!exists) {
              return [consultationData, ...prev]
            }
            return prev.map((c) =>
              (c.patientId === consultationData.patientId || c.id === consultationData.id) && c.status !== 'completed'
                ? consultationData
                : c
            )
          })

          // IMPORTANT: Only update selectedConsultation if user is NOT actively editing
          // If editing, preserve current consultation state to prevent vitals reset
          if (!isConsultationActiveRef.current && !vitalsEdited) {
            // Only update selectedConsultation if user is not actively editing vitals
            // If editing, preserve current vitals state in the consultation data
            if (vitalsEdited && isSamePatient) {
              // User is editing - preserve current vitals state
              consultationData.vitals = vitalsRef.current
              console.log('✅ Preserving current vitals state for same patient')
            }

            // Reset manually selected flag when new patient is called
            isManuallySelectedRef.current = false

            setSelectedConsultation(consultationData)
            // Update last restored patient ID
            lastRestoredPatientIdRef.current = consultationData.id

            // Save to localStorage
            localStorage.setItem('doctorSelectedConsultation', JSON.stringify(consultationData))
            console.log('✅ Consultation state set from queue:next:called:', consultationData)
          } else {
            console.log('⚠️ Skipping selectedConsultation update - doctor is actively working on consultation')
          }
        } catch (error) {
          console.error('Error handling queue:next:called:', error)
          // Fallback: restore from appointment status
          await restoreConsultationFromAppointmentStatus()
        } finally {
          isRestoringRef.current = false
        }
      }
    }

    // Listen for queue:updated event
    const handleQueueUpdated = async (data) => {
      if (data?.appointmentId || data?.appointment) {
        console.log('📞 Queue updated - patient called:', data)

        // IMPORTANT: Only restore if this is for a NEW patient being called
        // Don't restore if doctor is already viewing a consultation (manually selected)
        // Only restore when next patient is explicitly called via queue:next:called
        // This prevents consultation from disappearing when doctor clicks on it

        // Check if the updated appointment is for a different patient
        const updatedAppointmentId = data.appointmentId || data.appointment?._id || data.appointment?.id
        const currentAppointmentId = selectedConsultation?.appointmentId?._id || selectedConsultation?.appointmentId || selectedConsultation?.originalData?._id || selectedConsultation?.originalData?.id

        // If it's the same appointment, don't restore (doctor is already viewing it)
        if (updatedAppointmentId && currentAppointmentId && updatedAppointmentId.toString() === currentAppointmentId.toString()) {
          console.log('⚠️ Queue update is for same appointment, skipping restoration')
          return
        }

        // Only restore if not currently editing consultation to prevent flickering
        // Add a small delay to debounce rapid events
        if (!isConsultationActiveRef.current && !vitalsEdited && !isRestoringRef.current) {
          setTimeout(async () => {
            await restoreConsultationFromAppointmentStatus()
          }, 500) // Debounce by 500ms
        } else {
          console.log('⚠️ Skipping queue update - doctor is working on consultation or restoration in progress')
        }
      }
    }

    socket.on('queue:updated', handleQueueUpdated)
    socket.on('queue:next:called', handleQueueNextCalled)

    return () => {
      socket.off('queue:updated', handleQueueUpdated)
      socket.off('queue:next:called', handleQueueNextCalled)
    }
  }, [selectedConsultation, vitalsEdited]) // Use vitalsRef.current instead of vitals in dependency

  const [activeTab, setActiveTab] = useState('vitals') // vitals, prescription, history, saved

  // Saved prescriptions - loaded from consultation data or patient history
  const [savedPrescriptions, setSavedPrescriptions] = useState([])

  // Load prescriptions when patient is selected
  const loadPrescriptions = useCallback(async () => {
    if (!selectedConsultation?.patientId) {
      setSavedPrescriptions([])
      return
    }

    try {
      // Fetch prescriptions for the current doctor
      const response = await getPrescriptions({})

      if (response) {
        const prescriptionsData = Array.isArray(response)
          ? response
          : response.items || response.prescriptions || []

        // Filter prescriptions for current patient and transform data
        const patientId = selectedConsultation.patientId?._id || selectedConsultation.patientId
        const filteredPrescriptions = prescriptionsData
          .filter(presc => {
            const prescPatientId = presc.patientId?._id || presc.patientId?.id || presc.patientId
            return prescPatientId?.toString() === patientId?.toString()
          })
          .map(presc => ({
            id: presc._id || presc.id,
            _id: presc._id || presc.id,
            consultationId: presc.consultationId?._id || presc.consultationId || presc.consultationId,
            patientId: presc.patientId?._id || presc.patientId?.id || presc.patientId,
            patientName: presc.patientId?.firstName && presc.patientId?.lastName
              ? `${presc.patientId.firstName} ${presc.patientId.lastName}`
              : selectedConsultation.patientName || 'Patient',
            patientImage: presc.patientId?.profileImage || selectedConsultation.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedConsultation.patientName || 'Patient')}&background=0077C2&color=fff&size=160`,
            patientPhone: presc.patientId?.phone || selectedConsultation.patientPhone || '',
            patientEmail: presc.patientId?.email || selectedConsultation.patientEmail || '',
            patientAddress: presc.patientId?.address || selectedConsultation.patientAddress || '',
            // Get diagnosis, symptoms, investigations from consultationId
            diagnosis: presc.consultationId?.diagnosis || presc.diagnosis || '',
            symptoms: presc.consultationId?.symptoms || presc.symptoms || '',
            investigations: presc.consultationId?.investigations || presc.investigations || [],
            advice: presc.consultationId?.advice || presc.notes || presc.advice || '',
            followUpDate: presc.consultationId?.followUpDate || presc.expiryDate || presc.followUpDate || '',
            date: presc.createdAt ? new Date(presc.createdAt).toISOString() : new Date().toISOString(),
            savedAt: presc.createdAt ? new Date(presc.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }) : new Date().toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: presc.status || 'active',
            pdfFileUrl: presc.pdfFileUrl || null,
            originalData: presc,
          }))

        setSavedPrescriptions(filteredPrescriptions)
        console.log('✅ Loaded prescriptions for patient:', filteredPrescriptions.length)
      } else {
        setSavedPrescriptions([])
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error)
      setSavedPrescriptions([])
    }
  }, [selectedConsultation?.patientId, selectedConsultation?.patientName, selectedConsultation?.patientImage, selectedConsultation?.patientPhone, selectedConsultation?.patientEmail, selectedConsultation?.patientAddress])

  // Load prescriptions when patient is selected
  useEffect(() => {
    loadPrescriptions()
  }, [loadPrescriptions])

  const [viewingPrescription, setViewingPrescription] = useState(null)
  const [editingPrescriptionId, setEditingPrescriptionId] = useState(null)





  // Verify consultation exists in database when loaded from localStorage
  // If patient history API fails, clear localStorage and hide consultation
  useEffect(() => {
    const verifyConsultation = async () => {
      // Only verify if consultation was loaded from localStorage (not from navigation state)
      if (!selectedConsultation || location.state?.selectedConsultation) {
        return // Don't verify if it came from navigation state
      }

      // Check if this consultation was loaded from localStorage
      const saved = localStorage.getItem('doctorSelectedConsultation')
      if (!saved) {
        return // Not from localStorage
      }

      const patientId = typeof selectedConsultation.patientId === 'object'
        ? (selectedConsultation.patientId._id || selectedConsultation.patientId.id || selectedConsultation.patientId)
        : selectedConsultation.patientId

      if (!patientId) {
        return
      }

      // Verify by trying to fetch patient history
      // If it fails with 404, the consultation doesn't exist in database
      try {
        const historyResponse = await getPatientHistory(patientId)
        if (!historyResponse) {
          // Consultation doesn't exist, clear localStorage and hide consultation
          console.log('⚠️ Consultation from localStorage not found in database, clearing...')
          localStorage.removeItem('doctorSelectedConsultation')
          setSelectedConsultation(null)
          setConsultations((prev) => prev.filter(c => {
            const cPatientId = typeof c.patientId === 'object'
              ? (c.patientId._id || c.patientId.id || c.patientId)
              : c.patientId
            return cPatientId?.toString() !== patientId?.toString()
          }))
        }
      } catch (error) {
        // If error is 404 or "Patient not found", clear localStorage
        if (error.message?.includes('Patient not found') || error.message?.includes('404')) {
          console.log('⚠️ Consultation from localStorage not found in database, clearing...')
          localStorage.removeItem('doctorSelectedConsultation')
          setSelectedConsultation(null)
          setConsultations((prev) => prev.filter(c => {
            const cPatientId = typeof c.patientId === 'object'
              ? (c.patientId._id || c.patientId.id || c.patientId)
              : c.patientId
            return cPatientId?.toString() !== patientId?.toString()
          }))
        }
      }
    }

    // Add a small delay to avoid race conditions with other API calls
    const timeoutId = setTimeout(() => {
      verifyConsultation()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [selectedConsultation, location.state?.selectedConsultation])

  // Get doctor info once and store in state to avoid multiple calls
  const [doctorInfo, setDoctorInfo] = useState(() => getDoctorInfo())

  // Update doctor info when component mounts or when needed
  useEffect(() => {
    setDoctorInfo(getDoctorInfo())
  }, [])

  // Prescriptions are saved via API when consultation is updated - no localStorage needed

  // Form states
  const [vitals, setVitals] = useState({
    bloodPressure: { systolic: '', diastolic: '' },
    temperature: '',
    pulse: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
    bmi: '',
  })

  // Keep ref to current vitals state for use in socket handlers (declared after vitals state)
  const vitalsRef = useRef(vitals)

  // Keep vitalsRef updated with current vitals state for use in socket handlers
  useEffect(() => {
    vitalsRef.current = vitals
  }, [vitals])

  const [diagnosis, setDiagnosis] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [investigations, setInvestigations] = useState([])
  const [advice, setAdvice] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')

  // Track if consultation form is being actively edited (any field)
  // IMPORTANT: This runs on every field change to mark consultation as active
  useEffect(() => {
    // If any form field has content, mark consultation as active IMMEDIATELY
    const hasContent = diagnosis || symptoms ||
      (investigations && investigations.length > 0) || advice || followUpDate ||
      vitals.temperature || vitals.pulse || vitals.respiratoryRate ||
      vitals.oxygenSaturation || vitals.weight || vitals.height ||
      vitals.bloodPressure?.systolic || vitals.bloodPressure?.diastolic

    // Set active flag IMMEDIATELY when any content is detected
    // This prevents other useEffects from resetting values
    isConsultationActiveRef.current = hasContent || vitalsEdited

    // Also save consultation state to localStorage when form is being edited
    if (selectedConsultation && isConsultationActiveRef.current) {
      const updatedConsultation = {
        ...selectedConsultation,
        diagnosis,
        symptoms,
        investigations,
        advice,
        followUpDate,
        vitals: vitalsRef.current || vitals
      }
      try {
        localStorage.setItem('doctorSelectedConsultation', JSON.stringify(updatedConsultation))
      } catch (error) {
        console.error('Error saving consultation state:', error)
      }
    }
  }, [diagnosis, symptoms, investigations, advice, followUpDate, vitals, vitalsEdited, selectedConsultation])

  const [attachments, setAttachments] = useState([])

  // Patient history - loaded from API
  const [patientHistory, setPatientHistory] = useState(null)

  // Load patient history when consultation is selected
  useEffect(() => {
    const loadPatientHistory = async () => {
      if (selectedConsultation?.patientId) {
        try {
          // Extract patient ID - handle both string and object
          const patientId = typeof selectedConsultation.patientId === 'object'
            ? (selectedConsultation.patientId._id || selectedConsultation.patientId.id || selectedConsultation.patientId)
            : selectedConsultation.patientId
          const historyResponse = await getPatientHistory(patientId)
          if (historyResponse) {
            setPatientHistory(historyResponse)
          } else {
            setPatientHistory(null)
          }
        } catch (error) {
          console.error('Error loading patient history:', error)
          setPatientHistory(null)
          // If error is "Patient not found" and consultation was from localStorage, clear it
          if (error.message?.includes('Patient not found') || error.message?.includes('no appointments')) {
            const saved = localStorage.getItem('doctorSelectedConsultation')
            if (saved) {
              console.log('⚠️ Patient not found, clearing invalid consultation from localStorage')
              localStorage.removeItem('doctorSelectedConsultation')
              setSelectedConsultation(null)
              const patientId = typeof selectedConsultation.patientId === 'object'
                ? (selectedConsultation.patientId._id || selectedConsultation.patientId.id || selectedConsultation.patientId)
                : selectedConsultation.patientId
              setConsultations((prev) => prev.filter(c => {
                const cPatientId = typeof c.patientId === 'object'
                  ? (c.patientId._id || c.patientId.id || c.patientId)
                  : c.patientId
                return cPatientId?.toString() !== patientId?.toString()
              }))
            }
          }
        }
      } else {
        setPatientHistory(null)
      }
    }

    loadPatientHistory()
  }, [selectedConsultation?.patientId])

  const handleCalculateBMI = () => {
    if (vitals.weight && vitals.height) {
      const heightInMeters = parseFloat(vitals.height) / 100
      const weightInKg = parseFloat(vitals.weight)
      const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1)
      setVitals({ ...vitals, bmi })
    }
  }





  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    const newAttachments = files.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
    }))
    setAttachments([...attachments, ...newAttachments])
  }

  const handleRemoveAttachment = (id) => {
    setAttachments(attachments.filter((att) => att.id !== id))
  }

  const generatePDF = async (prescriptionData) => {
    const doctorInfo = getDoctorInfo()
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const primaryColor = [0, 119, 194] // Primary Blue color for header
    const lightBlueColor = [230, 240, 255] // Light blue for diagnosis
    const lightPurpleColor = [240, 230, 250] // Light purple for tests
    const lightYellowColor = [255, 255, 200] // Light yellow for follow-up
    let yPos = margin

    // Header Section - Clinic Name in Teal (Large, Bold)
    doc.setTextColor(...primaryColor)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(doctorInfo.clinicName || 'Medical Clinic', pageWidth / 2, yPos, { align: 'center' })
    yPos += 7

    // Clinic Address (Centered)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const addressLines = doc.splitTextToSize(doctorInfo.clinicAddress || 'Address not provided', pageWidth - 2 * margin)
    addressLines.forEach((line) => {
      doc.text(line, pageWidth / 2, yPos, { align: 'center' })
      yPos += 4
    })

    // Contact Information (Left: Phone, Right: Email)
    yPos += 1
    doc.setFontSize(8)
    const contactY = yPos
    // Phone icon and number (left)
    doc.setFillColor(200, 0, 0) // Red circle for phone
    doc.circle(margin + 2, contactY - 1, 1.5, 'F')
    doc.setTextColor(0, 0, 0)
    doc.text(doctorInfo.phone || 'N/A', margin + 6, contactY)

    // Email icon and address (right)
    doc.setFillColor(100, 100, 100) // Gray circle for email
    doc.circle(pageWidth - margin - 2, contactY - 1, 1.5, 'F')
    doc.text(doctorInfo.email || 'N/A', pageWidth - margin, contactY, { align: 'right' })
    yPos += 5

    // Teal horizontal line separator
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    // Doctor Information (Left) and Patient Information (Right)
    const infoStartY = yPos
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Doctor Information', margin, infoStartY)
    doc.text('Patient Information', pageWidth - margin, infoStartY, { align: 'right' })

    yPos = infoStartY + 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    // Doctor Info (Left)
    doc.text(`Name: ${doctorInfo.name}`, margin, yPos)
    doc.text(`Specialty: ${doctorInfo.specialization || 'General Physician'}`, margin, yPos + 4)
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    doc.text(`Date: ${currentDate}`, margin, yPos + 8)

    // Patient Info (Right)
    let patientYPos = yPos
    doc.text(`Name: ${prescriptionData.patientName}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 4
    doc.text(`Age: ${selectedConsultation?.age || 'N/A'} years`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 4
    doc.text(`Gender: ${selectedConsultation?.gender || 'N/A'}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 4

    // Add patient phone and address if available
    if (prescriptionData.patientPhone || selectedConsultation?.patientPhone) {
      doc.text(`Phone: ${prescriptionData.patientPhone || selectedConsultation?.patientPhone || 'N/A'}`, pageWidth - margin, patientYPos, { align: 'right' })
      patientYPos += 4
    }
    if (prescriptionData.patientAddress || selectedConsultation?.patientAddress) {
      let addressText = '';
      const address = prescriptionData.patientAddress || selectedConsultation?.patientAddress;

      if (typeof address === 'string') {
        addressText = address;
      } else if (typeof address === 'object' && address !== null) {
        // Build address string from object
        const addressParts = [];
        if (address.line1) addressParts.push(address.line1);
        if (address.line2) addressParts.push(address.line2);
        if (address.city) addressParts.push(address.city);
        if (address.state) addressParts.push(address.state);
        if (address.pincode || address.postalCode) {
          addressParts.push(address.pincode || address.postalCode);
        }
        addressText = addressParts.join(', ').trim();
      } else {
        addressText = 'N/A';
      }

      if (addressText && addressText !== '[object Object]' && addressText !== 'N/A') {
        const addressLines = doc.splitTextToSize(`Address: ${addressText}`, pageWidth / 2 - margin)
        addressLines.forEach((line, index) => {
          doc.text(line, pageWidth - margin, patientYPos + (index * 4), { align: 'right' })
        })
        patientYPos += (addressLines.length - 1) * 4
      }
    }

    // Set yPos to the maximum of doctor info end or patient info end
    yPos = Math.max(yPos + 12, patientYPos) + 3

    // Diagnosis Section with Light Blue Background Box
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Diagnosis', margin, yPos)
    yPos += 6

    // Light blue rounded box for diagnosis
    const diagnosisHeight = 8
    doc.setFillColor(...lightBlueColor)
    doc.roundedRect(margin, yPos - 3, pageWidth - 2 * margin, diagnosisHeight, 2, 2, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const diagnosisText = prescriptionData.diagnosis || 'N/A'
    doc.text(diagnosisText, margin + 4, yPos + 2)
    yPos += diagnosisHeight + 4

    // Symptoms Section with Green Bullet Points
    if (prescriptionData.symptoms) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Symptoms', margin, yPos)
      yPos += 6
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const symptomLines = prescriptionData.symptoms.split('\n').filter(line => line.trim())
      symptomLines.forEach((symptom) => {
        // Green bullet point
        doc.setFillColor(34, 197, 94) // Green color
        doc.circle(margin + 1.5, yPos - 1, 1.2, 'F')
        doc.setTextColor(0, 0, 0)
        doc.text(symptom.trim(), margin + 5, yPos)
        yPos += 4
      })
      yPos += 2
    }

    // Recommended Tests Section (Light Purple Boxes)
    // Get investigations from prescriptionData or consultationId
    const investigations = prescriptionData.investigations || prescriptionData.consultationId?.investigations || [];
    if (investigations && investigations.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Recommended Tests', margin, yPos)
      yPos += 6

      investigations.forEach((inv) => {
        // Light purple box for each test
        // Handle both frontend format (name) and backend format (testName)
        const invName = typeof inv === 'string'
          ? inv
          : (inv.name || inv.testName || 'Investigation');
        const invNotes = typeof inv === 'object' ? (inv.notes || '') : '';
        const testBoxHeight = invNotes ? 14 : 9
        doc.setFillColor(...lightPurpleColor)
        doc.roundedRect(margin, yPos - 3, pageWidth - 2 * margin, testBoxHeight, 2, 2, 'F')

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(invName, margin + 4, yPos + 2)

        if (invNotes) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          doc.text(invNotes, margin + 4, yPos + 8)
        }

        yPos += testBoxHeight + 3
      })
      yPos += 2
    }

    // Medical Advice Section
    if (prescriptionData.advice) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Medical Advice', margin, yPos)
      yPos += 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const adviceLines = prescriptionData.advice.split('\n').filter(line => line.trim())
      adviceLines.forEach((advice) => {
        doc.text(advice.trim(), margin, yPos)
        yPos += 4
      })
      yPos += 2
    }

    // Follow-up Appointment (Light Yellow Box)
    if (prescriptionData.followUpDate) {
      const followUpHeight = 12
      doc.setFillColor(...lightYellowColor)
      doc.roundedRect(margin, yPos - 3, pageWidth - 2 * margin, followUpHeight, 2, 2, 'F')

      // Calendar icon (small square)
      doc.setFillColor(255, 200, 0)
      doc.roundedRect(margin + 2, yPos + 1, 3, 3, 0.5, 0.5, 'F')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Follow-up Appointment', margin + 7, yPos + 3)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      const followUpDate = new Date(prescriptionData.followUpDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      doc.text(followUpDate, margin + 7, yPos + 8)
      yPos += followUpHeight + 5
    }

    // Footer with Doctor Signature (Right side)
    // Calculate space needed for signature - ensure everything fits on one page
    const signatureSpace = 30
    const minYPos = pageHeight - signatureSpace - 5
    if (yPos < minYPos) {
      yPos = minYPos
    }

    // Doctor Signature (Right side)
    const signatureX = pageWidth - margin - 55
    const signatureY = yPos

    // Add digital signature image if available
    if (doctorInfo.digitalSignature && doctorInfo.digitalSignature.trim() !== '') {
      try {
        console.log('Adding signature to PDF:', doctorInfo.digitalSignature.substring(0, 50) + '...')

        // Check if it's a base64 data URL
        let imageData = doctorInfo.digitalSignature.trim()

        // Determine image format from data URL
        let imageFormat = 'PNG'
        if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
          imageFormat = 'JPEG'
        } else if (imageData.includes('data:image/png')) {
          imageFormat = 'PNG'
        } else if (imageData.includes('data:image/')) {
          // Extract format from data URL
          const match = imageData.match(/data:image\/(\w+);/)
          if (match) {
            imageFormat = match[1].toUpperCase()
          }
        }

        // Add signature image above the signature line (width: 50, height: 20)
        // Position it above the line
        doc.addImage(imageData, imageFormat, signatureX, signatureY - 18, 50, 20)
        console.log('Signature added successfully')
      } catch (error) {
        console.error('Error adding signature image to PDF:', error)
        // Fallback to line if image fails
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.line(signatureX, signatureY, signatureX + 50, signatureY)
      }
    } else {
      console.log('No signature found in doctorInfo')
      // Draw a line for signature if no image
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(signatureX, signatureY, signatureX + 50, signatureY)
    }

    // Doctor name and designation below signature (centered under signature area)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(doctorInfo.name, signatureX + 25, signatureY + 8, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(doctorInfo.specialization || 'General Physician', signatureX + 25, signatureY + 12, { align: 'center' })

    // Disclaimer at bottom center
    const disclaimerY = pageHeight - 6
    doc.setFontSize(6)
    doc.setTextColor(100, 100, 100)
    doc.text('This is a digitally generated prescription. For any queries, please contact the clinic.', pageWidth / 2, disclaimerY, { align: 'center' })

    // Save PDF
    const fileName = `Prescription_${prescriptionData.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  const handleDownloadPrescription = async (prescription) => {
    await generatePDF(prescription)
  }

  const handleEditPrescription = (prescription) => {
    // Load prescription data into form
    setDiagnosis(prescription.diagnosis || '')
    setSymptoms(prescription.symptoms || '')
    setInvestigations(prescription.investigations || [])
    setAdvice(prescription.advice || '')
    setFollowUpDate(prescription.followUpDate || '')
    setVitals(prescription.vitals || {
      bloodPressure: { systolic: '', diastolic: '' },
      temperature: '',
      pulse: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      weight: '',
      height: '',
      bmi: '',
    })

    // Set editing mode
    setEditingPrescriptionId(prescription.id)

    // Get consultation ID from prescription
    const consultationId = prescription.consultationId?._id || prescription.consultationId || prescription.originalData?.consultationId?._id || prescription.originalData?.consultationId

    // If consultation ID exists, try to load the consultation or set it in selectedConsultation
    if (consultationId) {
      // Try to find the consultation in the consultations list
      const foundConsultation = consultations.find(cons => {
        const consId = cons._id || cons.id
        return consId?.toString() === consultationId.toString()
      })

      if (foundConsultation) {
        // Set selected consultation so save function can find it
        setSelectedConsultation(foundConsultation)
      } else {
        // If consultation not found in list, create a minimal consultation object
        // This ensures handleSavePrescription can find the consultation ID
        setSelectedConsultation(prev => ({
          ...prev,
          id: consultationId,
          _id: consultationId,
          consultationId: consultationId,
          patientId: prescription.patientId || prev?.patientId,
          patientName: prescription.patientName || prev?.patientName,
        }))
      }
    }

    // Switch to prescription tab
    setActiveTab('prescription')

    // Scroll to prescription form
    setTimeout(() => {
      const prescriptionSection = document.querySelector('[data-prescription-section]')
      if (prescriptionSection) {
        prescriptionSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleViewPrescriptionPDF = async (prescriptionData) => {
    const doctorInfo = getDoctorInfo()
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const primaryColor = [0, 119, 194] // Primary Blue color for header
    const lightBlueColor = [230, 240, 255] // Light blue for diagnosis
    const lightPurpleColor = [240, 230, 250] // Light purple for tests
    const lightYellowColor = [255, 255, 200] // Light yellow for follow-up
    let yPos = margin

    // Header Section - Healway (Above Clinic Name) - Reduced size to match patient view
    doc.setTextColor(...primaryColor)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Healway', pageWidth / 2, yPos, { align: 'center' })
    yPos += 6

    // Clinic Name in Teal (Below Healway) - Reduced size
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(doctorInfo.clinicName || 'Medical Clinic', pageWidth / 2, yPos, { align: 'center' })
    yPos += 5

    // Clinic Address (Centered) - Convert object to string if needed
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    let clinicAddressRaw = doctorInfo.clinicAddress
    let clinicAddress = 'Address not provided'

    if (clinicAddressRaw) {
      if (typeof clinicAddressRaw === 'string') {
        clinicAddress = clinicAddressRaw
      } else if (typeof clinicAddressRaw === 'object' && clinicAddressRaw !== null) {
        // Convert address object to string
        const addressParts = []
        if (clinicAddressRaw.line1) addressParts.push(clinicAddressRaw.line1)
        if (clinicAddressRaw.line2) addressParts.push(clinicAddressRaw.line2)
        if (clinicAddressRaw.city) addressParts.push(clinicAddressRaw.city)
        if (clinicAddressRaw.state) addressParts.push(clinicAddressRaw.state)
        if (clinicAddressRaw.postalCode || clinicAddressRaw.pincode) {
          addressParts.push(clinicAddressRaw.postalCode || clinicAddressRaw.pincode)
        }
        if (clinicAddressRaw.country) addressParts.push(clinicAddressRaw.country)
        clinicAddress = addressParts.join(', ').trim() || 'Address not provided'
      }
    }

    const addressLines = doc.splitTextToSize(clinicAddress, pageWidth - 2 * margin)
    addressLines.forEach((line) => {
      doc.text(line, pageWidth / 2, yPos, { align: 'center' })
      yPos += 3
    })

    // Contact Information (Left: Phone, Right: Email) - Compact
    yPos += 1
    doc.setFontSize(7)
    const contactY = yPos
    // Phone icon and number (left)
    doc.setFillColor(200, 0, 0) // Red circle for phone
    doc.circle(margin + 2, contactY - 1, 1.2, 'F')
    doc.setTextColor(0, 0, 0)
    doc.text(doctorInfo.phone || 'N/A', margin + 5, contactY)

    // Email icon and address (right)
    doc.setFillColor(100, 100, 100) // Gray circle for email
    doc.circle(pageWidth - margin - 2, contactY - 1, 1.2, 'F')
    doc.text(doctorInfo.email || 'N/A', pageWidth - margin, contactY, { align: 'right' })
    yPos += 4

    // Teal horizontal line separator
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 6

    // Doctor Information (Left) and Patient Information (Right) - Compact
    const infoStartY = yPos
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Doctor Information', margin, infoStartY)
    doc.text('Patient Information', pageWidth - margin, infoStartY, { align: 'right' })

    yPos = infoStartY + 5
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')

    // Doctor Info (Left)
    doc.text(`Name: ${doctorInfo.name}`, margin, yPos)
    doc.text(`Specialty: ${doctorInfo.specialization || 'General Physician'}`, margin, yPos + 3)
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    doc.text(`Date: ${currentDate}`, margin, yPos + 6)

    // Patient Info (Right) - Compact with proper data extraction
    let patientYPos = yPos
    // Get patient data from prescription or consultation
    const patient = prescriptionData.patient || prescriptionData.originalData?.patientId || selectedConsultation?.patientId
    const patientName = prescriptionData.patientName || (patient?.firstName && patient?.lastName
      ? `${patient.firstName} ${patient.lastName}`
      : patient?.name || 'N/A')
    doc.text(`Name: ${patientName}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 3

    const patientAge = prescriptionData.age || selectedConsultation?.age || patient?.age || (patient?.dateOfBirth
      ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
      : null)
    doc.text(`Age: ${patientAge ? `${patientAge} years` : 'N/A'}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 3

    const patientGender = prescriptionData.gender || selectedConsultation?.gender || patient?.gender || 'N/A'
    doc.text(`Gender: ${patientGender}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 3

    const patientPhone = prescriptionData.patientPhone || selectedConsultation?.patientPhone || patient?.phone || 'N/A'
    doc.text(`Phone: ${patientPhone}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 3

    // Patient Address - Always show if available
    const patientAddress = prescriptionData.patientAddress || selectedConsultation?.patientAddress || patient?.address
    if (patientAddress) {
      let addressText = ''
      if (typeof patientAddress === 'string') {
        addressText = patientAddress
      } else if (typeof patientAddress === 'object' && patientAddress !== null) {
        const addressParts = []
        if (patientAddress.line1) addressParts.push(patientAddress.line1)
        if (patientAddress.line2) addressParts.push(patientAddress.line2)
        if (patientAddress.city) addressParts.push(patientAddress.city)
        if (patientAddress.state) addressParts.push(patientAddress.state)
        if (patientAddress.pincode || patientAddress.postalCode) {
          addressParts.push(patientAddress.pincode || patientAddress.postalCode)
        }
        if (patientAddress.country) addressParts.push(patientAddress.country)
        addressText = addressParts.join(', ').trim()
      }

      if (addressText && addressText !== '[object Object]') {
        const addressLines = doc.splitTextToSize(`Address: ${addressText}`, pageWidth / 2 - margin - 5)
        addressLines.forEach((line, index) => {
          doc.text(line, pageWidth - margin, patientYPos + (index * 3), { align: 'right' })
        })
        patientYPos += (addressLines.length - 1) * 3
      }
    }

    // Set yPos to the maximum of doctor info end or patient info end
    yPos = Math.max(yPos + 9, patientYPos) + 2

    // Diagnosis Section with Light Blue Background Box - Compact
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Diagnosis', margin, yPos)
    yPos += 5

    // Light blue rounded box for diagnosis - Smaller height
    const diagnosisHeight = 6
    doc.setFillColor(...lightBlueColor)
    doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, diagnosisHeight, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const diagnosisText = prescriptionData.diagnosis || 'N/A'
    doc.text(diagnosisText, margin + 3, yPos + 1)
    yPos += diagnosisHeight + 3

    // Symptoms Section with Green Bullet Points - Compact
    if (prescriptionData.symptoms) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Symptoms', margin, yPos)
      yPos += 5
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      const symptomLines = typeof prescriptionData.symptoms === 'string'
        ? prescriptionData.symptoms.split('\n').filter(line => line.trim())
        : Array.isArray(prescriptionData.symptoms)
          ? prescriptionData.symptoms.filter(s => s && s.trim())
          : [String(prescriptionData.symptoms)]

      symptomLines.forEach((symptom) => {
        // Check if we're getting too close to bottom - stop if needed
        if (yPos > pageHeight - 60) return

        // Green bullet point
        doc.setFillColor(34, 197, 94) // Green color
        doc.circle(margin + 1.2, yPos - 0.8, 1, 'F')
        doc.setTextColor(0, 0, 0)
        const symptomText = typeof symptom === 'string' ? symptom.trim() : String(symptom)
        doc.text(symptomText, margin + 4, yPos)
        yPos += 3
      })
      yPos += 1
    }


    // Recommended Tests Section (Light Purple Boxes)
    // Get investigations from prescriptionData or consultationId
    const investigations = prescriptionData.investigations || prescriptionData.consultationId?.investigations || [];
    if (investigations && investigations.length > 0) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Recommended Tests', margin, yPos)
      yPos += 6

      investigations.forEach((inv) => {
        // Light purple box for each test
        // Handle both frontend format (name) and backend format (testName)
        const invName = typeof inv === 'string'
          ? inv
          : (inv.name || inv.testName || 'Investigation');
        const invNotes = typeof inv === 'object' ? (inv.notes || '') : '';
        const testBoxHeight = invNotes ? 14 : 9
        doc.setFillColor(...lightPurpleColor)
        doc.roundedRect(margin, yPos - 3, pageWidth - 2 * margin, testBoxHeight, 2, 2, 'F')

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(invName, margin + 4, yPos + 2)

        if (invNotes) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          doc.text(invNotes, margin + 4, yPos + 8)
        }

        yPos += testBoxHeight + 3
      })
      yPos += 2
    }

    // Medical Advice Section
    if (prescriptionData.advice) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Medical Advice', margin, yPos)
      yPos += 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const adviceLines = prescriptionData.advice.split('\n').filter(line => line.trim())
      adviceLines.forEach((advice) => {
        doc.text(advice.trim(), margin, yPos)
        yPos += 4
      })
      yPos += 2
    }

    // Follow-up Appointment (Light Yellow Box)
    if (prescriptionData.followUpDate) {
      const followUpHeight = 12
      doc.setFillColor(...lightYellowColor)
      doc.roundedRect(margin, yPos - 3, pageWidth - 2 * margin, followUpHeight, 2, 2, 'F')

      // Calendar icon (small square)
      doc.setFillColor(255, 200, 0)
      doc.roundedRect(margin + 2, yPos + 1, 3, 3, 0.5, 0.5, 'F')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Follow-up Appointment', margin + 7, yPos + 3)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      const followUpDate = new Date(prescriptionData.followUpDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      doc.text(followUpDate, margin + 7, yPos + 8)
      yPos += followUpHeight + 5
    }

    // Footer with Doctor Signature (Right side)
    const signatureSpace = 30
    const minYPos = pageHeight - signatureSpace - 5
    if (yPos < minYPos) {
      yPos = minYPos
    }

    // Doctor Signature (Right side)
    const signatureX = pageWidth - margin - 55
    const signatureY = yPos

    // Get digital signature from prescription data or doctorInfo - handle both object and string formats
    const digitalSignatureRaw = prescriptionData.doctor?.digitalSignature || prescriptionData.originalData?.doctorId?.digitalSignature || doctorInfo.digitalSignature
    let signatureImageUrl = ''

    // Extract imageUrl from signature object or use string directly
    if (digitalSignatureRaw) {
      if (typeof digitalSignatureRaw === 'string') {
        signatureImageUrl = digitalSignatureRaw.trim()
      } else if (typeof digitalSignatureRaw === 'object' && digitalSignatureRaw !== null) {
        signatureImageUrl = digitalSignatureRaw.imageUrl || digitalSignatureRaw.url || ''
      }
    }

    // Add digital signature image if available
    if (signatureImageUrl && signatureImageUrl !== '') {
      try {
        let imageData = signatureImageUrl
        let imageFormat = 'PNG'

        // Determine image format from data URL or file extension
        if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
          imageFormat = 'JPEG'
        } else if (imageData.includes('data:image/png')) {
          imageFormat = 'PNG'
        } else if (imageData.includes('data:image/')) {
          const match = imageData.match(/data:image\/(\w+);/)
          if (match) {
            imageFormat = match[1].toUpperCase()
          }
        } else if (imageData.toLowerCase().endsWith('.jpg') || imageData.toLowerCase().endsWith('.jpeg')) {
          imageFormat = 'JPEG'
        } else if (imageData.toLowerCase().endsWith('.png')) {
          imageFormat = 'PNG'
        }

        // Calculate signature image dimensions - compact size for prescription
        // Standard signature size: width 50, height 18 (in jsPDF points)
        // This ensures signature is small and properly fits in the document
        const signatureWidth = 50  // Compact width
        const signatureHeight = 18  // Compact height (changed from 20 to match patient view)

        // Position signature image above the signature line
        // Position it 18 points above the signature line (standard spacing)
        const signatureImageY = signatureY - signatureHeight

        // Add signature image with compact dimensions, properly positioned
        doc.addImage(imageData, imageFormat, signatureX, signatureImageY, signatureWidth, signatureHeight, undefined, 'FAST')
        console.log('Signature image added successfully with size:', signatureWidth, 'x', signatureHeight)
      } catch (error) {
        console.error('Error adding signature image to PDF:', error)
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.line(signatureX, signatureY, signatureX + 50, signatureY)
      }
    } else {
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(signatureX, signatureY, signatureX + 50, signatureY)
    }

    // Doctor name and designation below signature - Adjust position based on whether signature image is present
    const hasSignatureImage = signatureImageUrl && signatureImageUrl !== ''
    const textYPos = hasSignatureImage ? signatureY + 6 : signatureY + 8
    const centerX = signatureX + 25  // Center of signature area (50/2 = 25)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(doctorInfo.name, centerX, textYPos, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(doctorInfo.specialization || 'General Physician', centerX, textYPos + 4, { align: 'center' })

    // Disclaimer at bottom center
    const disclaimerY = pageHeight - 6
    doc.setFontSize(6)
    doc.setTextColor(100, 100, 100)
    doc.text('This is a digitally generated prescription. For any queries, please contact the clinic.', pageWidth / 2, disclaimerY, { align: 'center' })

    // Open PDF in new window for viewing
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')

    // Clean up the URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl)
    }, 1000)
  }

  const handleSavePrescription = async () => {
    if (!diagnosis) {
      toast.warning('Please enter a diagnosis')
      return
    }

    try {
      // If editing a prescription, get consultation ID from the prescription being edited
      let consultationId = null
      if (editingPrescriptionId) {
        const prescriptionBeingEdited = savedPrescriptions.find(p => (p.id || p._id) === editingPrescriptionId)
        if (prescriptionBeingEdited) {
          consultationId = prescriptionBeingEdited.consultationId?._id ||
            prescriptionBeingEdited.consultationId ||
            prescriptionBeingEdited.originalData?.consultationId?._id ||
            prescriptionBeingEdited.originalData?.consultationId
          console.log('✅ Editing prescription - Found consultation ID:', consultationId)

          // Also update selectedConsultation with consultation ID if not already set
          if (consultationId && (!selectedConsultation || !selectedConsultation.id || !selectedConsultation._id)) {
            // Try to find consultation in consultations list
            const foundConsultation = consultations.find(cons => {
              const consId = cons._id || cons.id
              return consId?.toString() === consultationId.toString()
            })

            if (foundConsultation) {
              setSelectedConsultation(foundConsultation)
            } else {
              // Create minimal consultation object
              setSelectedConsultation(prev => ({
                ...prev,
                id: consultationId,
                _id: consultationId,
                consultationId: consultationId,
              }))
            }
          }
        }
      }

      // Get appointment ID from consultation - check multiple possible locations
      let appointmentId = selectedConsultation?.appointmentId?._id ||
        selectedConsultation?.appointmentId ||
        selectedConsultation?.originalData?._id ||
        selectedConsultation?.originalData?.id ||
        selectedConsultation?.originalData?.appointmentId?._id ||
        selectedConsultation?.originalData?.appointmentId

      // If appointmentId is still not found, try to extract from consultation ID
      // Consultation ID format: cons-{appointmentId}-{timestamp}
      if (!appointmentId && selectedConsultation?.id && selectedConsultation.id.startsWith('cons-')) {
        const parts = selectedConsultation.id.split('-')
        if (parts.length >= 3) {
          appointmentId = parts[1]
          console.log('✅ Extracted appointmentId from consultation ID:', appointmentId)
        }
      }

      // Get real consultation ID from database (or create consultation if it doesn't exist)
      if (!consultationId) {
        consultationId = selectedConsultation?.id || selectedConsultation?._id
      }

      // Check if consultation ID is a valid MongoDB ObjectId
      const isValidObjectId = consultationId && consultationId.match(/^[0-9a-fA-F]{24}$/)

      // If editing and we have a valid consultation ID, skip to update section
      if (editingPrescriptionId && isValidObjectId) {
        console.log('✅ Editing prescription with valid consultation ID:', consultationId)
        // Will proceed to update consultation section below
      } else if (!isValidObjectId) {
        // Consultation ID is not valid ObjectId - need to find or create consultation
        // But first check if we have appointmentId (required for creating consultation)
        if (!appointmentId) {
          toast.error('Consultation ID not found and appointment ID is missing. Cannot save prescription.')
          return
        }

        console.log('Consultation ID is not valid ObjectId, checking if consultation exists...')

        // First, try to find existing consultation by appointmentId
        let foundConsultation = null
        try {
          const { getDoctorConsultations } = await import('../doctor-services/doctorService')
          const consultationsResponse = await getDoctorConsultations()

          if (consultationsResponse) {
            const consultations = Array.isArray(consultationsResponse)
              ? consultationsResponse
              : (consultationsResponse.items || [])

            // Find consultation by appointmentId
            foundConsultation = consultations.find(cons => {
              const consAppointmentId = cons.appointmentId?._id || cons.appointmentId?.id || cons.appointmentId
              return consAppointmentId?.toString() === appointmentId.toString()
            })

            if (foundConsultation) {
              consultationId = foundConsultation._id || foundConsultation.id
              console.log('✅ Found existing consultation with ID:', consultationId)
              // Update selected consultation with real ID
              setSelectedConsultation(prev => ({
                ...prev,
                id: consultationId,
                _id: consultationId,
              }))
            }
          }
        } catch (error) {
          console.error('Error fetching consultations:', error)
        }

        // If consultation not found, try to create one
        if (!foundConsultation || !consultationId || !consultationId.match(/^[0-9a-fA-F]{24}$/)) {
          console.log('Creating new consultation before saving prescription...')

          // Prepare vitals data
          const vitalsData = {
            ...vitals,
            date: new Date().toISOString(),
            recordedAt: new Date().toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          }

          try {
            // Transform investigations to ensure they have the correct format
            const transformedInvestigationsForCreate = (investigations && investigations.length > 0)
              ? investigations.map(inv => ({
                name: inv.name || inv.testName || 'Investigation',
                testName: inv.testName || inv.name || 'Investigation',
                notes: inv.notes || ''
              }))
              : []

            // Debug logging before create
            console.log('🔍 Creating consultation with data:', {
              appointmentId,
              diagnosis,
              symptoms,
              investigationsCount: transformedInvestigationsForCreate.length,
              investigations: transformedInvestigationsForCreate,
              advice,
              followUpDate
            })

            const consultationResponse = await createConsultation({
              appointmentId,
              diagnosis: diagnosis || '',
              symptoms: symptoms || '',
              vitals: vitalsData,
              investigations: transformedInvestigationsForCreate,
              advice: advice || '',
              followUpDate: followUpDate || null,
            })

            if (consultationResponse) {
              consultationId = consultationResponse._id || consultationResponse.id
              // Update selected consultation with real ID
              setSelectedConsultation(prev => ({
                ...prev,
                id: consultationId,
                _id: consultationId,
                diagnosis,
                vitals: vitalsData,
                investigations,
                advice,
                followUpDate,
              }))
              console.log('✅ Created consultation with ID:', consultationId)
            } else {
              toast.error('Failed to create consultation. Cannot save prescription.')
              return
            }
          } catch (createError) {
            // If error is "already exists", find it again
            if (createError.message?.includes('already exists')) {
              console.log('Consultation already exists, finding it again...')
              try {
                const { getDoctorConsultations } = await import('../doctor-services/doctorService')
                const consultationsResponse = await getDoctorConsultations()

                if (consultationsResponse.success && consultationsResponse.data) {
                  const consultations = Array.isArray(consultationsResponse.data)
                    ? consultationsResponse.data
                    : consultationsResponse.data.items || []

                  const existingConsultation = consultations.find(cons => {
                    const consAppointmentId = cons.appointmentId?._id || cons.appointmentId?.id || cons.appointmentId
                    return consAppointmentId?.toString() === appointmentId.toString()
                  })

                  if (existingConsultation) {
                    consultationId = existingConsultation._id || existingConsultation.id
                    console.log('✅ Found existing consultation with ID:', consultationId)
                    setSelectedConsultation(prev => ({
                      ...prev,
                      id: consultationId,
                      _id: consultationId,
                    }))
                  } else {
                    toast.error('Consultation exists but could not be found. Please refresh and try again.')
                    return
                  }
                }
              } catch (findError) {
                console.error('Error finding existing consultation:', findError)
                toast.error('Failed to find existing consultation. Cannot save prescription.')
                return
              }
            } else {
              toast.error(createError.message || 'Failed to create consultation. Cannot save prescription.')
              return
            }
          }
        }
      }

      // If we have a valid consultation ID (either from editing or from above logic), update it
      if (consultationId && consultationId.match(/^[0-9a-fA-F]{24}$/)) {
        // Consultation exists - update it with prescription data
        console.log('Updating existing consultation with prescription data...')

        // Prepare vitals data
        const vitalsData = {
          ...vitals,
          date: new Date().toISOString(),
          recordedAt: new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        }

        // Transform investigations to ensure they have the correct format
        const transformedInvestigations = (investigations && investigations.length > 0)
          ? investigations.map(inv => ({
            name: inv.name || inv.testName || 'Investigation',
            testName: inv.testName || inv.name || 'Investigation',
            notes: inv.notes || ''
          }))
          : []

        // Debug logging before update
        console.log('🔍 Updating consultation with data:', {
          consultationId,
          diagnosis,
          symptoms,
          investigationsCount: transformedInvestigations.length,
          investigations: transformedInvestigations,
          advice,
          followUpDate
        })

        const updateResponse = await updateConsultation(consultationId, {
          diagnosis,
          symptoms: symptoms || '',
          vitals: vitalsData,
          investigations: transformedInvestigations,
          advice,
          followUpDate: followUpDate || null,
        })

        if (!updateResponse) {
          console.error('Failed to update consultation:', updateResponse)
          toast.error('Failed to update consultation. Cannot save prescription.')
          return
        }
        console.log('✅ Updated consultation with ID:', consultationId)
      }

      // Now create prescription with real consultation ID (MongoDB ObjectId)
      console.log('Creating prescription with consultationId:', consultationId)

      // Check if prescription already exists for this consultation
      let existingPrescription = null
      try {
        const { getPrescriptions } = await import('../doctor-services/doctorService')
        const existingPrescriptionsResponse = await getPrescriptions({ consultationId })
        if (existingPrescriptionsResponse.success && existingPrescriptionsResponse.data?.items?.length > 0) {
          existingPrescription = existingPrescriptionsResponse.data.items[0]
          console.log('⚠️ Prescription already exists for this consultation:', existingPrescription._id || existingPrescription.id)

          // If editing the same prescription, we can proceed to update consultation
          // But we can't create a new prescription - show message
          if (editingPrescriptionId && (existingPrescription._id?.toString() === editingPrescriptionId.toString() || existingPrescription.id?.toString() === editingPrescriptionId.toString())) {
            console.log('✅ Editing existing prescription - consultation will be updated, prescription already exists')
            // Use existing prescription
            const prescriptionResponse = {
              success: true,
              data: existingPrescription
            }

            // Update saved prescriptions list with updated data
            const transformedPrescription = {
              id: existingPrescription._id || existingPrescription.id,
              _id: existingPrescription._id || existingPrescription.id,
              consultationId: existingPrescription.consultationId?._id || existingPrescription.consultationId || consultationId,
              patientId: existingPrescription.patientId?._id || existingPrescription.patientId?.id || existingPrescription.patientId || selectedConsultation.patientId,
              patientName: existingPrescription.patientId?.firstName && existingPrescription.patientId?.lastName
                ? `${existingPrescription.patientId.firstName} ${existingPrescription.patientId.lastName}`
                : selectedConsultation.patientName || 'Patient',
              patientImage: existingPrescription.patientId?.profileImage || selectedConsultation.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedConsultation.patientName || 'Patient')}&background=0077C2&color=fff&size=160`,
              patientPhone: existingPrescription.patientId?.phone || selectedConsultation.patientPhone || '',
              patientEmail: existingPrescription.patientId?.email || selectedConsultation.patientEmail || '',
              patientAddress: existingPrescription.patientId?.address || selectedConsultation.patientAddress || '',
              diagnosis: diagnosis || '',
              symptoms: symptoms || '',
              investigations: investigations || [],
              advice: advice || '',
              followUpDate: followUpDate || '',
              date: existingPrescription.createdAt ? new Date(existingPrescription.createdAt).toISOString() : new Date().toISOString(),
              savedAt: existingPrescription.createdAt ? new Date(existingPrescription.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) : new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              status: existingPrescription.status || 'active',
              pdfFileUrl: existingPrescription.pdfFileUrl || null,
              originalData: existingPrescription,
            }

            setSavedPrescriptions((prev) =>
              prev.map(p => (p.id || p._id) === (transformedPrescription.id || transformedPrescription._id) ? transformedPrescription : p)
            )

            // Update consultation data
            const updatedConsultation = {
              ...selectedConsultation,
              id: consultationId,
              _id: consultationId,
              status: selectedConsultation?.status || 'in-progress',
              diagnosis,
              vitals,
              investigations,
              advice,
              prescriptionId: existingPrescription._id || existingPrescription.id,
            }

            setConsultations((prev) =>
              prev.map((cons) =>
                (cons.id === selectedConsultation.id || cons._id === consultationId) ? updatedConsultation : cons
              )
            )

            setSelectedConsultation(updatedConsultation)

            toast.success('Prescription updated successfully!')

            // Reset form
            setDiagnosis('')
            setSymptoms('')
            setInvestigations([])
            setAdvice('')
            setFollowUpDate('')
            setVitals({
              bloodPressure: { systolic: '', diastolic: '' },
              temperature: '',
              pulse: '',
              respiratoryRate: '',
              oxygenSaturation: '',
              weight: '',
              height: '',
              bmi: '',
            })
            setEditingPrescriptionId(null)
            setActiveTab('saved')
            return // Exit early since we handled the update
          } else {
            // Prescription exists but we're not editing it - show error
            toast.error('Prescription already exists for this consultation. Please edit the existing prescription instead.')
            return
          }
        }
      } catch (checkError) {
        console.error('Error checking existing prescription:', checkError)
        // Continue to create new prescription if check fails
      }

      // Create new prescription
      const prescriptionResponse = await createPrescription({
        consultationId: consultationId, // Use real MongoDB ObjectId
        notes: advice || '', // Use advice as notes
        expiryDate: followUpDate || null,
        // Include diagnosis, symptoms, investigations in the request
        // Backend will get these from consultation, but we can also pass them explicitly
        diagnosis: diagnosis || '',
        symptoms: symptoms || '',
        investigations: investigations || [],
      })

      if (prescriptionResponse) {
        // Transform prescription data to match component structure
        const prescriptionData = prescriptionResponse
        const transformedPrescription = {
          id: prescriptionData._id || prescriptionData.id,
          _id: prescriptionData._id || prescriptionData.id,
          consultationId: prescriptionData.consultationId?._id || prescriptionData.consultationId || consultationId,
          patientId: prescriptionData.patientId?._id || prescriptionData.patientId?.id || prescriptionData.patientId || selectedConsultation.patientId,
          patientName: prescriptionData.patientId?.firstName && prescriptionData.patientId?.lastName
            ? `${prescriptionData.patientId.firstName} ${prescriptionData.patientId.lastName}`
            : selectedConsultation.patientName || 'Patient',
          patientImage: prescriptionData.patientId?.profileImage || selectedConsultation.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedConsultation.patientName || 'Patient')}&background=0077C2&color=fff&size=160`,
          patientPhone: prescriptionData.patientId?.phone || selectedConsultation.patientPhone || '',
          patientEmail: prescriptionData.patientId?.email || selectedConsultation.patientEmail || '',
          patientAddress: prescriptionData.patientId?.address || selectedConsultation.patientAddress || '',
          // Get diagnosis, symptoms, investigations from consultationId
          diagnosis: prescriptionData.consultationId?.diagnosis || diagnosis || '',
          symptoms: prescriptionData.consultationId?.symptoms || symptoms || '',
          investigations: prescriptionData.consultationId?.investigations || investigations || [],
          advice: prescriptionData.consultationId?.advice || prescriptionData.notes || advice || '',
          followUpDate: prescriptionData.consultationId?.followUpDate || prescriptionData.expiryDate || followUpDate || '',
          date: prescriptionData.createdAt ? new Date(prescriptionData.createdAt).toISOString() : new Date().toISOString(),
          savedAt: prescriptionData.createdAt ? new Date(prescriptionData.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) : new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          status: prescriptionData.status || 'active',
          pdfFileUrl: prescriptionData.pdfFileUrl || null,
          originalData: prescriptionData,
        }

        // Update saved prescriptions list
        setSavedPrescriptions((prev) => {
          // Check if prescription already exists (avoid duplicates)
          const exists = prev.find(p => (p.id || p._id) === (transformedPrescription.id || transformedPrescription._id))
          if (exists) {
            return prev.map(p => (p.id || p._id) === (transformedPrescription.id || transformedPrescription._id) ? transformedPrescription : p)
          }
          return [transformedPrescription, ...prev]
        })

        // Update consultation data in both consultations list and selectedConsultation
        // IMPORTANT: Do NOT change status to 'completed' here - status should only change when doctor clicks "Complete" button
        const updatedConsultation = {
          ...selectedConsultation,
          id: consultationId,
          _id: consultationId,
          // Keep existing status (don't change to 'completed')
          status: selectedConsultation?.status || 'in-progress',
          diagnosis,
          vitals,
          investigations,
          advice,
          prescriptionId: prescriptionData._id || prescriptionData.id,
        }

        setConsultations((prev) =>
          prev.map((cons) =>
            (cons.id === selectedConsultation.id || cons._id === consultationId) ? updatedConsultation : cons
          )
        )

        // Also update selectedConsultation state (but keep status as is)
        setSelectedConsultation(updatedConsultation)

        toast.success('Prescription saved successfully!')

        // Reset form and editing state ONLY after successful save
        setDiagnosis('')
        setSymptoms('')
        setInvestigations([])
        setAdvice('')
        setFollowUpDate('')
        setVitals({
          bloodPressure: { systolic: '', diastolic: '' },
          temperature: '',
          pulse: '',
          respiratoryRate: '',
          oxygenSaturation: '',
          weight: '',
          height: '',
          bmi: '',
        })
        setEditingPrescriptionId(null)

        // Switch to saved prescriptions tab
        setActiveTab('saved')
      } else {
        toast.error(prescriptionResponse?.message || 'Failed to save prescription')
        // Don't reset form if save failed
      }
    } catch (error) {
      console.error('Error saving prescription:', error)
      toast.error(error.message || error.response?.data?.message || 'Failed to save prescription')
      // Don't reset form if error occurred
    }
  }

  const handleCompleteConsultation = async () => {
    if (!diagnosis) {
      toast.warning('Please enter a diagnosis before completing the consultation')
      return
    }

    // Confirm with the doctor
    if (!window.confirm('Are you sure you want to complete this consultation? This will mark the appointment as finished and process the payment.')) {
      return
    }

    try {
      // Get appointment ID from consultation
      let appointmentId = selectedConsultation?.appointmentId?._id ||
        selectedConsultation?.appointmentId ||
        selectedConsultation?.originalData?._id ||
        selectedConsultation?.originalData?.id ||
        selectedConsultation?.originalData?.appointmentId?._id ||
        selectedConsultation?.originalData?.appointmentId

      if (!appointmentId) {
        toast.error('Appointment ID not found. Cannot complete consultation.')
        return
      }

      // 1. First save/update the consultation/prescription to ensure data is preserved
      let consultationId = selectedConsultation?._id || selectedConsultation?.id
      const isValidObjectId = consultationId && consultationId.match(/^[0-9a-fA-F]{24}$/)

      // Prepare data
      const vitalsData = {
        ...vitals,
        date: new Date().toISOString(),
        recordedAt: new Date().toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
      }

      const transformedInvestigations = (investigations && investigations.length > 0)
        ? investigations.map(inv => ({
          testName: inv.testName || inv.name || 'Investigation',
          notes: inv.notes || ''
        }))
        : []

      if (isValidObjectId) {
        // Update existing
        await updateConsultation(consultationId, {
          diagnosis,
          symptoms: symptoms || '',
          vitals: vitalsData,
          investigations: transformedInvestigations,
          advice,
          followUpDate: followUpDate || null,
        })
      } else {
        // Create new
        const consultationResponse = await createConsultation({
          appointmentId,
          diagnosis: diagnosis || '',
          symptoms: symptoms || '',
          vitals: vitalsData,
          investigations: transformedInvestigations,
          advice: advice || '',
          followUpDate: followUpDate || null,
        })
        if (consultationResponse) {
          consultationId = consultationResponse._id || consultationResponse.id
        }
      }

      // 2. Mark as completed in the queue/appointment
      await updateQueueStatus(appointmentId, 'completed')

      toast.success('Consultation completed successfully!')

      // 3. Clear active consultation and refresh lists
      setSelectedConsultation(null)
      setDiagnosis('')
      setSymptoms('')
      setInvestigations([])
      setAdvice('')
      setFollowUpDate('')
      setVitals({
        bloodPressure: { systolic: '', diastolic: '' },
        temperature: '',
        pulse: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        weight: '',
        height: '',
        bmi: '',
      })

      // Refresh data
      fetchConsultations()
      loadPrescriptions()
      setActiveTab('patients')

      // Refresh dashboard if needed (via custom event)
      window.dispatchEvent(new CustomEvent('consultationCompleted'))

    } catch (error) {
      console.error('Error completing consultation:', error)
      toast.error(error.message || 'Failed to complete consultation')
    }
  }

  // Get filter label
  const getFilterLabel = () => {
    switch (filterParam) {
      case 'today':
        return 'Today\'s Appointments'
      case 'pending':
        return 'Pending Consultations'
      case 'all':
      default:
        return 'All Consultations'
    }
  }

  return (
    <>
      <DoctorNavbar />
      <section className={`flex flex-col gap-4 pb-24 ${isDashboardPage ? '-mt-20' : ''}`}>
        {/* Filter Header */}
        {filterParam !== 'all' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{getFilterLabel()}</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {filteredConsultations.length} {filteredConsultations.length === 1 ? 'consultation' : 'consultations'} found
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.history.pushState({}, '', '/doctor/consultations')}
                className="text-sm font-medium text-primary hover:text-primary-dark"
              >
                Show All
              </button>
            </div>
          </div>
        )}

        {/* Consultations List View - Only show if patient was called */}
        {!selectedConsultation && filteredConsultations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">
              {filterParam !== 'all' ? getFilterLabel() : 'Active Consultations'}
            </h2>
            <div className="space-y-3">
              {filteredConsultations.map((consultation) => (
                <div
                  key={consultation.id}
                  onClick={async () => {
                    // Mark as manually selected - this prevents socket handlers from clearing it
                    isManuallySelectedRef.current = true

                    // Refresh consultation data from API to get latest patient info
                    try {
                      const response = await getConsultationById(consultation.id)
                      if (response) {
                        const refreshedConsultation = transformConsultationData(response)
                        setSelectedConsultation(refreshedConsultation)
                      } else {
                        setSelectedConsultation(consultation)
                      }
                    } catch (error) {
                      console.error('Error refreshing consultation:', error)
                      setSelectedConsultation(consultation)
                    }
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98]"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={consultation.patientImage}
                      alt={consultation.patientName}
                      className="h-12 w-12 rounded-lg object-cover ring-2 ring-slate-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-slate-900">{consultation.patientName}</h3>
                          <p className="mt-1 text-sm text-slate-600">{consultation.reason}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${consultation.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : consultation.status === 'waiting' || consultation.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : consultation.status === 'in-progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                          {consultation.status === 'in-progress' ? 'IN-PROGRESS' :
                            consultation.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <IoTimeOutline className="h-4 w-4" />
                          <span>{formatDateTime(consultation.appointmentTime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{consultation.age} years • {consultation.gender}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Consultations Message - Only show when no patient was called and not viewing from all consultations */}
        {!selectedConsultation && filteredConsultations.length === 0 && !location.state?.loadSavedData && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <IoPersonOutline className="mx-auto h-16 w-16 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No Patient Selected</h3>
            <p className="mt-2 text-sm text-slate-600">
              Please call a patient from the queue to start consultation.
            </p>
            <button
              type="button"
              onClick={() => navigate('/doctor/patients')}
              className="mt-4 flex items-center gap-2 mx-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark active:scale-95"
            >
              <IoArrowBackOutline className="h-4 w-4" />
              Go to Patient Queue
            </button>
          </div>
        )}

        {/* Consultation Detail View */}
        {selectedConsultation ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6">
              {/* Left Column - Patient Info & History */}
              <div className="lg:col-span-1 space-y-3 sm:space-y-4">
                {/* Patient Card */}
                <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:p-5 shadow-md shadow-slate-200/50 hover:shadow-lg hover:shadow-slate-200/60 transition-shadow duration-200">
                  <div className="flex items-start gap-2 sm:gap-3 lg:gap-4">
                    <img
                      src={selectedConsultation.patientImage}
                      alt={selectedConsultation.patientName}
                      className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-lg sm:rounded-xl object-cover ring-2 ring-slate-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 truncate">{selectedConsultation.patientName}</h3>
                      <div className="mt-1 space-y-0.5 sm:space-y-1 text-[10px] sm:text-xs text-slate-600">
                        <p>
                          {selectedConsultation.age !== null && selectedConsultation.age !== undefined
                            ? `${selectedConsultation.age} years`
                            : 'Age not available'} • {selectedConsultation.gender ? selectedConsultation.gender.charAt(0).toUpperCase() + selectedConsultation.gender.slice(1) : 'N/A'}
                        </p>
                        <p className="flex items-center gap-1">
                          <IoTimeOutline className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                          <span className="truncate text-[10px] sm:text-xs">
                            {selectedConsultation.appointmentDate
                              ? formatDate(selectedConsultation.appointmentDate)
                              : formatDateTime(selectedConsultation.appointmentTime)}
                          </span>
                        </p>
                      </div>
                      <p className="mt-1.5 sm:mt-2.5 text-xs sm:text-sm font-medium text-slate-700 line-clamp-2">{selectedConsultation.reason}</p>

                      {/* Join Call Button for Doctor */}
                      {(() => {
                        const mode = selectedConsultation.consultationMode;
                        const isCallSupported = mode === "video_call" || mode === "voice_call" || mode === "online";

                        if (isCallSupported) {
                          return (
                            <button
                              onClick={() => {
                                const socket = getSocket();
                                const callId = selectedConsultation.id || selectedConsultation._id;
                                const callType = mode === "video_call" ? "video" : "audio";

                                console.log(`📞 Initiating ${callType} call:`, callId);

                                // 1. Emit initiate event to server
                                if (socket) {
                                  socket.emit('call:initiate', {
                                    callId,
                                    patientId: selectedConsultation.patientId?._id || selectedConsultation.patientId?.id || selectedConsultation.patientId,
                                    doctorName: doctorInfo.name,
                                    appointmentId: selectedConsultation.appointmentId?._id || selectedConsultation.appointmentId?.id || selectedConsultation.appointmentId,
                                    callType
                                  });
                                } else {
                                  console.error('Socket not available for call initiation');
                                  toast.error('Connection error. Please refresh the page.');
                                  return;
                                }

                                // 2. Start local call UI (opens CallPopup via context)
                                startCall(callId, selectedConsultation.patientName, callType);
                              }}
                              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700 active:scale-95 animate-pulse"
                            >
                              {mode === "video_call" ? <IoVideocamOutline className="h-3.5 w-3.5" /> : <IoCallOutline className="h-3.5 w-3.5" />}
                              Start {mode === "video_call" ? 'Video' : 'Voice'} Call
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Consultation Form */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                {/* Tabs */}
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide [-webkit-overflow-scrolling:touch] pb-2 -mx-3 sm:-mx-4 px-3 sm:px-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('vitals')}
                    className={`shrink-0 rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm font-bold transition-all duration-200 ${activeTab === 'vitals'
                      ? 'text-white shadow-md scale-105'
                      : 'bg-white text-slate-600 shadow-md shadow-slate-200/50 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/60 border border-slate-200/80'
                      }`}
                    style={activeTab === 'vitals' ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 6px -1px var(--color-primary-border)' } : {}}
                  >
                    Vitals & Exam
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('prescription')}
                    className={`shrink-0 rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm font-bold transition-all duration-200 ${activeTab === 'prescription'
                      ? 'text-white shadow-md scale-105'
                      : 'bg-white text-slate-600 shadow-md shadow-slate-200/50 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/60 border border-slate-200/80'
                      }`}
                    style={activeTab === 'prescription' ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 6px -1px var(--color-primary-border)' } : {}}
                  >
                    Prescription
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className={`shrink-0 rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm font-bold transition-all duration-200 ${activeTab === 'history'
                      ? 'text-white shadow-md scale-105'
                      : 'bg-white text-slate-600 shadow-md shadow-slate-200/50 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/60 border border-slate-200/80'
                      }`}
                    style={activeTab === 'history' ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 6px -1px var(--color-primary-border)' } : {}}
                  >
                    History
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('saved')}
                    className={`shrink-0 rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 text-xs sm:text-sm font-bold transition-all duration-200 ${activeTab === 'saved'
                      ? 'text-white shadow-md scale-105'
                      : 'bg-white text-slate-600 shadow-md shadow-slate-200/50 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/60 border border-slate-200/80'
                      }`}
                    style={activeTab === 'saved' ? { backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 6px -1px var(--color-primary-border)' } : {}}
                  >
                    Saved
                  </button>
                </div>

                {/* Vitals & Examination Tab */}
                {activeTab === 'vitals' && (
                  <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:p-4 shadow-md shadow-slate-200/50">
                    <h3 className="mb-3 sm:mb-4 lg:mb-3 text-sm sm:text-base lg:text-base font-bold text-slate-900">Vitals & Examination</h3>
                    <div className="grid gap-2.5 sm:gap-3 lg:gap-3 sm:grid-cols-2">
                      {/* Blood Pressure */}
                      <div className="rounded-lg sm:rounded-xl border border-slate-200 bg-linear-to-br from-red-50/50 to-slate-50/80 p-2.5 sm:p-3 lg:p-2.5 hover:shadow-md transition-shadow">
                        <label className="mb-1.5 sm:mb-2 lg:mb-1.5 flex items-center gap-1.5 sm:gap-2 lg:gap-1.5 text-xs sm:text-sm lg:text-xs font-semibold text-slate-900">
                          <IoHeartOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 text-red-600 shrink-0" />
                          Blood Pressure
                        </label>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <input
                            type="number"
                            value={vitals.bloodPressure?.systolic || ''}
                            onChange={(e) => {
                              // Set active flag IMMEDIATELY to prevent other useEffects from resetting
                              isConsultationActiveRef.current = true
                              setVitalsEdited(true)
                              const newValue = e.target.value
                              setVitals((prev) => ({
                                ...prev,
                                bloodPressure: {
                                  ...(prev.bloodPressure || {}),
                                  systolic: newValue
                                },
                              }))
                            }}
                            placeholder="Systolic"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 lg:px-2 py-1.5 sm:py-2 lg:py-1.5 text-xs sm:text-sm lg:text-xs text-slate-900 focus:outline-none focus:ring-2"
                          />
                          <span className="text-xs sm:text-sm lg:text-xs text-slate-500">/</span>
                          <input
                            type="number"
                            value={vitals.bloodPressure?.diastolic || ''}
                            onChange={(e) => {
                              // Set active flag IMMEDIATELY to prevent other useEffects from resetting
                              isConsultationActiveRef.current = true
                              setVitalsEdited(true)
                              const newValue = e.target.value
                              setVitals((prev) => ({
                                ...prev,
                                bloodPressure: {
                                  ...(prev.bloodPressure || {}),
                                  diastolic: newValue
                                },
                              }))
                            }}
                            placeholder="Diastolic"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 lg:px-2 py-1.5 sm:py-2 lg:py-1.5 text-xs sm:text-sm lg:text-xs text-slate-900 focus:outline-none focus:ring-2"
                          />
                          <span className="text-[10px] sm:text-xs lg:text-[10px] text-slate-500">mmHg</span>
                        </div>
                      </div>

                      {/* Temperature */}
                      <div className="rounded-lg sm:rounded-xl border border-slate-200 bg-linear-to-br from-orange-50/50 to-slate-50/80 p-2.5 sm:p-3 lg:p-2.5 hover:shadow-md transition-shadow">
                        <label className="mb-1.5 sm:mb-2 lg:mb-1.5 flex items-center gap-1.5 sm:gap-2 lg:gap-1.5 text-xs sm:text-sm lg:text-xs font-semibold text-slate-900">
                          <IoThermometerOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 text-orange-600 shrink-0" />
                          Temperature
                        </label>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <input
                            type="number"
                            value={vitals.temperature || ''}
                            onChange={(e) => {
                              // Set active flag IMMEDIATELY to prevent other useEffects from resetting
                              isConsultationActiveRef.current = true
                              setVitalsEdited(true)
                              const newValue = e.target.value
                              setVitals((prev) => ({ ...prev, temperature: newValue }))
                            }}
                            placeholder="98.6"
                            step="0.1"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 lg:px-2 py-1.5 sm:py-2 lg:py-1.5 text-xs sm:text-sm lg:text-xs text-slate-900 focus:outline-none focus:ring-2"
                          />
                          <span className="text-[10px] sm:text-xs lg:text-[10px] text-slate-500">°F</span>
                        </div>
                      </div>

                      {/* Pulse */}
                      <div className="rounded-lg sm:rounded-xl border border-slate-200 bg-linear-to-br from-red-50/50 to-slate-50/80 p-2.5 sm:p-3 lg:p-2.5 hover:shadow-md transition-shadow">
                        <label className="mb-1.5 sm:mb-2 lg:mb-1.5 flex items-center gap-1.5 sm:gap-2 lg:gap-1.5 text-xs sm:text-sm lg:text-xs font-semibold text-slate-900">
                          <IoPulseOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 text-red-600 shrink-0" />
                          Pulse Rate
                        </label>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <input
                            type="number"
                            value={vitals.pulse || ''}
                            onChange={(e) => {
                              // Set active flag IMMEDIATELY to prevent other useEffects from resetting
                              isConsultationActiveRef.current = true
                              setVitalsEdited(true)
                              const newValue = e.target.value
                              setVitals((prev) => ({ ...prev, pulse: newValue }))
                            }}
                            placeholder="72"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 lg:px-2 py-1.5 sm:py-2 lg:py-1.5 text-xs sm:text-sm lg:text-xs text-slate-900 focus:outline-none focus:ring-2"
                          />
                          <span className="text-[10px] sm:text-xs lg:text-[10px] text-slate-500">bpm</span>
                        </div>
                      </div>

                      {/* Respiratory Rate */}
                      <div className="rounded-lg sm:rounded-xl border border-slate-200 bg-linear-to-br from-[rgba(0,119,194,0.05)] to-slate-50/80 p-2.5 sm:p-3 lg:p-2.5 hover:shadow-md transition-shadow">
                        <label className="mb-1.5 sm:mb-2 lg:mb-1.5 flex items-center gap-1.5 sm:gap-2 lg:gap-1.5 text-xs sm:text-sm lg:text-xs font-semibold text-slate-900">
                          <IoBodyOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 text-primary shrink-0" />
                          Respiratory Rate
                        </label>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <input
                            type="number"
                            value={vitals.respiratoryRate || ''}
                            onChange={(e) => {
                              // Set active flag IMMEDIATELY to prevent other useEffects from resetting
                              isConsultationActiveRef.current = true
                              setVitalsEdited(true)
                              const newValue = e.target.value
                              setVitals((prev) => ({ ...prev, respiratoryRate: newValue }))
                            }}
                            placeholder="16"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 lg:px-2 py-1.5 sm:py-2 lg:py-1.5 text-xs sm:text-sm lg:text-xs text-slate-900 focus:outline-none focus:ring-2"
                          />
                          <span className="text-[10px] sm:text-xs lg:text-[10px] text-slate-500">/min</span>
                        </div>
                      </div>

                      {/* Oxygen Saturation */}
                      <div className="rounded-lg sm:rounded-xl border border-slate-200 bg-linear-to-br from-[rgba(0,119,194,0.05)] to-slate-50/80 p-2.5 sm:p-3 lg:p-2.5 hover:shadow-md transition-shadow">
                        <label className="mb-1.5 sm:mb-2 lg:mb-1.5 flex items-center gap-1.5 sm:gap-2 lg:gap-1.5 text-xs sm:text-sm lg:text-xs font-semibold text-slate-900">
                          <IoWaterOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 text-primary shrink-0" />
                          SpO2
                        </label>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <input
                            type="number"
                            value={vitals.oxygenSaturation || ''}
                            onChange={(e) => {
                              // Set active flag IMMEDIATELY to prevent other useEffects from resetting
                              isConsultationActiveRef.current = true
                              setVitalsEdited(true)
                              const newValue = e.target.value
                              setVitals((prev) => ({ ...prev, oxygenSaturation: newValue }))
                            }}
                            placeholder="98"
                            max="100"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 lg:px-2 py-1.5 sm:py-2 lg:py-1.5 text-xs sm:text-sm lg:text-xs text-slate-900 focus:outline-none focus:ring-2"
                          />
                          <span className="text-[10px] sm:text-xs lg:text-[10px] text-slate-500">%</span>
                        </div>
                      </div>

                      {/* Weight */}
                      <div className="rounded-lg sm:rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-slate-100/50 p-2.5 sm:p-3 lg:p-2.5 hover:shadow-md transition-shadow">
                        <label className="mb-1.5 sm:mb-2 lg:mb-1.5 flex items-center gap-1.5 sm:gap-2 lg:gap-1.5 text-xs sm:text-sm lg:text-xs font-semibold text-slate-900">
                          <IoBodyOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 text-slate-600 shrink-0" />
                          Weight
                        </label>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <input
                            type="number"
                            value={vitals.weight || ''}
                            onChange={(e) => {
                              // Set active flag IMMEDIATELY to prevent other useEffects from resetting
                              isConsultationActiveRef.current = true
                              setVitalsEdited(true)
                              const weightValue = e.target.value
                              setVitals((prev) => {
                                const updated = { ...prev, weight: weightValue }
                                // Calculate BMI synchronously if both height and weight are available
                                if (updated.height && weightValue) {
                                  const heightInMeters = parseFloat(updated.height) / 100
                                  const weightInKg = parseFloat(weightValue)
                                  if (heightInMeters > 0 && weightInKg > 0 && !isNaN(heightInMeters) && !isNaN(weightInKg)) {
                                    const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1)
                                    updated.bmi = bmi
                                  } else {
                                    updated.bmi = ''
                                  }
                                } else {
                                  updated.bmi = ''
                                }
                                return updated
                              })
                            }}
                            placeholder="70"
                            min="0"
                            step="0.1"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 lg:px-2 py-1.5 sm:py-2 lg:py-1.5 text-xs sm:text-sm lg:text-xs text-slate-900 focus:outline-none focus:ring-2"
                          />
                          <span className="text-[10px] sm:text-xs lg:text-[10px] text-slate-500">kg</span>
                        </div>
                      </div>

                      {/* Height */}
                      <div className="rounded-lg sm:rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-slate-100/50 p-2.5 sm:p-3 lg:p-2.5 hover:shadow-md transition-shadow">
                        <label className="mb-1.5 sm:mb-2 lg:mb-1.5 flex items-center gap-1.5 sm:gap-2 lg:gap-1.5 text-xs sm:text-sm lg:text-xs font-semibold text-slate-900">
                          <IoBodyOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 text-slate-600 shrink-0" />
                          Height
                        </label>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <input
                            type="number"
                            value={vitals.height || ''}
                            onChange={(e) => {
                              // Set active flag IMMEDIATELY to prevent other useEffects from resetting
                              isConsultationActiveRef.current = true
                              setVitalsEdited(true)
                              const heightValue = e.target.value
                              setVitals((prev) => {
                                const updated = { ...prev, height: heightValue }
                                // Calculate BMI synchronously if both height and weight are available
                                if (updated.weight && heightValue) {
                                  const heightInMeters = parseFloat(heightValue) / 100
                                  const weightInKg = parseFloat(updated.weight)
                                  if (heightInMeters > 0 && weightInKg > 0 && !isNaN(heightInMeters) && !isNaN(weightInKg)) {
                                    const bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1)
                                    updated.bmi = bmi
                                  } else {
                                    updated.bmi = ''
                                  }
                                } else {
                                  updated.bmi = ''
                                }
                                return updated
                              })
                            }}
                            placeholder="170"
                            min="0"
                            step="0.1"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 lg:px-2 py-1.5 sm:py-2 lg:py-1.5 text-xs sm:text-sm lg:text-xs text-slate-900 focus:outline-none focus:ring-2"
                          />
                          <span className="text-[10px] sm:text-xs lg:text-[10px] text-slate-500">cm</span>
                        </div>
                      </div>

                      {/* BMI */}
                      <div className="rounded-lg sm:rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-slate-100/50 p-2.5 sm:p-3 lg:p-2.5 hover:shadow-md transition-shadow">
                        <label className="mb-1.5 sm:mb-2 lg:mb-1.5 flex items-center gap-1.5 sm:gap-2 lg:gap-1.5 text-xs sm:text-sm lg:text-xs font-semibold text-slate-900">
                          <IoBodyOutline className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3.5 lg:w-3.5 text-slate-600 shrink-0" />
                          BMI
                        </label>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <input
                            type="text"
                            value={vitals.bmi || ''}
                            readOnly
                            placeholder="Auto calculated"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Add Vitals Button */}
                    <div className="mt-4 sm:mt-5">
                      <button
                        type="button"
                        onClick={async () => {
                          // Save vitals to patient history via API
                          if (!selectedConsultation) {
                            toast.warning('Please select a patient first')
                            return
                          }

                          // Validate that at least some vitals are entered
                          const hasVitals = vitals.temperature || vitals.pulse || vitals.respiratoryRate ||
                            vitals.oxygenSaturation || vitals.weight || vitals.height ||
                            vitals.bloodPressure?.systolic || vitals.bloodPressure?.diastolic

                          if (!hasVitals) {
                            toast.warning('Please enter at least one vital sign')
                            return
                          }

                          try {
                            // Get appointment ID from consultation - check multiple possible locations
                            let appointmentId = selectedConsultation.appointmentId?._id ||
                              selectedConsultation.appointmentId ||
                              selectedConsultation.originalData?._id ||
                              selectedConsultation.originalData?.id ||
                              selectedConsultation.originalData?.appointmentId?._id ||
                              selectedConsultation.originalData?.appointmentId

                            // If still not found, try to extract from consultation ID
                            // Consultation ID format: cons-{appointmentId}-{timestamp}
                            if (!appointmentId && selectedConsultation.id) {
                              const idMatch = selectedConsultation.id.match(/^cons-([a-fA-F0-9]{24})-/)
                              if (idMatch && idMatch[1]) {
                                appointmentId = idMatch[1]
                                console.log('✅ Extracted appointmentId from consultation ID:', appointmentId)
                              }
                            }

                            // If still not found, try to get from patient's current appointment
                            if (!appointmentId && selectedConsultation.patientId) {
                              try {
                                const patientId = typeof selectedConsultation.patientId === 'object'
                                  ? (selectedConsultation.patientId._id || selectedConsultation.patientId.id || selectedConsultation.patientId)
                                  : selectedConsultation.patientId

                                // Get today's queue to find the appointment
                                const today = new Date().toISOString().split('T')[0]
                                const queueResponse = await getPatientQueue(today)

                                if (queueResponse && queueResponse.appointments) {
                                  const appointment = queueResponse.appointments.find(apt => {
                                    const aptPatientId = apt.patientId?._id || apt.patientId
                                    return aptPatientId?.toString() === patientId?.toString() &&
                                      (apt.status === 'scheduled' || apt.status === 'confirmed')
                                  })

                                  if (appointment) {
                                    appointmentId = appointment._id || appointment.id
                                    console.log('✅ Found appointmentId from patient queue:', appointmentId)
                                  }
                                }
                              } catch (error) {
                                console.error('Error fetching appointment from queue:', error)
                              }
                            }

                            if (!appointmentId) {
                              toast.error('Appointment ID not found. Cannot save vitals.')
                              console.error('❌ Appointment ID not found in consultation:', {
                                consultationId: selectedConsultation.id,
                                hasAppointmentId: !!selectedConsultation.appointmentId,
                                hasOriginalData: !!selectedConsultation.originalData,
                                patientId: selectedConsultation.patientId
                              })
                              return
                            }

                            console.log('✅ Using appointmentId for saving vitals:', appointmentId)

                            // Prepare vitals data with timestamp
                            const vitalsData = {
                              ...vitals,
                              date: new Date().toISOString(),
                              recordedAt: new Date().toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }),
                            }

                            // Check if consultation exists, if not create it, otherwise update it
                            let consultationId = selectedConsultation.id || selectedConsultation._id

                            // If consultation ID doesn't look like a MongoDB ID, we need to create/update via appointment
                            if (!consultationId || !consultationId.match(/^[0-9a-fA-F]{24}$/)) {
                              // Create new consultation with vitals
                              const consultationResponse = await createConsultation({
                                appointmentId,
                                diagnosis: diagnosis || '',
                                vitals: vitalsData,
                                investigations: investigations || [],
                                advice: advice || '',
                                followUpDate: followUpDate || null,
                              })

                              if (consultationResponse) {
                                consultationId = consultationResponse._id || consultationResponse.id
                                // Update selected consultation with new ID
                                setSelectedConsultation(prev => ({
                                  ...prev,
                                  id: consultationId,
                                  _id: consultationId,
                                  vitals: vitalsData
                                }))
                              }
                            } else {
                              // Update existing consultation with vitals
                              const updateResponse = await updateConsultation(consultationId, {
                                vitals: vitalsData,
                              })

                              if (updateResponse) {
                                // Update selected consultation with new vitals
                                setSelectedConsultation(prev => ({
                                  ...prev,
                                  vitals: vitalsData
                                }))
                              }
                            }

                            // Reload patient history to show updated vitals
                            if (selectedConsultation.patientId) {
                              const patientId = typeof selectedConsultation.patientId === 'object'
                                ? (selectedConsultation.patientId._id || selectedConsultation.patientId.id || selectedConsultation.patientId)
                                : selectedConsultation.patientId

                              const historyResponse = await getPatientHistory(patientId)
                              if (historyResponse) {
                                setPatientHistory(historyResponse)
                              }
                            }

                            toast.success('Vitals saved to patient history successfully!')

                            // Reset vitals form after successful save
                            setVitals({
                              bloodPressure: { systolic: '', diastolic: '' },
                              temperature: '',
                              pulse: '',
                              respiratoryRate: '',
                              oxygenSaturation: '',
                              weight: '',
                              height: '',
                              bmi: '',
                            })
                            setVitalsEdited(false)
                          } catch (error) {
                            console.error('Error saving vitals to history:', error)
                            toast.error(error.message || 'Error saving vitals. Please try again.')
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-sm shadow-[rgba(0,119,194,0.2)] transition hover:bg-[var(--color-primary-dark)] active:scale-95"
                      >
                        <IoAddOutline className="h-5 w-5" />
                        Add to Patient History
                      </button>
                    </div>
                  </div>
                )}

                {/* Prescription Tab */}
                {activeTab === 'prescription' && (
                  <div className="space-y-3 sm:space-y-4 lg:space-y-4" data-prescription-section>
                    {/* Shared Prescriptions from Other Doctors */}
                    {selectedConsultation?.sharedPrescriptions && selectedConsultation.sharedPrescriptions.length > 0 && (
                      <div className="rounded-xl sm:rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 sm:p-4 lg:p-4 shadow-md">
                        <div className="mb-3 sm:mb-4 flex items-center gap-2">
                          <IoDocumentTextOutline className="h-5 w-5 sm:h-6 sm:w-6 text-amber-700" />
                          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-amber-900">
                            Shared Prescriptions from Other Doctors
                          </h3>
                        </div>
                        <p className="mb-4 text-xs sm:text-sm text-amber-800">
                          Patient has shared {selectedConsultation.sharedPrescriptions.length} prescription(s) from previous consultations
                        </p>
                        <div className="space-y-3 sm:space-y-4">
                          {selectedConsultation.sharedPrescriptions.map((sharedPresc, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-amber-300 bg-white p-3 sm:p-4 shadow-sm"
                            >
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm sm:text-base font-bold text-slate-900">
                                    {sharedPresc.doctor?.name || 'Previous Doctor'}
                                  </p>
                                  <p className="text-xs sm:text-sm text-slate-600">
                                    {sharedPresc.doctor?.specialty || 'General'} • {sharedPresc.diagnosis || 'Consultation'}
                                  </p>
                                  {sharedPresc.issuedAt && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      Issued: {new Date(sharedPresc.issuedAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {sharedPresc.diagnosis && (
                                <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-2">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">Diagnosis</p>
                                  <p className="text-xs sm:text-sm text-blue-800">{sharedPresc.diagnosis}</p>
                                </div>
                              )}



                              {sharedPresc.advice && (
                                <div className="rounded-lg bg-green-50 border border-green-200 p-2">
                                  <p className="text-xs font-semibold text-green-900 mb-1">Advice</p>
                                  <p className="text-xs sm:text-sm text-green-800">{sharedPresc.advice}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescription Header */}
                    <div className="rounded-xl sm:rounded-2xl border-2 border-primary bg-gradient-to-br from-[rgba(0,119,194,0.05)] to-white p-4 sm:p-6 shadow-md shadow-slate-200/50">
                      <div className="mb-4 border-b-2 border-primary pb-3">
                        <h2 className="text-lg sm:text-xl font-bold text-primary text-center">PRESCRIPTION</h2>
                        <p className="text-xs sm:text-sm text-slate-600 text-center mt-1">{doctorInfo.clinicName}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* Patient Information */}
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2">Patient Information</h3>
                          <div className="space-y-1 text-[10px] sm:text-xs text-slate-700">
                            <p><span className="font-semibold">Name:</span> {selectedConsultation.patientName || 'N/A'}</p>
                            <p>
                              <span className="font-semibold">Age:</span> {selectedConsultation.age !== null && selectedConsultation.age !== undefined ? `${selectedConsultation.age} years` : 'N/A'} | <span className="font-semibold">Gender:</span> {selectedConsultation.gender ? selectedConsultation.gender.charAt(0).toUpperCase() + selectedConsultation.gender.slice(1) : 'N/A'}
                            </p>
                            {selectedConsultation.patientPhone ? (
                              <p><span className="font-semibold">Phone:</span> {selectedConsultation.patientPhone}</p>
                            ) : (
                              <p><span className="font-semibold">Phone:</span> Not provided</p>
                            )}
                            {selectedConsultation.patientEmail ? (
                              <p><span className="font-semibold">Email:</span> {selectedConsultation.patientEmail}</p>
                            ) : (
                              <p><span className="font-semibold">Email:</span> Not provided</p>
                            )}
                            {selectedConsultation.patientAddress ? (
                              <p><span className="font-semibold">Address:</span> {selectedConsultation.patientAddress}</p>
                            ) : (
                              <p><span className="font-semibold">Address:</span> Not provided</p>
                            )}
                          </div>
                        </div>

                        {/* Doctor Information */}
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-2">Doctor Information</h3>
                          <div className="space-y-1 text-[10px] sm:text-xs text-slate-700">
                            <p className="font-semibold">{doctorInfo.name}</p>
                            <p>{doctorInfo.qualification}</p>
                            <p>{doctorInfo.clinicName}</p>
                            {doctorInfo.phone && (
                              <p><span className="font-semibold">Phone:</span> {doctorInfo.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-[10px] sm:text-xs text-slate-600">
                          <span className="font-semibold">Date:</span> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Diagnosis */}
                    <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:p-6 shadow-md shadow-slate-200/50">
                      <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">Diagnosis *</label>
                      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 sm:p-4">
                        <input
                          type="text"
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                          placeholder="Enter diagnosis..."
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:p-6 shadow-md shadow-slate-200/50">
                      <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">Symptoms</label>
                      <div className="space-y-2">
                        {symptoms.split('\n').filter(line => line.trim()).map((symptom, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 shrink-0"></div>
                            <span className="text-xs sm:text-sm text-slate-700">{symptom.trim()}</span>
                          </div>
                        ))}
                        <textarea
                          value={symptoms}
                          onChange={(e) => setSymptoms(e.target.value)}
                          placeholder="Enter symptoms (one per line)...&#10;Example:&#10;High fever (102°F)&#10;Headache&#10;Body ache"
                          rows="4"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>



                    {/* Advice */}
                    <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:p-6 shadow-md shadow-slate-200/50">
                      <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">Medical Advice</label>
                      <div className="space-y-2 mb-3">
                        {advice.split('\n').filter(line => line.trim()).map((adv, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 shrink-0"></div>
                            <span className="text-xs sm:text-sm text-slate-700">{adv.trim()}</span>
                          </div>
                        ))}
                      </div>
                      <textarea
                        value={advice}
                        onChange={(e) => setAdvice(e.target.value)}
                        placeholder="Enter medical advice (one per line)...&#10;Example:&#10;Take adequate rest for 3-5 days&#10;Drink plenty of fluids&#10;Avoid cold foods"
                        rows="4"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Follow-up Appointment */}
                    <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 lg:p-6 shadow-md shadow-slate-200/50">
                      <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">Follow-up Appointment (Optional)</label>
                      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-4 w-4 rounded bg-yellow-400 flex items-center justify-center shrink-0">
                            <IoCalendarOutline className="h-3 w-3 text-yellow-900" />
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-slate-900">Follow-up Appointment</span>
                        </div>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-slate-900"
                        />
                        {followUpDate && (
                          <p className="text-xs sm:text-sm text-slate-700 mt-1">
                            {new Date(followUpDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Prescription Footer */}
                    <div className="rounded-xl sm:rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-6 shadow-md shadow-slate-200/50">
                      <div className="border-t-2 border-slate-200 pt-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                          {/* Doctor Details */}
                          <div className="flex-1">
                            <p className="text-xs sm:text-sm font-bold text-slate-900">{doctorInfo.name}</p>
                            <p className="text-[10px] sm:text-xs text-slate-700">{doctorInfo.qualification}</p>
                            <p className="text-[10px] sm:text-xs text-slate-700">{doctorInfo.clinicName}</p>
                            <p className="text-[10px] sm:text-xs text-slate-600">License: {doctorInfo.licenseNumber}</p>
                          </div>

                          {/* Digital Signature */}
                          <div className="flex flex-col items-end">
                            {doctorInfo.digitalSignature && doctorInfo.digitalSignature.trim() !== '' ? (
                              <div className="mb-2">
                                <img
                                  src={doctorInfo.digitalSignature}
                                  alt="Doctor Signature"
                                  className="h-12 w-32 sm:h-16 sm:w-40 object-contain border border-slate-200 rounded bg-white p-1"
                                  onError={(e) => {
                                    // Silently handle error - hide image and show placeholder
                                    e.target.style.display = 'none'
                                    // Show placeholder instead
                                    const placeholder = e.target.nextElementSibling
                                    if (placeholder && placeholder.classList.contains('signature-placeholder')) {
                                      placeholder.style.display = 'flex'
                                    }
                                  }}
                                />
                                <div className="signature-placeholder h-12 w-32 sm:h-16 sm:w-40 border-2 border-dashed border-slate-300 rounded bg-slate-50 items-center justify-center mb-2 hidden">
                                  <p className="text-[8px] sm:text-[10px] text-slate-400 text-center px-1">No Signature</p>
                                </div>
                              </div>
                            ) : (
                              <div className="h-12 w-32 sm:h-16 sm:w-40 border-2 border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center mb-2">
                                <p className="text-[8px] sm:text-[10px] text-slate-400 text-center px-1">No Signature</p>
                              </div>
                            )}
                            <p className="text-[10px] sm:text-xs text-slate-600">Digital Signature</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={handleSavePrescription}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-primary px-6 py-3.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5 active:scale-95"
                      >
                        <IoCheckmarkCircleOutline className="h-5 w-5" />
                        Save Prescription
                      </button>
                      <button
                        type="button"
                        onClick={handleCompleteConsultation}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700 active:scale-95"
                      >
                        <IoCheckmarkCircleOutline className="h-5 w-5" />
                        Complete Consultation
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const tempPrescription = {
                            patientName: selectedConsultation.patientName,
                            patientPhone: selectedConsultation.patientPhone,
                            patientAddress: selectedConsultation.patientAddress,
                            diagnosis,
                            symptoms,
                            advice,
                            followUpDate,
                          }
                          await generatePDF(tempPrescription)
                        }}
                        disabled={!diagnosis}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <IoPrintOutline className="h-5 w-5" />
                        <span className="hidden sm:inline">Generate </span>PDF
                      </button>
                    </div>
                  </div>
                )}

                {/* Saved Prescriptions Tab */}
                {activeTab === 'saved' && (
                  <div className="space-y-4 lg:space-y-3">
                    {viewingPrescription ? (
                      /* Full Page View Prescription */
                      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)', height: 'calc(100vh - 120px)' }}>
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-4 py-3 lg:py-2.5 shrink-0">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setViewingPrescription(null)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
                            >
                              <IoArrowBackOutline className="h-5 w-5" />
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Prescription Details</h2>
                          </div>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4 pb-6" style={{ minHeight: 0 }}>
                          {/* Patient Info */}
                          <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                            <div className="h-14 w-14 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
                              <span className="text-white text-lg font-bold">
                                {viewingPrescription.patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-primary">{viewingPrescription.patientName}</h3>
                              <p className="text-sm text-slate-600">Saved on {viewingPrescription.savedAt}</p>
                            </div>
                          </div>

                          {/* Diagnosis */}
                          <div>
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Diagnosis</p>
                            <p className="text-base font-semibold text-slate-900">{viewingPrescription.diagnosis}</p>
                          </div>

                          {/* Symptoms */}
                          {viewingPrescription.symptoms && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Symptoms</p>
                              <div className="space-y-1">
                                {viewingPrescription.symptoms.split('\n').filter(line => line.trim()).map((symptom, idx) => (
                                  <p key={idx} className="text-sm text-slate-700">• {symptom.trim()}</p>
                                ))}
                              </div>
                            </div>
                          )}


                          {/* Advice */}
                          {viewingPrescription.advice && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Medical Advice</p>
                              <div className="space-y-1">
                                {viewingPrescription.advice.split('\n').filter(line => line.trim()).map((advice, idx) => (
                                  <p key={idx} className="text-sm text-slate-700">• {advice.trim()}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Follow-up */}
                          {viewingPrescription.followUpDate && (
                            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Follow-up Appointment</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {new Date(viewingPrescription.followUpDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          )}

                          {/* Extra padding at bottom to ensure all content is visible above footer */}
                          <div className="h-6"></div>
                        </div>

                        {/* Footer Actions - Sticky */}
                        <div className="sticky bottom-0 z-10 flex gap-3 border-t border-slate-200 bg-white p-3 sm:p-4 shrink-0 shadow-lg">
                          <button
                            type="button"
                            onClick={() => setViewingPrescription(null)}
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Close
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDownloadPrescription(viewingPrescription)
                            }}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[rgba(0,119,194,0.2)] transition hover:bg-primary-dark"
                          >
                            <IoDownloadOutline className="h-5 w-5" />
                            Download PDF
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Saved Prescriptions List */
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md shadow-slate-200/50">
                        {/* Filter prescriptions for current patient only */}
                        {(() => {
                          const filteredPrescriptions = selectedConsultation
                            ? savedPrescriptions.filter((prescription) => {
                              const prescPatientId = prescription.patientId?._id || prescription.patientId?.id || prescription.patientId
                              const selectedPatientId = selectedConsultation.patientId?._id || selectedConsultation.patientId?.id || selectedConsultation.patientId
                              return prescPatientId?.toString() === selectedPatientId?.toString()
                            })
                            : []

                          return (
                            <>
                              <div className="mb-5 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900">Saved Prescriptions</h3>
                                <span className="rounded-full bg-[rgba(0,119,194,0.15)] px-3 py-1 text-xs font-semibold text-primary">
                                  {filteredPrescriptions.length} {filteredPrescriptions.length === 1 ? 'Prescription' : 'Prescriptions'}
                                </span>
                              </div>

                              {!selectedConsultation ? (
                                <div className="py-12 text-center">
                                  <IoPersonOutline className="mx-auto h-16 w-16 text-slate-300" />
                                  <p className="mt-4 text-sm font-medium text-slate-600">Please select a patient</p>
                                  <p className="mt-1 text-xs text-slate-500">Select a patient to view their saved prescriptions</p>
                                </div>
                              ) : filteredPrescriptions.length === 0 ? (
                                <div className="py-12 text-center">
                                  <IoDocumentTextOutline className="mx-auto h-16 w-16 text-slate-300" />
                                  <p className="mt-4 text-sm font-medium text-slate-600">No saved prescriptions for {selectedConsultation.patientName}</p>
                                  <p className="mt-1 text-xs text-slate-500">Prescriptions you save for this patient will appear here</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {filteredPrescriptions.map((prescription) => (
                                    <div
                                      key={prescription.id}
                                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
                                    >
                                      <div className="flex items-center gap-3 mb-2">
                                        {/* Patient Avatar */}
                                        <img
                                          src={prescription.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(prescription.patientName)}&background=0077C2&color=fff&size=160&bold=true`}
                                          alt={prescription.patientName}
                                          className="h-10 w-10 rounded-lg object-cover ring-2 ring-slate-100 shrink-0"
                                          onError={(e) => {
                                            e.target.onerror = null
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(prescription.patientName)}&background=0077C2&color=fff&size=160&bold=true`
                                          }}
                                        />

                                        {/* Patient Name */}
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-base font-bold text-slate-900 truncate">
                                            {prescription.patientName}
                                          </h4>
                                        </div>
                                      </div>

                                      {/* Diagnosis */}
                                      {prescription.diagnosis && (
                                        <p className="text-sm text-slate-900 mb-2 line-clamp-1">
                                          {prescription.diagnosis}
                                        </p>
                                      )}

                                      {/* Additional Information */}
                                      <div className="flex flex-wrap items-center gap-2.5 mb-3 text-xs text-slate-600">
                                        {prescription.savedAt && (
                                          <div className="flex items-center gap-1">
                                            <IoTimeOutline className="h-3.5 w-3.5 text-slate-500" />
                                            <span>{prescription.savedAt}</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadPrescription(prescription)}
                                          className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 bg-white text-primary shadow-sm transition-all hover:border-primary hover:bg-[rgba(0,119,194,0.05)] active:scale-95"
                                          title="Download Prescription PDF"
                                        >
                                          <IoDownloadOutline className="h-4 w-4" />
                                          <span className="text-xs font-semibold">Download</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleEditPrescription(prescription)}
                                          className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-white shadow-sm shadow-[rgba(0,119,194,0.2)] transition-all hover:bg-primary-dark hover:shadow-md active:scale-95"
                                          title="Edit Prescription"
                                        >
                                          <IoCreateOutline className="h-4 w-4" />
                                          <span className="text-xs font-semibold">Edit</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => await handleViewPrescriptionPDF(prescription)}
                                          className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-300 bg-white text-primary shadow-sm transition-all hover:border-primary hover:bg-[rgba(0,119,194,0.05)] active:scale-95"
                                          title="View Prescription PDF"
                                        >
                                          <IoEyeOutline className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 lg:p-4 shadow-md shadow-slate-200/50">
                    <h3 className="mb-4 sm:mb-5 lg:mb-3 text-base sm:text-lg lg:text-base font-bold text-slate-900">Patient Medical History</h3>
                    {patientHistory ? (
                      <div className="space-y-6">
                        {/* Personal Info */}
                        {patientHistory.personalInfo && (
                          <div>
                            <h4 className="mb-3 text-sm font-semibold text-slate-900 uppercase tracking-wide">
                              Personal Information
                            </h4>
                            <div className="rounded-lg bg-slate-50 p-4">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <p className="text-xs text-slate-600">Blood Group</p>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {patientHistory.personalInfo?.bloodGroup || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-600">Phone</p>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {patientHistory.personalInfo?.phone || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Vitals Records */}
                        {(() => {
                          try {
                            // Extract vitals from consultations in patientHistory
                            const vitalsRecords = []

                            // First, try to get from patientHistory.consultations (from backend)
                            if (patientHistory?.consultations && Array.isArray(patientHistory.consultations)) {
                              patientHistory.consultations.forEach((consultation) => {
                                if (consultation.vitals) {
                                  // Check if vitals has any data
                                  const hasVitalsData = consultation.vitals.bloodPressure?.systolic ||
                                    consultation.vitals.temperature ||
                                    consultation.vitals.pulse ||
                                    consultation.vitals.heartRate ||
                                    consultation.vitals.respiratoryRate ||
                                    consultation.vitals.oxygenSaturation ||
                                    consultation.vitals.spo2 ||
                                    consultation.vitals.weight ||
                                    consultation.vitals.height ||
                                    consultation.vitals.bmi

                                  if (hasVitalsData) {
                                    const consultationDate = consultation.consultationDate || consultation.createdAt || consultation.updatedAt
                                    const dateObj = consultationDate ? new Date(consultationDate) : new Date()

                                    vitalsRecords.push({
                                      ...consultation.vitals,
                                      consultationId: consultation._id || consultation.id,
                                      date: consultationDate,
                                      dateObj: dateObj, // For sorting
                                      recordedAt: consultation.vitals.recordedAt ||
                                        dateObj.toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        }),
                                    })
                                  }
                                }
                              })
                            }

                            // Fallback: Also check localStorage for backward compatibility
                            if (vitalsRecords.length === 0) {
                              const historyKey = `patientHistory_${selectedConsultation?.patientId}`
                              const savedHistory = JSON.parse(localStorage.getItem(historyKey) || '{}')
                              const localStorageVitals = savedHistory.vitalsRecords || []
                              vitalsRecords.push(...localStorageVitals.map(v => ({
                                ...v,
                                dateObj: v.date ? new Date(v.date) : new Date()
                              })))
                            }

                            // Sort by date (newest first) - so latest vitals show first
                            vitalsRecords.sort((a, b) => {
                              const dateA = a.dateObj || (a.date ? new Date(a.date) : new Date(0))
                              const dateB = b.dateObj || (b.date ? new Date(b.date) : new Date(0))
                              return dateB - dateA // Newest first
                            })

                            if (vitalsRecords.length > 0) {
                              return (
                                <div>
                                  <h4 className="mb-3 text-sm font-semibold text-slate-900 uppercase tracking-wide">
                                    Vitals Records
                                  </h4>
                                  <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {vitalsRecords.map((vital, idx) => (
                                      <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-xs font-semibold text-slate-600">
                                            {vital.recordedAt || formatDate(vital.date)}
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                          {vital.bloodPressure?.systolic && vital.bloodPressure?.diastolic && (
                                            <div>
                                              <p className="text-slate-600">BP</p>
                                              <p className="font-semibold text-slate-900">
                                                {vital.bloodPressure.systolic}/{vital.bloodPressure.diastolic} mmHg
                                              </p>
                                            </div>
                                          )}
                                          {vital.temperature && (
                                            <div>
                                              <p className="text-slate-600">Temp</p>
                                              <p className="font-semibold text-slate-900">{vital.temperature} °F</p>
                                            </div>
                                          )}
                                          {(vital.pulse || vital.heartRate) && (
                                            <div>
                                              <p className="text-slate-600">Pulse</p>
                                              <p className="font-semibold text-slate-900">{vital.pulse || vital.heartRate} bpm</p>
                                            </div>
                                          )}
                                          {vital.respiratoryRate && (
                                            <div>
                                              <p className="text-slate-600">RR</p>
                                              <p className="font-semibold text-slate-900">{vital.respiratoryRate} /min</p>
                                            </div>
                                          )}
                                          {(vital.oxygenSaturation || vital.spo2) && (
                                            <div>
                                              <p className="text-slate-600">SpO2</p>
                                              <p className="font-semibold text-slate-900">{vital.oxygenSaturation || vital.spo2}%</p>
                                            </div>
                                          )}
                                          {vital.weight && (
                                            <div>
                                              <p className="text-slate-600">Weight</p>
                                              <p className="font-semibold text-slate-900">{vital.weight} kg</p>
                                            </div>
                                          )}
                                          {vital.height && (
                                            <div>
                                              <p className="text-slate-600">Height</p>
                                              <p className="font-semibold text-slate-900">{vital.height} cm</p>
                                            </div>
                                          )}
                                          {vital.bmi && (
                                            <div>
                                              <p className="text-slate-600">BMI</p>
                                              <p className="font-semibold text-slate-900">{vital.bmi}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                          } catch (error) {
                            console.error('Error loading vitals records:', error)
                          }
                          return null
                        })()}

                        {/* Previous Consultations */}
                        <div>
                          <h4 className="mb-3 text-sm font-semibold text-slate-900 uppercase tracking-wide">
                            Previous Consultations
                          </h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {(() => {
                              // Get consultations from patientHistory.consultations (backend) or patientHistory.previousConsultations (fallback)
                              const consultations = patientHistory?.consultations || patientHistory?.previousConsultations || []

                              if (Array.isArray(consultations) && consultations.length > 0) {
                                // Sort by date (newest first)
                                const sortedConsultations = [...consultations].sort((a, b) => {
                                  const dateA = new Date(a.consultationDate || a.date || a.createdAt || 0)
                                  const dateB = new Date(b.consultationDate || b.date || b.createdAt || 0)
                                  return dateB - dateA
                                })

                                return sortedConsultations.map((consult, idx) => {
                                  // Get doctor name - check multiple possible locations
                                  let doctorName = 'Unknown Doctor'
                                  if (consult.doctorId) {
                                    if (typeof consult.doctorId === 'object') {
                                      // Populated doctor object
                                      if (consult.doctorId.firstName && consult.doctorId.lastName) {
                                        doctorName = `Dr. ${consult.doctorId.firstName} ${consult.doctorId.lastName}`
                                      } else if (consult.doctorId.name) {
                                        doctorName = consult.doctorId.name
                                      }
                                    } else {
                                      // Just ID, try to get from current doctor context
                                      doctorName = 'Current Doctor'
                                    }
                                  } else if (consult.doctor) {
                                    doctorName = typeof consult.doctor === 'string' ? consult.doctor : `Dr. ${consult.doctor.name || 'Unknown'}`
                                  }

                                  // Get diagnosis - show actual diagnosis or indicate if missing
                                  const diagnosis = consult.diagnosis && consult.diagnosis.trim() !== ''
                                    ? consult.diagnosis
                                    : 'No diagnosis recorded'

                                  // Get date
                                  const date = consult.consultationDate || consult.date || consult.createdAt || consult.updatedAt

                                  // Get advice if available
                                  const advice = consult.advice || ''

                                  // Get investigations if available
                                  const investigations = consult.investigations || []

                                  return (
                                    <div key={consult._id || consult.id || idx} className="rounded-lg border border-slate-200 bg-white p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <p className="text-sm sm:text-base font-semibold text-slate-900">{diagnosis}</p>
                                          <p className="mt-1 text-xs text-slate-600">{formatDate(date)}</p>
                                          <p className="mt-1 text-xs text-slate-600">{doctorName}</p>

                                          {/* Show advice if available */}
                                          {advice && advice.trim() !== '' && (
                                            <div className="mt-2 rounded bg-blue-50 border border-blue-200 p-2">
                                              <p className="text-xs font-semibold text-blue-900 mb-1">Advice</p>
                                              <p className="text-xs text-blue-800">{advice}</p>
                                            </div>
                                          )}

                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                              }

                              return <p className="text-sm text-slate-500">No previous consultations</p>
                            })()}
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <IoMedicalOutline className="mx-auto h-16 w-16 text-slate-300" />
                        <p className="mt-4 text-sm font-medium text-slate-600">No medical history available</p>
                        <p className="mt-1 text-xs text-slate-500">This appears to be the patient's first visit</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <IoDocumentTextOutline className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm font-medium text-slate-600">No active consultation</p>
            <p className="mt-1 text-xs text-slate-500">Select a patient from the Patients tab to start</p>
          </div>
        )}
      </section>
    </>
  )
}

export default DoctorConsultations
