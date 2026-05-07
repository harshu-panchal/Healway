import { useNavigate } from 'react-router-dom'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { getSocket } from '../../../utils/socketClient'
import DoctorNavbar from '../doctor-components/DoctorNavbar'
import DoctorSidebar from '../doctor-components/DoctorSidebar'
import { useToast } from '../../../contexts/ToastContext'
import {
  getDoctorDashboard,
  getDoctorAppointments,
  getDoctorQueue,
  getDoctorConsultations,
  getDoctorProfile,
  getDoctorWalletBalance,
  getPatientById,
  getConsultationById,
  getMyAnnouncements
} from '../doctor-services/doctorService'
import { getFileUrl } from '../../../utils/apiClient'
import NotificationBell from '../../../components/NotificationBell'
import {
  IoPeopleOutline,
  IoDocumentTextOutline,
  IoCalendarOutline,
  IoWalletOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoLocationOutline,
  IoPersonOutline,
  IoTrendingUpOutline,
  IoTrendingDownOutline,
  IoNotificationsOutline,
  IoMenuOutline,
  IoHomeOutline,
  IoPersonCircleOutline,
  IoChatbubbleOutline,
  IoHelpCircleOutline,
  IoSearchOutline,
  IoPhonePortraitOutline,
  IoMailOutline,
  IoMegaphoneOutline,
  IoArrowForwardOutline,
  IoVideocamOutline,
  IoCallOutline,
} from 'react-icons/io5'

// Default stats (will be replaced by API data)
const defaultStats = {
  totalPatients: 0,
  totalConsultations: 0,
  todayAppointments: 0,
  totalEarnings: 0,
  pendingConsultations: 0,
  thisMonthEarnings: 0,
  lastMonthEarnings: 0,
  thisMonthConsultations: 0,
  lastMonthConsultations: 0,
}

// Helper function to get today's date string in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Mock data removed - using API data now

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed':
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

const getTypeIcon = (type) => {
  const normalizedType = type?.toLowerCase() || ''
  if (normalizedType.includes('video')) return IoVideocamOutline
  if (normalizedType.includes('call') || normalizedType.includes('voice')) return IoCallOutline
  return IoPersonOutline
}

const DoctorDashboard = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [appointmentStatistics, setAppointmentStatistics] = useState(null) // Statistics from backend
  const [recentConsultations, setRecentConsultations] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [stats, setStats] = useState(defaultStats)
  const [loading, setLoading] = useState(false) // Start with false to show content immediately
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)

  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  // Fetch profile and dashboard data in parallel for faster loading
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)

      // Fetch profile and dashboard in parallel
      const [profileResponse, dashboardResponse, announcementsResponse] = await Promise.allSettled([
        getDoctorProfile().catch(() => null),
        getDoctorDashboard(),
        getMyAnnouncements().catch(() => [])
      ])

      // Handle announcements response
      if (announcementsResponse.status === 'fulfilled' && announcementsResponse.value) {
        setAnnouncements(Array.isArray(announcementsResponse.value) ? announcementsResponse.value.slice(0, 3) : []) // Show only latest 3
      }

      // Handle profile response (non-critical, don't block UI)
      if (profileResponse.status === 'fulfilled' && profileResponse.value) {
        const doctor = profileResponse.value.doctor || profileResponse.value
        setProfile({
          firstName: doctor.firstName || '',
          lastName: doctor.lastName || '',
          clinicName: doctor.clinicDetails?.name || '',
          clinicAddress: doctor.clinicDetails?.address || {},
          isActive: doctor.isActive !== undefined ? doctor.isActive : true,
        })
      }

      // Handle dashboard response
      const data = dashboardResponse.status === 'fulfilled' ? dashboardResponse.value : null

      if (data) {
        const statsUpdate = {
          totalPatients: Number(data.totalPatients || 0),
          totalConsultations: Number(data.totalConsultations || 0),
          todayAppointments: Number(data.todayAppointments || 0),
          totalEarnings: Number(data.totalEarnings || 0),
          pendingConsultations: Number(data.pendingConsultations || 0),
          thisMonthEarnings: Number(data.thisMonthEarnings || 0),
          lastMonthEarnings: Number(data.lastMonthEarnings || 0),
          thisMonthConsultations: Number(data.thisMonthConsultations || 0),
          lastMonthConsultations: Number(data.lastMonthConsultations || 0),
        }
        setStats(statsUpdate)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleUpdate = () => {
      console.log('🔄 Doctor Dashboard refreshing due to real-time update...')
      fetchDashboardData(false)
    }

    // Attach listeners for doctor-relevant events
    socket.on('appointment:created', handleUpdate)
    socket.on('appointment:updated', handleUpdate)
    socket.on('appointment:cancelled', handleUpdate)
    socket.on('queue:updated', handleUpdate)
    socket.on('consultation:completed', handleUpdate)
    socket.on('notification:new', handleUpdate)

    return () => {
      socket.off('appointment:created', handleUpdate)
      socket.off('appointment:updated', handleUpdate)
      socket.off('appointment:cancelled', handleUpdate)
      socket.off('queue:updated', handleUpdate)
      socket.off('consultation:completed', handleUpdate)
      socket.off('notification:new', handleUpdate)
    }
  }, [fetchDashboardData])

  const earningsChange = stats.lastMonthEarnings > 0
    ? ((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings) * 100
    : 0
  const consultationsChange = stats.lastMonthConsultations > 0
    ? ((stats.thisMonthConsultations - stats.lastMonthConsultations) / stats.lastMonthConsultations) * 100
    : 0

  // Fetch appointments from API
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await getDoctorAppointments()

        if (data) {
          // Store statistics from backend if available
          if (data.statistics) {
            setAppointmentStatistics(data.statistics)
          }

          // Handle both array and object with items/appointments property
          const appointmentsData = Array.isArray(data)
            ? data
            : data.items || data.appointments || []

          // Transform API data to match component structure
          const transformed = appointmentsData.map(apt => ({
            rescheduledAt: apt.rescheduledAt,
            isRescheduled: !!apt.rescheduledAt,
            id: apt._id || apt.id,
            patientId: apt.patientId?._id || apt.patientId || 'pat-unknown',
            patientName: apt.patientId?.firstName && apt.patientId?.lastName
              ? `${apt.patientId.firstName} ${apt.patientId.lastName}`
              : apt.patientId?.name || apt.patientName || 'Unknown Patient',
            patientImage: apt.patientId?.profileImage ? getFileUrl(apt.patientId.profileImage) : (apt.patientImage ? getFileUrl(apt.patientImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.patientId?.firstName || apt.patientName || 'Patient')}&background=0077C2&color=fff&size=160`),
            date: apt.appointmentDate || apt.date || getTodayDateString(),
            time: apt.time || apt.slotTime || '10:00 AM',
            // Normalized consultation mode for internal logic
            consultationMode: (() => {
              const rawMode = (apt.consultationMode || apt.appointmentType || apt.type || "").toLowerCase();
              if (rawMode.includes("video")) return "video_call";
              if (rawMode.includes("voice") || rawMode.includes("call") || rawMode.includes("online") || rawMode.includes("audio")) return "voice_call";
              return "in-person";
            })(),
            // Format type for display
            type: (() => {
              const rawMode = (apt.consultationMode || apt.appointmentType || apt.type || "In-person").toLowerCase();
              if (rawMode.includes("video")) return "Video Call";
              if (rawMode.includes("voice") || rawMode.includes("call") || rawMode.includes("online") || rawMode.includes("audio")) return "Voice Call";
              return "In-Person";
            })(),
            status: apt.status || 'scheduled',
            duration: apt.duration || '30 min',
            reason: apt.reason || apt.consultationReason || 'Consultation',
            appointmentType: apt.appointmentType || 'New',
            patientPhone: apt.patientId?.phone || apt.patientPhone || '',
            patientEmail: apt.patientId?.email || apt.patientEmail || '',
            patientAddress: apt.patientId?.address
              ? [
                apt.patientId.address.line1,
                apt.patientId.address.line2,
                apt.patientId.address.city,
                apt.patientId.address.state,
                apt.patientId.address.postalCode,
                apt.patientId.address.country
              ].filter(Boolean).join(', ').trim() || 'Not provided'
              : apt.patientAddress || 'Not provided',
            age: (() => {
              if (apt.patientId?.dateOfBirth) {
                const birthDate = new Date(apt.patientId.dateOfBirth)
                if (!isNaN(birthDate.getTime())) {
                  const today = new Date()
                  let age = today.getFullYear() - birthDate.getFullYear()
                  const monthDiff = today.getMonth() - birthDate.getMonth()
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--
                  }
                  return age
                }
              }
              return apt.patientId?.age || apt.age || null
            })(),
            gender: apt.patientId?.gender || apt.gender || '',
            originalData: apt,
          }))

          setAppointments(transformed)
        }
      } catch (err) {
        console.error('Error fetching appointments:', err)
        setError(err.message || 'Failed to load appointments')
        // Don't show toast here as it's not critical
      }
    }

    fetchAppointments()

    // Listen for appointment booking event to refresh appointments
    const handleAppointmentBooked = () => {
      fetchAppointments()
    }
    window.addEventListener('appointmentBooked', handleAppointmentBooked)

    // Reduced polling frequency - Socket.IO already handles real-time updates
    const interval = setInterval(fetchAppointments, 120000) // 2 minutes instead of 30s
    return () => {
      clearInterval(interval)
      window.removeEventListener('appointmentBooked', handleAppointmentBooked)
    }
  }, [fetchDashboardData]) // Added fetchDashboardData to dependencies

  // Fetch recent consultations from API
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const response = await getDoctorConsultations({ limit: 8, sort: '-createdAt' })

        if (response) {
          const consultationsData = Array.isArray(response)
            ? response
            : response.consultations || []

          // Transform API data to match component structure
          const transformed = consultationsData.map(cons => ({
            id: cons._id || cons.id,
            patientName: cons.patientId?.firstName && cons.patientId?.lastName
              ? `${cons.patientId.firstName} ${cons.patientId.lastName}`
              : cons.patientId?.name || cons.patientName || 'Unknown Patient',
            patientImage: cons.patientId?.profileImage ? getFileUrl(cons.patientId.profileImage) : (cons.patientImage ? getFileUrl(cons.patientImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(cons.patientId?.firstName || cons.patientName || 'Patient')}&background=0077C2&color=fff&size=128`),
            date: cons.consultationDate || cons.date || new Date().toISOString().split('T')[0],
            time: cons.time || cons.slotTime || '10:00 AM',
            // Format type for display
            type: (() => {
              const mode = cons.consultationType || cons.type || "In-person";
              const normalized = mode.toLowerCase();
              if (normalized.includes("video")) return "Video Call";
              if (normalized.includes("voice") || normalized.includes("call")) return "Voice Call";
              return "In-Person";
            })(),
            status: cons.status || 'pending',
            fee: cons.fee || cons.consultationFee || 0,
            notes: cons.notes || cons.summary || '',
          }))

          setRecentConsultations(transformed)
        }
      } catch (err) {
        console.error('Error fetching consultations:', err)
        // Don't show error toast as it's not critical
      }
    }

    fetchConsultations()
  }, [])

  // Helper function to normalize date to YYYY-MM-DD format
  const normalizeDate = (dateValue) => {
    if (!dateValue) return null
    if (typeof dateValue === 'string') {
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue
      }
      // Otherwise parse it
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return null
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return null
      const year = dateValue.getFullYear()
      const month = String(dateValue.getMonth() + 1).padStart(2, '0')
      const day = String(dateValue.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return null
  }

  // Calculate appointment counts - use backend statistics if available
  const appointmentStats = useMemo(() => {
    // If backend statistics are available, use them
    if (appointmentStatistics) {
      const todayScheduled = appointmentStatistics.today?.scheduled || 0
      const todayRescheduled = appointmentStatistics.today?.rescheduled || 0
      const monthScheduled = appointmentStatistics.monthly?.scheduled || 0
      const monthRescheduled = appointmentStatistics.monthly?.rescheduled || 0
      const yearScheduled = appointmentStatistics.yearly?.scheduled || 0
      const yearRescheduled = appointmentStatistics.yearly?.rescheduled || 0

      return {
        todayCount: appointmentStatistics.today?.total || (todayScheduled + todayRescheduled),
        todayScheduled: todayScheduled,
        todayRescheduled: todayRescheduled,
        monthCount: appointmentStatistics.monthly?.total || (monthScheduled + monthRescheduled),
        monthScheduled: monthScheduled,
        monthRescheduled: monthRescheduled,
        yearCount: appointmentStatistics.yearly?.total || (yearScheduled + yearRescheduled),
        yearScheduled: yearScheduled,
        yearRescheduled: yearRescheduled,
      }
    }

    // Fallback: calculate from appointments (client-side)
    const today = getTodayDateString()
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)

    // Current month start and end
    const currentMonthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
    const currentMonthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0)
    currentMonthEnd.setHours(23, 59, 59, 999)

    // Current year start and end
    const currentYearStart = new Date(todayDate.getFullYear(), 0, 1)
    const currentYearEnd = new Date(todayDate.getFullYear(), 11, 31)
    currentYearEnd.setHours(23, 59, 59, 999)

    let todayCount = 0
    let todayScheduled = 0
    let todayRescheduled = 0
    let monthCount = 0
    let monthScheduled = 0
    let monthRescheduled = 0
    let yearCount = 0
    let yearScheduled = 0
    let yearRescheduled = 0

    appointments.forEach(apt => {
      // Try both date and appointmentDate fields
      const dateStr = normalizeDate(apt.date || apt.appointmentDate)
      if (!dateStr) return

      const aptDate = new Date(dateStr)
      if (isNaN(aptDate.getTime())) return

      aptDate.setHours(0, 0, 0, 0)
      const isRescheduled = apt.isRescheduled || apt.rescheduledAt

      // Today count - compare normalized date strings
      if (dateStr === today || aptDate.getTime() === todayDate.getTime()) {
        todayCount++
        if (isRescheduled) {
          todayRescheduled++
        } else {
          todayScheduled++
        }
      }

      // Month count
      if (aptDate >= currentMonthStart && aptDate <= currentMonthEnd) {
        monthCount++
        if (isRescheduled) {
          monthRescheduled++
        } else {
          monthScheduled++
        }
      }

      // Year count
      if (aptDate >= currentYearStart && aptDate <= currentYearEnd) {
        yearCount++
        if (isRescheduled) {
          yearRescheduled++
        } else {
          yearScheduled++
        }
      }
    })

    // Always use the sum of scheduled and rescheduled for total counts
    const finalTodayCount = todayScheduled + todayRescheduled
    const finalMonthCount = monthScheduled + monthRescheduled
    const finalYearCount = yearScheduled + yearRescheduled

    return {
      todayCount: finalTodayCount,
      todayScheduled,
      todayRescheduled,
      monthCount: finalMonthCount,
      monthScheduled,
      monthRescheduled,
      yearCount: finalYearCount,
      yearScheduled,
      yearRescheduled,
    }
  }, [appointmentStatistics, appointments])

  // Filter today's appointments dynamically
  const todayAppointments = useMemo(() => {
    const today = getTodayDateString()
    return appointments.filter((apt) => {
      // Exclude pending payment appointments - only show paid appointments
      const paymentStatus = apt.paymentStatus || apt.originalData?.paymentStatus
      if (paymentStatus === 'pending') {
        return false
      }

      // Try both date and appointmentDate fields
      const dateStr = normalizeDate(apt.date || apt.appointmentDate)
      if (!dateStr) return false

      // Compare normalized date strings
      if (dateStr === today) return true

      // Also compare as Date objects for safety
      const aptDate = new Date(dateStr)
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)
      aptDate.setHours(0, 0, 0, 0)
      return aptDate.getTime() === todayDate.getTime()
    }).sort((a, b) => {
      // Sort by time
      const timeA = a.time || '00:00'
      const timeB = b.time || '00:00'
      return timeA.localeCompare(timeB)
    })
  }, [appointments])

  // Sidebar navigation items
  const sidebarNavItems = [
    { id: 'home', label: 'Dashboard', to: '/doctor/dashboard', Icon: IoHomeOutline },
    { id: 'analytics', label: 'Business & Analytics', to: '/doctor/analytics', Icon: IoTrendingUpOutline },
    { id: 'queue', label: 'Queue', to: '/doctor/queue', Icon: IoTimeOutline },
    { id: 'consultations', label: 'Consultations', to: '/doctor/consultations', Icon: IoDocumentTextOutline },
    { id: 'patients', label: 'Patients', to: '/doctor/patients', Icon: IoPeopleOutline },
    { id: 'announcements', label: 'Announcements', to: '/doctor/announcements', Icon: IoMegaphoneOutline },
    { id: 'wallet', label: 'Wallet', to: '/doctor/wallet', Icon: IoWalletOutline },
    { id: 'support', label: 'Support', to: '/doctor/support', Icon: IoHelpCircleOutline },
    { id: 'profile', label: 'Profile', to: '/doctor/profile', Icon: IoPersonCircleOutline },
  ]

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleSidebarClose = () => {
    setIsSidebarOpen(false)
  }

  const handleLogout = async () => {
    handleSidebarClose()
    try {
      const { logoutDoctor } = await import('../doctor-services/doctorService')
      await logoutDoctor()
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Error during logout:', error)
      // Clear tokens manually if API call fails
      const { clearDoctorTokens } = await import('../doctor-services/doctorService')
      clearDoctorTokens()
      toast.success('Logged out successfully')
    }
    // Force navigation to login page - full page reload to clear all state
    setTimeout(() => {
      window.location.href = '/doctor/login'
    }, 500)
  }

  const handleViewAppointment = async (appointment) => {
    try {
      // First, try to find existing consultation for this appointment
      const consultationsResponse = await getDoctorConsultations()
      let existingConsultation = null

      if (consultationsResponse) {
        const consultations = Array.isArray(consultationsResponse)
          ? consultationsResponse
          : consultationsResponse.items || consultationsResponse.consultations || []

        // Find consultation by appointmentId
        existingConsultation = consultations.find(cons =>
          cons.appointmentId?._id?.toString() === appointment.id?.toString() ||
          cons.appointmentId?.id?.toString() === appointment.id?.toString() ||
          cons.appointmentId?.toString() === appointment.id?.toString()
        )
      }

      // If consultation exists, fetch full consultation data
      if (existingConsultation) {
        try {
          const consultationResponse = await getConsultationById(existingConsultation._id || existingConsultation.id)
          if (consultationResponse) {
            navigate('/doctor/consultations', {
              state: {
                selectedConsultation: consultationResponse,
                loadSavedData: true,
              },
            })
            return
          }
        } catch (error) {
          console.error('Error fetching consultation:', error)
        }
      }

      // If no consultation exists, fetch patient data and create consultation object
      let patientData = null
      if (appointment.patientId) {
        try {
          const patientResponse = await getPatientById(appointment.patientId)
          if (patientResponse) {
            patientData = patientResponse
          }
        } catch (error) {
          console.error('Error fetching patient data:', error)
        }
      }

      // Calculate age from dateOfBirth
      const calculateAge = (dateOfBirth) => {
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
          return null
        }
      }

      // Use patient data from API or fallback to appointment data
      const finalPatientData = patientData || appointment.originalData?.patientId || {}
      const patientDateOfBirth = finalPatientData.dateOfBirth || appointment.originalData?.patientId?.dateOfBirth
      const calculatedAge = patientDateOfBirth ? calculateAge(patientDateOfBirth) : (finalPatientData.age || appointment.age || null)

      // Format address properly
      let formattedAddress = 'Not provided'
      const address = finalPatientData.address || appointment.originalData?.patientId?.address
      if (address) {
        const addressParts = [
          address.line1,
          address.line2,
          address.city,
          address.state,
          address.postalCode,
          address.country
        ].filter(Boolean)
        if (addressParts.length > 0) {
          formattedAddress = addressParts.join(', ')
        }
      } else if (appointment.patientAddress && appointment.patientAddress !== 'Address not provided' && appointment.patientAddress !== 'Not provided') {
        formattedAddress = appointment.patientAddress
      }

      // Format appointment date properly
      const appointmentDate = appointment.date || appointment.appointmentDate
      const appointmentTime = appointment.time || '00:00'
      const formattedAppointmentTime = appointmentDate
        ? `${appointmentDate.split('T')[0]}T${appointmentTime}`
        : new Date().toISOString()

      // Get patient ID as string
      const patientIdString = appointment.patientId || finalPatientData._id || finalPatientData.id

      // Create consultation object with real data
      const consultationData = {
        id: `cons-${appointment.id}-${Date.now()}`,
        _id: `cons-${appointment.id}-${Date.now()}`,
        patientName: finalPatientData.firstName && finalPatientData.lastName
          ? `${finalPatientData.firstName} ${finalPatientData.lastName}`
          : appointment.patientName || 'Unknown Patient',
        age: calculatedAge,
        gender: finalPatientData.gender || appointment.gender || 'male',
        appointmentTime: formattedAppointmentTime,
        appointmentDate: appointmentDate ? appointmentDate.split('T')[0] : null,
        appointmentType: appointment.appointmentType || 'New',
        consultationMode: appointment.consultationMode || 'in-person',
        status: 'in-progress',
        reason: appointment.reason || 'Consultation',
        patientImage: finalPatientData.profileImage ? getFileUrl(finalPatientData.profileImage) : (appointment.patientImage ? getFileUrl(appointment.patientImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(finalPatientData.firstName || appointment.patientName || 'Patient')}&background=0077C2&color=fff&size=160`),
        patientPhone: finalPatientData.phone || appointment.patientPhone || '',
        patientEmail: finalPatientData.email || appointment.patientEmail || '',
        patientAddress: formattedAddress,
        // Include patientId object structure for transformConsultationData
        patientId: {
          _id: patientIdString,
          id: patientIdString,
          firstName: finalPatientData.firstName || appointment.patientName?.split(' ')[0] || '',
          lastName: finalPatientData.lastName || appointment.patientName?.split(' ').slice(1).join(' ') || '',
          email: finalPatientData.email || appointment.patientEmail || '',
          phone: finalPatientData.phone || appointment.patientPhone || '',
          dateOfBirth: patientDateOfBirth || null,
          gender: finalPatientData.gender || appointment.gender || 'male',
          profileImage: finalPatientData.profileImage ? getFileUrl(finalPatientData.profileImage) : (appointment.patientImage ? getFileUrl(appointment.patientImage) : null),
          address: address || null,
        },
        diagnosis: '',
        vitals: {},
        investigations: [],
        advice: '',
        attachments: [],
        appointmentId: appointment.id || appointment._id,
        originalAppointment: appointment.originalData || appointment,
      }

      navigate('/doctor/consultations', {
        state: {
          selectedConsultation: consultationData,
        },
      })
    } catch (error) {
      console.error('Error handling appointment view:', error)
      toast.error('Failed to load consultation data')
    }
  }

  return (
    <>
      <DoctorNavbar />
      <DoctorSidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        navItems={sidebarNavItems}
        onLogout={handleLogout}
      />
      <section className="flex flex-col gap-4 pb-24 -mt-20 lg:mt-0 lg:pb-8">
        {/* Top Header with Gradient Background - Hidden on Desktop */}
        <header
          className="lg:hidden relative text-white -mx-4 mb-4 overflow-hidden"
          style={{
            background: 'linear-gradient(to right, var(--color-primary) 0%, var(--color-primary-light) 50%, var(--color-primary-lighter) 100%)'
          }}
        >
          <div className="px-4 pt-5 pb-4">
            {/* Top Section - Doctor Info */}
            <div className="flex items-start justify-between mb-3.5">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight mb-0.5">
                  {profile?.firstName || profile?.lastName
                    ? `Dr. ${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                    : 'Doctor'}
                </h1>
                <p className="text-sm font-normal text-white/95 leading-tight">
                  {profile?.clinicName || 'Clinic'} • <span className="text-white font-medium">{profile?.isActive ? 'Online' : 'Offline'}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                  <NotificationBell className="text-white" />
                </div>
                <button
                  type="button"
                  onClick={handleSidebarToggle}
                  className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white"
                  aria-label="Menu"
                >
                  <IoMenuOutline className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            </div>

            {/* Removed Queue Status Button */}
          </div>
        </header>

        {/* Search Bar - Desktop Only */}
        <div className="hidden lg:block mb-6">
          <div className="relative w-full group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 group-hover:scale-110 group-focus-within:scale-110">
              <IoSearchOutline className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors duration-300" />
            </div>
            <input
              type="text"
              placeholder="Search patients, appointments, consultations..."
              className="w-full pl-11 pr-20 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 shadow-sm hover:shadow-md hover:border-primary/50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
              <kbd className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-300 rounded">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 lg:gap-4">
          {/* Total Patients */}
          <article
            onClick={() => navigate('/doctor/all-patients')}
            className="group relative overflow-hidden rounded-xl lg:rounded-2xl border border-primary/20 bg-white p-3 lg:p-6 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/40 active:scale-[0.98] lg:hover:scale-105"
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-300"></div>

            <div className="relative flex items-start justify-between mb-2 lg:mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] lg:text-xs font-semibold uppercase tracking-wide text-primary leading-tight mb-1 lg:mb-2 group-hover:text-primary-dark transition-colors">Total Patients</p>
                <p className="text-xl lg:text-3xl font-bold text-slate-900 leading-none group-hover:text-primary transition-colors duration-300">{loading ? '...' : stats.totalPatients}</p>
              </div>
              <div className="flex h-8 w-8 lg:h-14 lg:w-14 items-center justify-center rounded-lg lg:rounded-xl bg-primary text-white group-hover:bg-[var(--color-primary-dark)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <IoPeopleOutline className="text-base lg:text-2xl" aria-hidden="true" />
              </div>
            </div>
            <p className="relative text-[10px] lg:text-xs text-slate-600 leading-tight group-hover:text-slate-700 transition-colors">Active patients</p>
            <div className="hidden lg:block mt-3 pt-3 border-t border-slate-100 group-hover:border-primary/20 transition-colors">
              <p className="text-xs text-slate-500 group-hover:text-primary font-medium transition-colors">New this month: <span className="text-emerald-600 font-semibold">+12</span></p>
            </div>
          </article>

          {/* Total Consultations */}
          <article
            onClick={() => navigate('/doctor/all-consultations')}
            className="group relative overflow-hidden rounded-xl lg:rounded-2xl border border-emerald-100 bg-white p-3 lg:p-6 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300 active:scale-[0.98] lg:hover:scale-105"
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-emerald-500/10 transition-all duration-300"></div>

            <div className="relative flex items-start justify-between mb-2 lg:mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] lg:text-xs font-semibold uppercase tracking-wide text-emerald-700 leading-tight mb-1 lg:mb-2 group-hover:text-emerald-800 transition-colors">Total Consultations</p>
                <p className="text-xl lg:text-3xl font-bold text-slate-900 leading-none group-hover:text-emerald-700 transition-colors duration-300">{loading ? '...' : stats.totalConsultations}</p>
              </div>
              <div className="flex h-8 w-8 lg:h-14 lg:w-14 items-center justify-center rounded-lg lg:rounded-xl bg-emerald-500 text-white group-hover:bg-emerald-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <IoDocumentTextOutline className="text-base lg:text-2xl" aria-hidden="true" />
              </div>
            </div>
            <p className="relative text-[10px] lg:text-xs text-slate-600 leading-tight group-hover:text-slate-700 transition-colors">All time</p>
            <div className="hidden lg:block mt-3 pt-3 border-t border-slate-100 group-hover:border-emerald-200 transition-colors">
              <p className="text-xs text-slate-500 group-hover:text-emerald-700 font-medium transition-colors">This month: <span className="text-emerald-600 font-semibold">{loading ? '...' : stats.thisMonthConsultations}</span></p>
            </div>
          </article>

          {/* Appointments */}
          <article
            onClick={() => navigate('/doctor/appointments')}
            className="group relative overflow-hidden rounded-xl lg:rounded-2xl border border-purple-100 bg-white p-3 lg:p-6 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-300 active:scale-[0.98] lg:hover:scale-105"
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-purple-500/10 transition-all duration-300"></div>

            <div className="relative flex items-start justify-between mb-2 lg:mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] lg:text-xs font-semibold uppercase tracking-wide text-purple-700 leading-tight mb-1 lg:mb-2 group-hover:text-purple-800 transition-colors">Appointment</p>
                <p className="text-xl lg:text-3xl font-bold text-slate-900 leading-none group-hover:text-purple-700 transition-colors duration-300">
                  {appointmentStats.todayCount || ((appointmentStats.todayScheduled || 0) + (appointmentStats.todayRescheduled || 0))}
                </p>
              </div>
              <div className="flex h-8 w-8 lg:h-14 lg:w-14 items-center justify-center rounded-lg lg:rounded-xl bg-purple-500 text-white group-hover:bg-purple-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <IoCalendarOutline className="text-base lg:text-2xl" aria-hidden="true" />
              </div>
            </div>
            <div className="relative space-y-0.5">
              <p className="text-[10px] lg:text-xs text-slate-600 leading-tight font-medium group-hover:text-slate-700 transition-colors">Today</p>
            </div>
            <div className="hidden lg:block mt-3 pt-3 border-t border-slate-100 group-hover:border-purple-200 transition-colors">
              <p className="text-xs text-slate-500 group-hover:text-purple-700 font-medium transition-colors">Pending: <span className="text-amber-600 font-semibold">{loading ? '...' : stats.pendingConsultations}</span></p>
            </div>
          </article>

          {/* New Announcement Card */}
          <article
            onClick={() => navigate('/doctor/announcements')}
            className="group relative overflow-hidden rounded-xl lg:rounded-2xl border border-amber-100 bg-white p-3 lg:p-6 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-300 active:scale-[0.98] lg:hover:scale-105"
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-300"></div>

            <div className="relative flex items-start justify-between mb-2 lg:mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] lg:text-xs font-semibold uppercase tracking-wide text-amber-700 leading-tight mb-1 lg:mb-2 group-hover:text-amber-800 transition-colors">Announcements</p>
                <p className="text-xl lg:text-3xl font-bold text-slate-900 leading-none group-hover:text-amber-700 transition-colors duration-300">{announcements.length}</p>
              </div>
              <div className="flex h-8 w-8 lg:h-14 lg:w-14 items-center justify-center rounded-lg lg:rounded-xl bg-amber-500 text-white group-hover:bg-amber-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <IoMegaphoneOutline className="text-base lg:text-2xl" aria-hidden="true" />
              </div>
            </div>
            <p className="relative text-[10px] lg:text-xs text-slate-600 leading-tight group-hover:text-slate-700 transition-colors">Recent active</p>
            <div className="hidden lg:block mt-3 pt-3 border-t border-slate-100 group-hover:border-amber-200 transition-colors">
              <p className="text-xs text-primary font-medium transition-colors flex items-center gap-1 group-hover:underline">Manage announcements <IoArrowForwardOutline className="h-3 w-3" /></p>
            </div>
          </article>
        </div>

        {/* Today's Schedule */}
        <section aria-labelledby="schedule-title" className="space-y-3">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 id="schedule-title" className="text-base lg:text-lg font-semibold text-slate-900">
                Today's Schedule
              </h2>
              <span className="flex h-6 min-w-7 items-center justify-center rounded-full bg-[rgba(0,119,194,0.15)] px-2 text-xs font-medium text-primary">
                {todayAppointments.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/doctor/appointments')}
              className="text-sm font-medium text-primary hover:text-primary focus-visible:outline-none focus-visible:underline"
            >
              See all
            </button>
          </header>

          <div className="space-y-3 lg:grid lg:grid-cols-4 lg:gap-4 lg:space-y-0">
            {todayAppointments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <IoCalendarOutline className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm font-medium text-slate-600">No appointments today</p>
                <p className="mt-1 text-xs text-slate-500">Your schedule is clear</p>
              </div>
            ) : (
              todayAppointments.map((appointment) => {
                const TypeIcon = getTypeIcon(appointment.type)
                return (
                  <article
                    key={appointment.id}
                    onClick={() => handleViewAppointment(appointment)}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 lg:p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 cursor-pointer active:scale-[0.98] lg:hover:scale-[1.02]"
                  >
                    {/* Hover Background Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0077C2]/0 to-[#0077C2]/0 group-hover:from-[#0077C2]/5 group-hover:to-[#0077C2]/10 transition-all duration-300"></div>
                    <div className="relative flex items-start gap-3 lg:gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={appointment.patientImage}
                          alt={appointment.patientName}
                          className="h-12 w-12 lg:h-14 lg:w-14 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-primary/30 transition-all duration-300 group-hover:scale-110"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(appointment.patientName)}&background=0077C2&color=fff&size=128&bold=true`
                          }}
                        />
                        {appointment.status === 'confirmed' && (
                          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 lg:h-5 lg:w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white group-hover:scale-110 group-hover:ring-emerald-400 transition-all duration-300">
                            <IoCheckmarkCircleOutline className="h-2.5 w-2.5 lg:h-3 lg:w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm lg:text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors duration-300">{appointment.patientName}</h3>
                            <p className="mt-0.5 text-xs lg:text-xs text-slate-600 group-hover:text-slate-700 transition-colors line-clamp-1">{appointment.reason}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] lg:text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(appointment.status)} group-hover:scale-105 transition-transform duration-300`}>
                              {appointment.status === 'confirmed' ? (
                                <IoCheckmarkCircleOutline className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                              ) : (
                                <IoTimeOutline className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                              )}
                              {appointment.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 lg:mt-2.5 flex flex-wrap items-center gap-2 lg:gap-2.5 text-[10px] lg:text-xs text-slate-600 group-hover:text-slate-700 transition-colors">
                          <div className="flex items-center gap-1 group-hover/item:scale-105 transition-transform">
                            <IoTimeOutline className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-primary group-hover:text-primary" />
                            <span className="font-medium">{appointment.time}</span>
                          </div>
                          <div className="flex items-center gap-1 group-hover/item:scale-105 transition-transform">
                            <TypeIcon className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-primary" />
                            <span>{appointment.type}</span>
                          </div>
                          <div className="flex items-center gap-1 group-hover/item:scale-105 transition-transform">
                            <IoCalendarOutline className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-primary" />
                            <span>{appointment.duration}</span>
                          </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-100 group-hover:border-primary/20 transition-colors">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 group-hover:text-primary transition-colors">
                            <IoPhonePortraitOutline className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Contact</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>



        {/* Recent Consultations */}
        <section aria-labelledby="consultations-title" className="space-y-3">
          <header className="flex items-center justify-between">
            <h2 id="consultations-title" className="text-base lg:text-lg font-semibold text-slate-900">
              Recent Consultations
            </h2>
            <button
              type="button"
              onClick={() => navigate('/doctor/all-consultations')}
              className="text-sm font-medium text-primary hover:text-primary focus-visible:outline-none focus-visible:underline"
            >
              See all
            </button>
          </header>

          <div className="space-y-3 lg:grid lg:grid-cols-4 lg:gap-4 lg:space-y-0">
            {recentConsultations.length > 0 ? (
              recentConsultations.map((consultation) => {
                const TypeIcon = getTypeIcon(consultation.type)
                return (
                  <article
                    key={consultation.id}
                    onClick={async () => {
                      try {
                        const response = await getConsultationById(consultation.id)
                        if (response) {
                          navigate('/doctor/consultations', {
                            state: {
                              selectedConsultation: response,
                              loadSavedData: true,
                            },
                          })
                        }
                      } catch (error) {
                        console.error('Error opening consultation:', error)
                        toast.error('Failed to load consultation details')
                      }
                    }}
                    className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 lg:p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 cursor-pointer active:scale-[0.98] lg:hover:scale-[1.02]"
                  >
                    {/* Hover Background Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0077C2]/0 to-[#0077C2]/0 group-hover:from-[#0077C2]/5 group-hover:to-[#0077C2]/10 transition-all duration-300"></div>

                    <div className="relative flex items-start gap-3 lg:gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={consultation.patientImage}
                          alt={consultation.patientName}
                          className="h-10 w-10 lg:h-14 lg:w-14 shrink-0 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-primary/30 transition-all duration-300 group-hover:scale-110"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(consultation.patientName)}&background=0077C2&color=fff&size=128&bold=true`
                          }}
                        />
                        {consultation.status === 'completed' && (
                          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 lg:h-5 lg:w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white group-hover:scale-110 group-hover:ring-emerald-400 transition-all duration-300">
                            <IoCheckmarkCircleOutline className="h-2.5 w-2.5 lg:h-3 lg:w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm lg:text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors duration-300">{consultation.patientName}</h3>
                            <p className="mt-0.5 text-xs lg:text-xs text-slate-600 group-hover:text-slate-700 transition-colors line-clamp-1">{consultation.notes}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] lg:text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(consultation.status)} group-hover:scale-105 transition-transform duration-300 shrink-0`}>
                            {consultation.status === 'completed' ? (
                              <IoCheckmarkCircleOutline className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                            ) : (
                              <IoTimeOutline className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                            )}
                            {consultation.status}
                          </span>
                        </div>
                        <div className="mt-2 lg:mt-2.5 flex flex-wrap items-center gap-2 lg:gap-2.5 text-[10px] lg:text-xs text-slate-600 group-hover:text-slate-700 transition-colors">
                          <div className="flex items-center gap-1 group-hover/item:scale-105 transition-transform">
                            <IoCalendarOutline className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-primary" />
                            <span className="font-medium">{formatDate(consultation.date)}</span>
                          </div>
                          <div className="flex items-center gap-1 group-hover/item:scale-105 transition-transform">
                            <IoTimeOutline className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-primary" />
                            <span>{consultation.time}</span>
                          </div>
                          <div className="flex items-center gap-1 group-hover/item:scale-105 transition-transform">
                            <TypeIcon className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-primary" />
                            <span>{consultation.type}</span>
                          </div>
                          <div className="flex items-center gap-1 font-semibold text-emerald-600 group-hover:text-emerald-700 group-hover:scale-105 transition-all">
                            <IoWalletOutline className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                            <span>{formatCurrency(consultation.fee)}</span>
                          </div>
                        </div>
                        <div className="hidden lg:flex items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-100 group-hover:border-primary/20 transition-colors">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 group-hover:text-primary transition-colors">
                            <IoMailOutline className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Report</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <IoDocumentTextOutline className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm font-medium text-slate-600">No recent consultations</p>
                <p className="mt-1 text-xs text-slate-500">Your consultation history will appear here</p>
              </div>
            )}
          </div>
        </section>
      </section>
    </>
  )
}

export default DoctorDashboard



