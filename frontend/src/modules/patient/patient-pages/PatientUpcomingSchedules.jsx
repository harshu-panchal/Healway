import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoArrowBackOutline,
  IoCallOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoLocationOutline,
  IoArrowForwardOutline,
} from 'react-icons/io5'
import { getUpcomingAppointments } from '../patient-services/patientService'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

const PatientUpcomingSchedules = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchUpcomingAppointments = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const { getAuthToken } = await import('../../../utils/apiClient')
        const token = getAuthToken('patient')
        if (!token) {
          navigate('/patient/login')
          return
        }

        const response = await getUpcomingAppointments()
        if (response.success && response.data) {
          const appointmentsData = Array.isArray(response.data)
            ? response.data
            : response.data.items || []
          setAppointments(appointmentsData)
        } else {
          setAppointments([])
        }
      } catch (err) {
        console.error('Error fetching upcoming appointments:', err)
        setError(err.message || 'Failed to load upcoming appointments')
        toast.error('Failed to load upcoming appointments')
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }

    fetchUpcomingAppointments()
  }, [navigate, toast])

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`
  }

  // Helper function to calculate countdown
  const getCountdown = (dateString) => {
    if (!dateString) return ''
    const appointmentDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    appointmentDate.setHours(0, 0, 0, 0)
    const diffTime = appointmentDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'TODAY'
    if (diffDays === 1) return 'TOMORROW'
    if (diffDays > 0) return `IN ${diffDays} DAYS`
    return 'PAST'
  }

  // Helper function to format time
  const formatTime = (timeString) => {
    if (!timeString) return ''
    // If time is in HH:MM format, return as is
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString
    }
    return timeString
  }

  // Calculate paginated appointments
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return appointments.slice(startIndex, endIndex)
  }, [appointments, currentPage])

  const totalPages = Math.ceil(appointments.length / itemsPerPage)
  const totalItems = appointments.length

  return (
    <section className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
        >
          <IoArrowBackOutline className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upcoming Schedules</h1>
          <p className="text-sm text-slate-600">{appointments.length} appointment(s) scheduled</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">Loading upcoming appointments...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && appointments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No upcoming appointments scheduled</p>
        </div>
      )}

      {/* Appointments List */}
      {!loading && appointments.length > 0 && (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const appointmentId = appointment._id || appointment.id
            const doctor = appointment.doctor || {}
            const doctorName = doctor.firstName && doctor.lastName
              ? `Dr. ${doctor.firstName} ${doctor.lastName}`
              : doctor.name || 'Doctor'
            const specialty = doctor.specialization || doctor.specialty || appointment.specialty || 'Consultation'
            const status = appointment.status?.toUpperCase() || 'CONFIRMED'
            const appointmentDate = appointment.appointmentDate || appointment.date
            const appointmentTime = appointment.time || appointment.appointmentTime
            const tokenNumber = appointment.tokenNumber || appointment.token || `TOKEN #${appointment.tokenNumber || 'N/A'}`
            const appointmentType = appointment.appointmentType === 'online' ? 'ONLINE CONSULTATION' : 'IN-PERSON VISIT'
            const clinic = appointment.clinicDetails?.name || doctor.clinicDetails?.name || 'Clinic'
            const address = appointment.clinicDetails?.address || doctor.clinicDetails?.address || {}
            const fullAddress = address.fullAddress || `${address.street || ''} ${address.city || ''} ${address.state || ''}`.trim() || 'Address not available'
            const note = appointment.note || appointment.instructions || ''
            const duration = appointment.duration || '30 min'
            
            return (
              <article
                key={appointmentId}
                className="relative overflow-hidden rounded-3xl border text-white shadow-lg"
            style={{ 
              borderColor: 'var(--color-primary-border)',
              background: 'linear-gradient(to bottom right, rgba(0, 119, 194, 0.95), rgba(0, 119, 194, 0.95), rgba(0, 119, 194, 0.9))',
              boxShadow: '0 10px 15px -3px var(--color-primary-border)'
            }}
          >
            <div className="pointer-events-none absolute -right-16 top-10 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-6 h-24 w-24 rounded-full bg-[rgba(0,119,194,0.15)] blur-3xl" />

            <div className="relative space-y-4 px-4 py-4 sm:px-5">
              <header className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm shadow-[rgba(0,119,194,0.2)]">
                    <span className="text-sm font-semibold">
                      {doctorName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(-2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight text-white">{doctorName}</h3>
                    <p className="text-xs text-white/90">{specialty}</p>
                  </div>
                </div>
                {doctor.phoneNumber && (
                  <a
                    href={`tel:${doctor.phoneNumber}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary shadow-inner shadow-[rgba(0,119,194,0.15)] transition-transform active:scale-95"
                    aria-label="Call doctor"
                  >
                    <IoCallOutline className="text-base" aria-hidden="true" />
                  </a>
                )}
              </header>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/90">
                <span className="inline-flex items-center rounded-full bg-emerald-400/90 px-2.5 py-1 text-emerald-950">
                  {status}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1">
                  <IoCalendarOutline className="text-xs" aria-hidden="true" />
                  {getCountdown(appointmentDate)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(0,119,194,0.4)] px-2.5 py-1 text-white/95">
                  {appointmentType}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-white/90">
                  {tokenNumber}
                </span>
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base text-white">
                    <IoCalendarOutline aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-white/90">Date</dt>
                    <dd className="text-sm font-semibold text-white">{formatDate(appointmentDate)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base text-white">
                    <IoTimeOutline aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-white/90">Time</dt>
                    <dd className="text-sm font-semibold text-white">{formatTime(appointmentTime)}</dd>
                    <dd className="text-xs text-white/90">Duration {duration}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-base text-white">
                    <IoLocationOutline aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-white/90">Clinic</dt>
                    <dd className="text-sm font-semibold text-white">{clinic}</dd>
                    <dd className="text-xs text-white/90">{fullAddress}</dd>
                  </div>
                </div>
              </dl>

              {note && (
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-xs leading-relaxed text-white/95">{note}</p>
                </div>
              )}

              <footer className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/patient/appointments?reschedule=${appointmentId}`)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
                >
                  <IoCalendarOutline className="text-base" aria-hidden="true" />
                  Reschedule
                </button>
                {fullAddress !== 'Address not available' && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
                  >
                    <IoLocationOutline className="text-base" aria-hidden="true" />
                    Directions
                  </a>
                )}
              </footer>
            </div>
          </article>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && appointments.length > 0 && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          loading={loading}
        />
      )}
    </section>
  )
}

export default PatientUpcomingSchedules

