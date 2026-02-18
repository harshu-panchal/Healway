import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoSearchOutline,
  IoLocationOutline,
  IoTimeOutline,
  IoCalendarOutline,
  IoDocumentTextOutline,
  IoMedicalOutline,
  IoNotificationsOutline,
  IoMenuOutline,
  IoHomeOutline,
  IoBagHandleOutline,
  IoPeopleOutline,
  IoPersonCircleOutline,
  IoChatbubbleOutline,
  IoCheckmarkCircleOutline,
  IoWalletOutline,
  IoHelpCircleOutline,
  IoArrowForwardOutline,
  IoReceiptOutline,
  IoArchiveOutline,
  IoStar,
  IoMegaphoneOutline,
  IoVideocamOutline,
  IoCallOutline,
  IoChevronDownOutline,
  IoCloseOutline,
} from 'react-icons/io5'
import PatientNavbar from '../patient-components/PatientNavbar'
import PatientSidebar from '../patient-components/PatientSidebar'
import { useToast } from '../../../contexts/ToastContext'
import { useNotification } from '../../../contexts/NotificationContext'
import { getPatientDashboard, getPatientProfile, getFeaturedDoctors, getAnnouncements, getSpecialties } from '../patient-services/patientService'
import NotificationBell from '../../../components/NotificationBell'
import { getFileUrl } from '../../../utils/apiClient'
import { getSocket } from '../../../utils/socketClient'

// Category cards configuration (values will be populated from API)
const categoryCardsConfig = [
  {
    id: 'appointments',
    title: 'APPOINTMENTS',
    description: 'Upcoming',
    iconBgColor: '#1976D2',
    icon: IoCalendarOutline,
    route: '/patient/appointments',
    dataKey: 'upcomingAppointments', // Backend returns upcomingAppointments array
  },
  {
    id: 'prescriptions',
    title: 'PRESCRIPTIONS',
    description: 'Active',
    iconBgColor: '#14B8A6',
    icon: IoDocumentTextOutline,
    route: '/patient/prescriptions',
    dataKey: 'activePrescriptions', // In stats.activePrescriptions
  },
  {
    id: 'announcements',
    title: 'ANNOUNCEMENTS',
    description: 'Recent',
    iconBgColor: '#F59E0B',
    icon: IoMegaphoneOutline,
    route: '/patient/announcements',
    dataKey: 'announcements', // In stats.announcements
  },
  {
    id: 'notifications',
    title: 'NOTIFICATIONS',
    description: 'Unread',
    iconBgColor: '#E91E63',
    icon: IoNotificationsOutline,
    route: '/patient/notifications',
    dataKey: 'unreadCount',
  },
]


const navItems = [
  { id: 'home', label: 'Home', to: '/patient/dashboard', Icon: IoHomeOutline },
  { id: 'doctors', label: 'Doctors', to: '/patient/doctors', Icon: IoPeopleOutline },
  { id: 'announcements', label: 'Announcements', to: '/patient/announcements', Icon: IoMegaphoneOutline },
  { id: 'transactions', label: 'Transactions', to: '/patient/transactions', Icon: IoReceiptOutline },
  { id: 'support', label: 'Support', to: '/patient/support', Icon: IoHelpCircleOutline },
  { id: 'profile', label: 'Profile', to: '/patient/profile', Icon: IoPersonCircleOutline },
]

// Helper function to check if doctor is active based on their own properties
const isDoctorActive = (doctor) => {
  if (!doctor) return false;
  // If doctor object has isActive property, use it. Default to true for approved doctors.
  return doctor.isActive !== false;
};

const PatientDashboard = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const { unreadCount } = useNotification()
  const [searchTerm, setSearchTerm] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const toggleButtonRef = useRef(null)
  const [selectedSpecialty, setSelectedSpecialty] = useState(null) // For filtering doctors by specialization
  const [selectedCity, setSelectedCity] = useState(null) // For filtering doctors by city

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(false) // Start with false to show content immediately
  const [error, setError] = useState(null)
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [featuredDoctors, setFeaturedDoctors] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('doctors')
  const [specialties, setSpecialties] = useState([])

  // Fetch profile and dashboard data in parallel for faster loading
  const fetchDashboardData = useCallback(async (showLoading = true) => {
    // Check if user is authenticated before making API call
    try {
      const { getAuthToken } = await import('../../../utils/apiClient')
      const token = getAuthToken('patient')

      if (!token) {
        // No token, redirect to login
        navigate('/patient/login')
        return
      }

      if (showLoading) setLoading(true)
      setError(null)

      // Fetch profile, dashboard, featured doctors, announcements, and specialties in parallel
      const [profileResponse, dashboardResponse, featuredResponse, announcementsResponse, specialtiesResponse] = await Promise.allSettled([
        getPatientProfile().catch(() => null),
        getPatientDashboard(),
        getFeaturedDoctors().catch(() => []),
        getAnnouncements().catch(() => []),
        getSpecialties().catch(() => [])
      ])

      // Handle profile response (non-critical, don't block UI)
      if (profileResponse.status === 'fulfilled' && profileResponse.value) {
        const patient = profileResponse.value.patient || profileResponse.value
        setProfile({
          address: patient.address || {},
        })
      }

      // Handle featured doctors response
      if (featuredResponse.status === 'fulfilled' && featuredResponse.value) {
        setFeaturedDoctors(featuredResponse.value || [])
      }

      // Handle announcements response
      if (announcementsResponse.status === 'fulfilled' && announcementsResponse.value) {
        setAnnouncements(announcementsResponse.value.slice(0, 3) || [])
      }

      // Handle specialties response
      if (specialtiesResponse.status === 'fulfilled' && specialtiesResponse.value) {
        setSpecialties(specialtiesResponse.value || [])
      }

      // Handle dashboard response
      const data = dashboardResponse.status === 'fulfilled' ? dashboardResponse.value : null

      if (!data) {
        throw new Error(dashboardResponse.reason?.message || 'Failed to load dashboard')
      }

      setDashboardData(data)

      // Set upcoming appointments
      if (data.upcomingAppointments) {
        setUpcomingAppointments(data.upcomingAppointments)
      }

      // Set doctors (if available in dashboard response)
      if (data.recommendedDoctors) {
        setDoctors(data.recommendedDoctors)
      }
    } catch (err) {
      // Handle 401 Unauthorized - user logged out
      if (err.message && (err.message.includes('Authentication token missing') || err.message.includes('Unauthorized') || err.message.includes('401') || err.message.includes('Session expired'))) {
        // Don't show error toast for auth errors - user is being redirected
        try {
          const { clearTokens } = await import('../../../utils/apiClient')
          clearTokens('patient')
        } catch (e) {
          console.error('Error clearing tokens:', e)
        }
        // Don't navigate if already on login page or if redirect is happening
        if (!window.location.pathname.includes('/login')) {
          navigate('/patient/login')
        }
        return
      }

      console.error('Error fetching dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [toast, navigate])

  // Initial fetch
  useEffect(() => {
    fetchDashboardData(true)
  }, [fetchDashboardData])

  // Set up real-time updates via Socket.IO
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // Re-fetch dashboard data when relevant events occur
    const handleUpdate = () => {
      console.log('🔄 Dashboard refreshing due to real-time update...')
      fetchDashboardData(false) // Refresh without showing full loading state
    }

    // Attach listeners
    socket.on('appointment:created', handleUpdate)
    socket.on('appointment:updated', handleUpdate)
    socket.on('appointment:cancelled', handleUpdate)
    socket.on('consultation:completed', handleUpdate)
    socket.on('prescription:created', handleUpdate)
    socket.on('request:responded', handleUpdate)
    socket.on('queue:updated', handleUpdate)

    return () => {
      // Clean up listeners
      socket.off('appointment:created', handleUpdate)
      socket.off('appointment:updated', handleUpdate)
      socket.off('appointment:cancelled', handleUpdate)
      socket.off('consultation:completed', handleUpdate)
      socket.off('prescription:created', handleUpdate)
      socket.off('request:responded', handleUpdate)
      socket.off('queue:updated', handleUpdate)
    }
  }, [fetchDashboardData])

  // Get category cards with real data
  const categoryCards = useMemo(() => {
    if (!dashboardData) return categoryCardsConfig.map(card => ({ ...card, value: '0' }))

    return categoryCardsConfig.map(card => {
      let value = dashboardData[card.dataKey]

      // If not found at top level, check in stats object
      if (value === undefined && dashboardData.stats) {
        value = dashboardData.stats[card.dataKey]
      }

      // Special handling for announcements if it's not in dashboardData
      if (card.id === 'announcements' && (value === undefined || value === null)) {
        value = announcements.length
      }

      // Special handling for notifications
      if (card.id === 'notifications') {
        value = unreadCount
      }

      // Handle arrays - get length instead of array itself
      if (Array.isArray(value)) {
        value = value.length
      }

      // Handle objects - try to get count property or default to 0
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        value = value.count || value.length || 0
      }

      return {
        ...card,
        value: String(value || 0),
      }
    })
  }, [dashboardData, announcements, unreadCount])

  // Extract unique cities from doctors for the city filter
  const availableCities = useMemo(() => {
    const citySet = new Set()
    doctors.forEach((doctor) => {
      const city = doctor.clinicDetails?.address?.city || doctor.city || ''
      if (city.trim()) {
        citySet.add(city.trim())
      }
    })
    return Array.from(citySet).sort()
  }, [doctors])

  const filteredDoctors = useMemo(() => {
    if (!doctors || !Array.isArray(doctors)) return []

    return doctors.filter((doctor) => {
      // 1. Filter by active status
      if (!isDoctorActive(doctor)) return false

      // 2. Filter by selected specialization
      if (selectedSpecialty) {
        const specialty = doctor.specialty || doctor.specialization || ''
        if (specialty.toLowerCase() !== selectedSpecialty.toLowerCase()) return false
      }

      // 3. Filter by selected city
      if (selectedCity) {
        const city = doctor.clinicDetails?.address?.city || doctor.city || ''
        if (city.trim().toLowerCase() !== selectedCity.toLowerCase()) return false
      }

      // 4. Filter by search term
      if (searchTerm.trim()) {
        const normalizedSearch = searchTerm.trim().toLowerCase()
        const name = doctor.name || `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
        const specialty = doctor.specialty || doctor.specialization || ''
        if (!name.toLowerCase().includes(normalizedSearch) && !specialty.toLowerCase().includes(normalizedSearch)) {
          return false
        }
      }

      return true
    })
  }, [searchTerm, doctors, selectedSpecialty, selectedCity])

  const handleBookDoctor = (doctorId, fee) => {
    if (!doctorId) {
      toast.error('Doctor information is not available. Please try again.')
      return
    }
    navigate(`/patient/doctors/${doctorId}?book=true`)
  }

  const handleSidebarToggle = () => {
    if (isSidebarOpen) {
      handleSidebarClose()
    } else {
      setIsSidebarOpen(true)
    }
  }

  const handleSidebarClose = () => {
    toggleButtonRef.current?.focus({ preventScroll: true })
    setIsSidebarOpen(false)
  }

  const handleLogout = async () => {
    handleSidebarClose()
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
    setTimeout(() => {
      navigate('/patient/login', { replace: true })
    }, 500)
  }

  return (
    <section className="flex flex-col gap-4 pb-4 -mt-20">
      {/* Top Header with Gradient Background */}
      <header
        className="relative text-white -mx-4 mb-4 overflow-hidden"
        style={{
          background: 'linear-gradient(to right, var(--color-primary) 0%, var(--color-primary-light) 50%, var(--color-primary-lighter) 100%)'
        }}
      >
        <div className="px-4 pt-5 pb-4">
          {/* Top Row: Brand and Icons */}
          <div className="flex items-start justify-between mb-3.5">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-white leading-tight mb-0.5">Healway</h1>
              <p className="text-sm font-normal text-white/95 leading-tight">Digital Healthcare</p>
            </div>
            <div className="flex items-center gap-4 pt-0.5">
              <NotificationBell className="text-white" />
              <button
                type="button"
                ref={toggleButtonRef}
                onClick={handleSidebarToggle}
                className="flex items-center justify-center p-1 rounded-lg transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Toggle navigation menu"
              >
                <IoMenuOutline className="h-6 w-6 text-white" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          {/* Location Row */}
          <div className="flex items-center gap-1.5">
            <IoLocationOutline className="h-4 w-4 text-white" strokeWidth={2} />
            <span className="text-xs font-normal text-white">
              {profile?.address?.city && profile?.address?.state
                ? `${profile.address.city}, ${profile.address.state}`
                : profile?.address?.city || profile?.address?.state || profile?.address?.line1 || 'Location not set'}
            </span>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctors or specialties"
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value
              setSearchTerm(value)
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-primary)'
              e.target.style.boxShadow = '0 0 0 2px var(--color-primary-surface)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = ''
              e.target.style.boxShadow = ''
            }}
          />
        </div>
      </div>

      {/* Category Cards - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {categoryCards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.id}
              onClick={() => navigate(card.route)}
              className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-left transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <h3 className="text-[8px] font-bold uppercase tracking-wider text-slate-700 leading-tight flex-1 min-w-0 pr-1">
                  {card.title}
                </h3>
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: card.iconBgColor }}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <p className="text-lg font-bold text-slate-900 mb-0.5 leading-none">{card.value}</p>
              <p className="text-[8px] text-slate-500 leading-tight">{card.description}</p>
            </button>
          )
        })}
      </div>

      {/* Announcements Section */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Announcements</h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                {announcements.length}
              </span>
            </div>
            <button
              onClick={() => navigate('/patient/announcements')}
              className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement._id}
                onClick={() => navigate('/patient/announcements')}
                className="flex items-start gap-3 p-3 rounded-lg border border-amber-50 bg-amber-50/30 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <IoMegaphoneOutline className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {announcement.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                    {announcement.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Schedule Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Upcoming Schedule</h2>
          <button
            onClick={() => navigate('/patient/appointments')}
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            <span>See All</span>
            <IoArrowForwardOutline className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div key="loading-appointments" className="flex items-center justify-center py-8">
              <div className="text-sm text-slate-500">Loading appointments...</div>
            </div>
          ) : error ? (
            <div key="error-appointments" className="flex items-center justify-center py-8">
              <div className="text-sm text-red-500">Failed to load appointments</div>
            </div>
          ) : upcomingAppointments.length === 0 ? (
            <div key="no-upcoming-appointments" className="flex items-center justify-center py-8">
              <div className="text-sm text-slate-500">No upcoming appointments</div>
            </div>
          ) : (
            upcomingAppointments.slice(0, 2).map((appointment) => {
              const doctorName = appointment.doctorId?.firstName && appointment.doctorId?.lastName
                ? `Dr. ${appointment.doctorId.firstName} ${appointment.doctorId.lastName}`
                : appointment.doctorName || 'Dr. Unknown'
              const specialty = appointment.doctorId?.specialization || appointment.specialty || appointment.doctorSpecialty || ''
              const appointmentDate = new Date(appointment.appointmentDate || appointment.date)

              // Convert time to 12-hour format if needed
              const convertTimeTo12Hour = (timeStr) => {
                if (!timeStr) return '';
                if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
                const [hours, minutes] = timeStr.split(':').map(Number);
                if (isNaN(hours) || isNaN(minutes)) return timeStr;
                const period = hours >= 12 ? 'PM' : 'AM';
                const hours12 = hours % 12 || 12;
                return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
              };

              const time = convertTimeTo12Hour(appointment.time || appointment.appointmentTime) || appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

              // Format location
              const location = appointment.location || appointment.clinic || null

              return (
                <div
                  key={appointment._id || appointment.id}
                  onClick={() => {
                    navigate(`/patient/appointments?appointment=${appointment._id || appointment.id}`)
                  }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-primary hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                >
                  <img
                    src={appointment.doctorId?.profileImage ? getFileUrl(appointment.doctorId.profileImage) : (appointment.doctorImage ? getFileUrl(appointment.doctorImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0077C2&color=fff&size=128&bold=true`)}
                    alt={doctorName}
                    className="h-12 w-12 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0077C2&color=fff&size=128&bold=true`
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5 leading-tight">
                      <span>{doctorName}</span>
                    </h3>
                    <p className="text-xs text-slate-600 mb-1.5">
                      <span>{specialty}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-1">
                      <div className="flex items-center gap-1">
                        <IoCalendarOutline className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{appointmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <IoTimeOutline className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{time}</span>
                      </div>
                    </div>
                    {(appointment.clinic || location) && (
                      <p className="text-xs text-slate-500">{location || appointment.clinic}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Featured Doctors Section */}
      {featuredDoctors.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <IoStar className="text-amber-500 h-5 w-5" />
              Featured Doctors
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
            {featuredDoctors.map((doctor) => {
              const doctorId = doctor._id || doctor.id;
              const doctorName = doctor.name || `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();
              const specialty = doctor.specialty || doctor.specialization || '';
              const clinicName = doctor.clinicName || doctor.clinicDetails?.name || '';

              let displayAddress = '';
              if (doctor.clinicAddress && typeof doctor.clinicAddress === 'string') {
                displayAddress = doctor.clinicAddress;
              } else if (doctor.clinicDetails?.address) {
                const addr = doctor.clinicDetails.address;
                const parts = [];
                if (addr.line1) parts.push(addr.line1);
                if (addr.city) parts.push(addr.city);
                displayAddress = parts.join(', ');
              }

              const handleCardClick = (e) => {
                if (e.target.closest('button')) return;
                if (doctorId) {
                  navigate(`/patient/doctors/${doctorId}`);
                }
              };

              const inPersonOriginal = doctor.fees?.inPerson?.original ?? doctor.original_fees ?? 0;
              const inPersonDiscount = doctor.fees?.inPerson?.discount ?? doctor.discount_amount ?? 0;
              const inPersonFee = doctor.fees?.inPerson?.final ?? doctor.consultationFee ?? doctor.fee ?? Math.max(0, inPersonOriginal - inPersonDiscount);

              return (
                <div
                  key={`featured-${doctorId || Math.random()}`}
                  onClick={handleCardClick}
                  className="group flex-shrink-0 w-72 bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] cursor-pointer transition-all duration-300 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)] hover:border-primary/20 hover:-translate-y-1 active:scale-[0.98] flex flex-col"
                >
                  <div className="p-5 flex flex-col h-full bg-gradient-to-b from-white to-slate-50/30">
                    <div className="flex gap-4 mb-4">
                      <div className="relative shrink-0">
                        <img
                          src={(doctor.image || doctor.profileImage) ? getFileUrl(doctor.image || doctor.profileImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0077C2&color=fff&size=200&bold=true`}
                          alt={doctorName}
                          className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white shadow-sm transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0077C2&color=fff&size=200&bold=true`
                          }}
                        />
                        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg p-1 shadow-md">
                          <IoStar className="h-2.5 w-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-black text-slate-900 mb-0.5 leading-tight truncate">
                          {doctorName}
                        </h3>
                        <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1.5">{specialty}</p>
                        {(doctor.experienceYears || doctor.experience) && (
                          <span className="shrink-0 bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-blue-100/50 uppercase">
                            {doctor.experienceYears || doctor.experience} EXP
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-4 flex-1">
                      {clinicName && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-emerald-400" />
                          <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest truncate">{clinicName}</p>
                        </div>
                      )}
                      {displayAddress && (
                        <div className="flex items-start gap-1.5 text-slate-400">
                          <IoLocationOutline className="h-3 w-3 mt-0.5 shrink-0" />
                          <p className="text-[10px] font-medium leading-relaxed line-clamp-1">{displayAddress}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-slate-900 tracking-tighter">₹{inPersonFee}</span>
                          {inPersonDiscount > 0 && inPersonOriginal > inPersonFee && (
                            <span className="text-xs line-through text-slate-300 font-bold italic">₹{inPersonOriginal}</span>
                          )}
                        </div>
                        {inPersonDiscount > 0 && (
                          <p className="text-[9px] font-black text-emerald-600 uppercase mt-0.5 tracking-tight">
                            SAVE ₹{inPersonDiscount}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBookDoctor(doctorId, inPersonFee)
                        }}
                        className="bg-primary text-white font-black px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all duration-300 shadow-lg shadow-primary/20 hover:bg-primary-dark active:scale-95 flex items-center gap-2"
                      >
                        <span>Book Appointment</span>
                        <IoArrowForwardOutline className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Specializations Section */}
      {specialties.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <IoMedicalOutline className="text-primary h-5 w-5" strokeWidth={2} />
              Specializations
            </h2>
            <button
              onClick={() => navigate('/patient/doctors')}
              className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
            >
              See All
            </button>
          </div>
          <div className="flex gap-5 overflow-x-auto mx-1 px-1 scrollbar-hide focus:outline-none">
            {specialties.map((specialty) => (
              <div
                key={specialty._id}
                onClick={() =>
                  navigate(`/patient/doctors?specialty=${encodeURIComponent(specialty.name)}`)
                }
                className="flex-shrink-0 w-36 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/20 active:scale-[0.95] flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 rounded-xl bg-primary/5 flex items-center justify-center mb-3 transition-colors group-hover:bg-primary/10">
                  {specialty.icon ? (
                    <img
                      src={getFileUrl(specialty.icon)}
                      alt={specialty.name}
                      className="w-14 h-14 object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = "none";
                        e.target.parentElement.innerHTML =
                          '<div class="text-primary"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="2em" width="2em" xmlns="http://www.w3.org/2000/svg"><path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z"></path><path d="M256 160v192m-96-96h192" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"></path></svg></div>';
                      }}
                    />
                  ) : (
                    <IoMedicalOutline className="w-8 h-8 text-primary" strokeWidth={1.5} />
                  )}
                </div>

                <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                  {specialty.name}
                </h3>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Doctors Section */}
      <div id="doctors-section">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">Doctors</h2>

            <div className="flex items-center gap-1.5">
              {/* City Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedCity || ''}
                  onChange={(e) => setSelectedCity(e.target.value || null)}
                  className="appearance-none bg-emerald-50 border border-emerald-200 rounded pl-1.5 pr-5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-500 transition-all cursor-pointer"
                  style={{ minWidth: '70px' }}
                >
                  <option value="">All Cities</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <IoChevronDownOutline className="absolute right-1 top-1/2 -translate-y-1/2 h-2 w-2 text-emerald-600 pointer-events-none" />
              </div>

              {/* Specialization Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedSpecialty || ''}
                  onChange={(e) => setSelectedSpecialty(e.target.value || null)}
                  className="appearance-none bg-primary/5 border border-primary/20 rounded pl-1.5 pr-5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10 hover:border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
                  style={{ minWidth: '80px' }}
                >
                  <option value="">All Specialties</option>
                  {specialties.map((specialty) => (
                    <option key={specialty._id} value={specialty.name}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
                <IoChevronDownOutline className="absolute right-1 top-1/2 -translate-y-1/2 h-2 w-2 text-primary pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="h-0.5 bg-gradient-to-r from-primary via-primary/50 to-transparent rounded-full"></div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {filteredDoctors.length === 0 ? (
            <div key="no-doctors-found" className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
                <IoPeopleOutline className="h-8 w-8" />
              </div>
              <p className="text-lg font-semibold text-slate-700">No doctors found</p>
              <p className="text-sm text-slate-500 mt-1">
                <span>
                  {searchTerm.trim()
                    ? `No doctors match "${searchTerm}". Try a different search term.`
                    : selectedSpecialty && selectedCity
                      ? `No doctors found for "${selectedSpecialty}" in "${selectedCity}".`
                      : selectedSpecialty
                        ? `No doctors found for "${selectedSpecialty}".`
                        : selectedCity
                          ? `No doctors found in "${selectedCity}".`
                          : 'No doctors available at the moment.'}
                </span>
              </p>
            </div>
          ) : (
            filteredDoctors.map((doctor) => {
              const doctorId = doctor._id || doctor.id;
              const doctorName = doctor.name || `Dr. ${doctor.firstName || ''} ${doctor.lastName || ''}`.trim();
              const specialty = doctor.specialty || doctor.specialization || '';
              const clinicName = doctor.clinicName || doctor.clinicDetails?.name || '';

              // Define safe click handler for card
              const handleDoctorClick = (e) => {
                // Don't navigate if clicking on button or interactive elements
                if (e.target.closest('button') || e.target.closest('a') || e.target.closest('[role="button"]')) {
                  return;
                }

                if (doctorId && String(doctorId).trim()) {
                  const id = String(doctorId).trim();
                  console.log('Navigating to doctor details:', id);
                  navigate(`/patient/doctors/${id}`, { replace: false });
                } else {
                  console.error('Doctor ID is missing or invalid:', { doctor, doctorId });
                  toast.error('Doctor details not available');
                }
              };

              // Format address
              let displayAddress = '';
              if (doctor.clinicAddress && typeof doctor.clinicAddress === 'string') {
                displayAddress = doctor.clinicAddress;
              } else if (doctor.clinicDetails?.address) {
                const addr = doctor.clinicDetails.address;
                const parts = [];
                if (addr.line1) parts.push(addr.line1);
                if (addr.city) parts.push(addr.city);
                if (addr.state) parts.push(addr.state);
                displayAddress = parts.join(', ');
              }

              return (
                <div
                  key={doctorId || parseInt(Math.random() * 10000)}
                  onClick={handleDoctorClick}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
                >
                  <div className="p-4">
                    {/* Doctor Info Row */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={(doctor.image || doctor.profileImage) ? getFileUrl(doctor.image || doctor.profileImage, { width: 128, height: 128 }) : `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0077C2&color=fff&size=128&bold=true`}
                          alt={doctorName}
                          className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0077C2&color=fff&size=128&bold=true`
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <h3 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                            <span>{doctorName}</span>
                            {doctor.isFeatured && (
                              <IoStar className="h-3.5 w-3.5 text-amber-500" />
                            )}
                          </h3>
                          {(doctor.experienceYears || doctor.experience) && (
                            <span className="shrink-0 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 ml-2">
                              {doctor.experienceYears || doctor.experience} Exp.
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mb-0.5">{specialty}</p>
                        {clinicName && (
                          <p className="text-xs font-semibold text-slate-700 mb-0.5">{clinicName}</p>
                        )}
                        {displayAddress && (
                          <p className="text-xs text-slate-500 mb-1.5 line-clamp-2">{displayAddress}</p>
                        )}

                        {/* Consultation Modes */}
                        {doctor.consultationModes && doctor.consultationModes.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            {Array.from(new Set(doctor.consultationModes)).map((mode, index) => {
                              let Icon, label, colorClass, bgClass;
                              switch (mode) {
                                case 'in_person': Icon = IoPeopleOutline; label = 'In-Person'; colorClass = 'text-purple-600'; bgClass = 'bg-purple-50 border-purple-200'; break;
                                case 'video_call': Icon = IoVideocamOutline; label = 'Video'; colorClass = 'text-blue-600'; bgClass = 'bg-blue-50 border-blue-200'; break;
                                case 'voice_call': case 'call': Icon = IoCallOutline; label = 'Call'; colorClass = 'text-green-600'; bgClass = 'bg-green-50 border-green-200'; break;
                                case 'chat': Icon = IoChatbubbleOutline; label = 'Chat'; colorClass = 'text-orange-600'; bgClass = 'bg-orange-50 border-orange-200'; break;
                                default: return null;
                              }
                              if (!Icon) return null;
                              return (
                                <div key={`${mode}-${index}`} className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium ${bgClass} ${colorClass}`}>
                                  <Icon className="h-3 w-3" />
                                  <span>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="flex flex-col items-end">
                          {(() => {
                            const inPersonFee = doctor.fees?.inPerson?.final !== undefined ? doctor.fees.inPerson.final : (doctor.consultationFee || doctor.fee || 0);
                            const inPersonOriginal = doctor.fees?.inPerson?.original || doctor.original_fees || 0;
                            const inPersonDiscount = doctor.fees?.inPerson?.discount || doctor.discount_amount || 0;

                            return (
                              <>
                                <div className="flex items-center gap-1.5">
                                  {(inPersonDiscount > 0 || inPersonOriginal > inPersonFee) && (
                                    <span className="text-[10px] line-through text-slate-400">₹{inPersonOriginal}</span>
                                  )}
                                  <span className="text-sm font-black text-slate-900">₹{inPersonFee}</span>
                                </div>
                                {(inPersonDiscount > 0) && (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded mt-0.5">
                                    ₹{inPersonDiscount} OFF
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Book Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const fee = doctor.fees?.inPerson?.final !== undefined ? doctor.fees.inPerson.final : (doctor.consultationFee || doctor.fee || 0);
                        handleBookDoctor(doctorId, fee)
                      }}
                      className="w-full text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors shadow-sm bg-primary hover:bg-primary-dark active:bg-[#004c86]"
                    >
                      {(() => {
                        const inPersonFee = doctor.fees?.inPerson?.final !== undefined ? doctor.fees.inPerson.final : (doctor.consultationFee || doctor.fee || 0);
                        const inPersonOriginal = doctor.fees?.inPerson?.original || doctor.original_fees || 0;
                        return (
                          <>
                            Book Appointment
                          </>
                        );
                      })()}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sidebar */}
      <PatientSidebar
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        navItems={navItems}
        onLogout={handleLogout}
      />
    </section>
  )
}

export default PatientDashboard
