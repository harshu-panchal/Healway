import { useState, useMemo, useEffect } from 'react'
import {
  IoSearchOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoMedicalOutline,
  IoPersonOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
} from 'react-icons/io5'
import { getAdminAppointments } from '../admin-services/adminService'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

// Helper function to format date as YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generate dates relative to today
const today = new Date()
const todayStr = formatDate(today)
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const yesterdayStr = formatDate(yesterday)
const twoDaysAgo = new Date(today)
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
const twoDaysAgoStr = formatDate(twoDaysAgo)
const threeDaysAgo = new Date(today)
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
const threeDaysAgoStr = formatDate(threeDaysAgo)
const fourDaysAgo = new Date(today)
fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)
const fourDaysAgoStr = formatDate(fourDaysAgo)
const fiveDaysAgo = new Date(today)
fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
const fiveDaysAgoStr = formatDate(fiveDaysAgo)
// For monthly view - dates from earlier in the month
const tenDaysAgo = new Date(today)
tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
const tenDaysAgoStr = formatDate(tenDaysAgo)
const fifteenDaysAgo = new Date(today)
fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
const fifteenDaysAgoStr = formatDate(fifteenDaysAgo)
// For yearly view - dates from previous months
const lastMonth = new Date(today)
lastMonth.setMonth(lastMonth.getMonth() - 1)
const lastMonthStr = formatDate(lastMonth)
const twoMonthsAgo = new Date(today)
twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
const twoMonthsAgoStr = formatDate(twoMonthsAgo)
const threeMonthsAgo = new Date(today)
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
const threeMonthsAgoStr = formatDate(threeMonthsAgo)

// Default appointments (will be replaced by API data)
const defaultAppointments = []

const AdminAppointments = () => {
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [periodFilter, setPeriodFilter] = useState('daily') // all, daily, monthly, yearly
  const [appointments, setAppointments] = useState(defaultAppointments)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 5


  // Load appointments from API
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true)
        setError(null)

        // Build filters (backend search)
        const filters = {}
        if (searchTerm) {
          filters.search = searchTerm
        }

        const response = await getAdminAppointments(filters)

        if (response) {
          const appointmentsData = Array.isArray(response)
            ? response
            : response.items || []

          // Transform API data to match component structure
          const transformed = appointmentsData.map(apt => {
            const aptDate = new Date(apt.appointmentDate || apt.date);
            return {
              id: apt._id || apt.id,
              _id: apt._id || apt.id,
              patientId: apt.patientId?._id || apt.patientId || apt.patientId?.id,
              doctorId: apt.doctorId?._id || apt.doctorId || apt.doctorId?.id,
              patientName: apt.patientId?.firstName && apt.patientId?.lastName
                ? `${apt.patientId.firstName} ${apt.patientId.lastName}`
                : apt.patientId?.name || apt.patientName || 'Unknown Patient',
              doctorName: apt.doctorId?.firstName && apt.doctorId?.lastName
                ? `Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}`
                : apt.doctorId?.name || apt.doctorName || 'Unknown Doctor',
              specialty: apt.doctorId?.specialization || apt.specialty || '',
              date: !isNaN(aptDate.getTime()) ? aptDate.toISOString().split('T')[0] : '',
              time: apt.appointmentTime || apt.time || apt.sessionId?.sessionStartTime || '',
              status: apt.status || 'scheduled',
              type: apt.appointmentType || apt.type || 'consultation',
              appointmentDate: apt.appointmentDate || apt.date, // Keep original format for parsing
              appointmentTime: apt.appointmentTime || apt.time || apt.sessionId?.sessionStartTime || '',
              rescheduledAt: apt.rescheduledAt,
              rescheduledBy: apt.rescheduledBy,
              rescheduleReason: apt.rescheduleReason,
              isRescheduled: !!apt.rescheduledAt,
              originalData: apt,
            };
          });

          setAppointments(transformed)
        } else {
          setAppointments([])
        }
      } catch (err) {
        console.error('❌ Error loading appointments:', err)
        setError(err.message || 'Failed to load appointments')
        toast.error('Failed to load appointments')
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()

    const handleAppointmentBooked = () => loadAppointments()
    window.addEventListener('appointmentBooked', handleAppointmentBooked)

    const interval = setInterval(loadAppointments, 30000)
    return () => {
      clearInterval(interval)
      window.removeEventListener('appointmentBooked', handleAppointmentBooked)
    }
  }, [searchTerm, toast])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, periodFilter])

  const filteredAppointments = useMemo(() => {
    let filtered = appointments

    // Filter by period
    if (periodFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      today.setHours(0, 0, 0, 0)

      filtered = filtered.filter((apt) => {
        const rawDate = apt.appointmentDate || apt.originalData?.appointmentDate || apt.date;
        if (!rawDate) return false;

        const aptDate = new Date(rawDate);
        if (isNaN(aptDate.getTime())) return false;

        // Reset time for comparison
        const aptDayStart = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());

        if (periodFilter === 'daily') {
          return aptDayStart.getTime() === today.getTime();
        } else if (periodFilter === 'monthly') {
          return aptDate.getMonth() === today.getMonth() && aptDate.getFullYear() === today.getFullYear();
        } else if (periodFilter === 'yearly') {
          return aptDate.getFullYear() === today.getFullYear();
        }
        return true;
      })
    }

    // Filter by search
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.trim().toLowerCase()
      filtered = filtered.filter(
        (apt) =>
          (apt.patientName || '').toLowerCase().includes(normalizedSearch) ||
          (apt.doctorName || '').toLowerCase().includes(normalizedSearch) ||
          (apt.specialty || '').toLowerCase().includes(normalizedSearch)
      )
    }

    // Sort by date descending
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.appointmentDate || a.date);
      const dateB = new Date(b.appointmentDate || b.date);
      return dateB - dateA;
    });
  }, [appointments, searchTerm, periodFilter])

  // Doctor aggregation with patient list
  const doctorAggregation = useMemo(() => {
    const doctorMap = new Map()

    filteredAppointments.forEach((apt) => {
      const key = `${apt.doctorName || apt.doctor?.name || 'Unknown'}_${apt.specialty || apt.doctorSpecialty || 'Unknown'}`
      const doctorName = apt.doctorName || apt.doctor?.name || 'Unknown'
      const specialty = apt.specialty || apt.doctorSpecialty || 'Unknown'

      if (!doctorMap.has(key)) {
        doctorMap.set(key, {
          doctorName: doctorName,
          specialty: specialty,
          doctorId: apt.doctorId || apt.doctor?.id,
          confirmed: 0,
          rescheduled: 0,
          completed: 0,
          cancelled: 0,
          scheduled: 0,
          totalAppointments: 0,
          patients: [], // List of patient appointments
        })
      }

      const doctor = doctorMap.get(key)
      doctor.totalAppointments++

      // Add patient appointment to list
      doctor.patients.push({
        id: apt.id,
        patientName: apt.patientName || apt.patient?.name || 'Unknown Patient',
        patientId: apt.patientId || apt.patient?.id,
        date: apt.appointmentDate || apt.date,
        time: apt.appointmentTime || apt.time || 'N/A',
        status: apt.status,
        reason: apt.reason || 'Consultation',
        type: apt.appointmentType || apt.type || 'consultation',
        patientImage: apt.patientImage || apt.patient?.image,
        patientPhone: apt.patientPhone || apt.patient?.phone,
        patientEmail: apt.patientEmail || apt.patient?.email,
      })

      // Check status first - cancelled appointments should only be in cancelled count
      if (apt.status === 'cancelled') {
        doctor.cancelled++
        // Don't count cancelled appointments in scheduled/rescheduled
        // Continue to next appointment
        return
      }

      // Check if rescheduled first (has rescheduledAt field) - but only if NOT cancelled
      if (apt.rescheduledAt || apt.originalData?.rescheduledAt) {
        doctor.rescheduled++
      } else if (apt.status === 'confirmed') {
        doctor.confirmed++
      } else if (apt.status === 'completed') {
        doctor.completed++
      } else if (apt.status === 'scheduled' || apt.status === 'waiting') {
        doctor.scheduled++
      }
    })

    // Filter by search if provided
    let doctors = Array.from(doctorMap.values())
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.trim().toLowerCase()
      doctors = doctors.filter((doctor) =>
        doctor.doctorName.toLowerCase().includes(normalizedSearch) ||
        doctor.specialty.toLowerCase().includes(normalizedSearch)
      )
    }

    // Sort by total appointments descending
    return doctors.sort((a, b) => b.totalAppointments - a.totalAppointments)
  }, [filteredAppointments, searchTerm])

  // Paginated doctor aggregation
  const paginatedDoctorAggregation = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return doctorAggregation.slice(startIndex, endIndex)
  }, [doctorAggregation, currentPage, itemsPerPage])

  // Update pagination state
  useEffect(() => {
    const totalDoctors = doctorAggregation.length
    setTotalPages(Math.ceil(totalDoctors / itemsPerPage) || 1)
    setTotalItems(totalDoctors)
  }, [doctorAggregation, itemsPerPage])

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'rescheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return IoCheckmarkCircleOutline
      case 'rescheduled':
        return IoCalendarOutline
      case 'cancelled':
        return IoCloseCircleOutline
      default:
        return IoTimeOutline
    }
  }

  const stats = useMemo(() => {
    const total = filteredAppointments.length

    // Calculate stats consistently - same logic as doctor aggregation
    let scheduled = 0
    let confirmed = 0
    let rescheduled = 0
    let completed = 0
    let cancelled = 0

    filteredAppointments.forEach((apt) => {
      // Check if cancelled first
      if (apt.status === 'cancelled') {
        cancelled++
        return // Don't count in other categories
      }

      // Check if rescheduled (has rescheduledAt field) - but only if NOT cancelled
      const isRescheduled = apt.rescheduledAt || apt.originalData?.rescheduledAt
      if (isRescheduled) {
        rescheduled++
        return // Don't count in scheduled/confirmed
      }

      // Count by status (only if not rescheduled and not cancelled)
      if (apt.status === 'completed') {
        completed++
      } else if (apt.status === 'confirmed') {
        confirmed++
      } else if (apt.status === 'scheduled' || apt.status === 'waiting') {
        scheduled++
      }
    })

    // Doctor stats from aggregation (should match overall stats)
    const doctorStats = {
      totalDoctors: doctorAggregation.length,
      totalScheduled: doctorAggregation.reduce((sum, d) => sum + d.scheduled, 0),
      totalConfirmed: doctorAggregation.reduce((sum, d) => sum + d.confirmed, 0),
      totalCompleted: doctorAggregation.reduce((sum, d) => sum + d.completed, 0),
      totalRescheduled: doctorAggregation.reduce((sum, d) => sum + d.rescheduled, 0),
      totalCancelled: doctorAggregation.reduce((sum, d) => sum + d.cancelled, 0),
    }

    // Debug: Log if there's a mismatch
    if (Math.abs(scheduled - doctorStats.totalScheduled) > 0 ||
      Math.abs(rescheduled - doctorStats.totalRescheduled) > 0 ||
      Math.abs(cancelled - doctorStats.totalCancelled) > 0) {
      console.warn('⚠️ Stats mismatch:', {
        overall: { scheduled, confirmed, rescheduled, completed, cancelled },
        doctorStats,
      })
    }

    return { total, scheduled, confirmed, completed, rescheduled, cancelled, doctorStats }
  }, [filteredAppointments, doctorAggregation])

  return (
    <section className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="mt-0.5 text-sm text-slate-600">Manage all appointments</p>
        </div>
      </header>

      {/* Period Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'daily', 'monthly', 'yearly'].map((period) => (
          <button
            key={period}
            onClick={() => setPeriodFilter(period)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${periodFilter === period
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {period === 'all' ? 'All Time' : period}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.doctorStats.totalDoctors}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Scheduled</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{stats.doctorStats.totalScheduled}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Completed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.doctorStats.totalCompleted}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Rescheduled</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{stats.doctorStats.totalRescheduled}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Cancelled</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{stats.doctorStats.totalCancelled}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <IoSearchOutline className="h-5 w-5 text-slate-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          placeholder="Search by doctor name or specialty..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Doctor List */}
      <div className="space-y-3">
        {paginatedDoctorAggregation.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <IoCalendarOutline className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600">No doctors found</p>
            <p className="mt-1 text-xs text-slate-500">
              {searchTerm.trim()
                ? 'No doctors match your search criteria.'
                : `No appointments for ${periodFilter} period.`}
            </p>
          </div>
        ) : (
          paginatedDoctorAggregation.map((doctor) => {
            return (
              <article
                key={`${doctor.doctorName}_${doctor.specialty}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <IoMedicalOutline className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900">{doctor.doctorName}</h3>
                        <p className="mt-0.5 text-sm text-slate-600">{doctor.specialty}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                        <IoPersonOutline className="h-4 w-4" />
                        {doctor.patients.length} Patients
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
                        <p className="mt-1 text-xl font-bold text-slate-900">{doctor.totalAppointments}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Scheduled</p>
                        <p className="mt-1 text-xl font-bold text-blue-700">{doctor.scheduled}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Completed</p>
                        <p className="mt-1 text-xl font-bold text-emerald-700">{doctor.completed}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Rescheduled</p>
                        <p className="mt-1 text-xl font-bold text-blue-700">{doctor.rescheduled}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Cancelled</p>
                        <p className="mt-1 text-xl font-bold text-red-700">{doctor.cancelled}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && paginatedDoctorAggregation.length > 0 && (
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
    </section>
  )
}

export default AdminAppointments

