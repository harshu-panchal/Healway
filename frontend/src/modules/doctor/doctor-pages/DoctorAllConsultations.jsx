import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorNavbar from '../doctor-components/DoctorNavbar'
import {
  IoDocumentTextOutline,
  IoSearchOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoPersonOutline,
  IoCalendarOutline,
  IoMedicalOutline,
} from 'react-icons/io5'
import { getAllDoctorConsultations } from '../doctor-services/doctorService'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getTypeIcon = (type) => {
  // Only in-person consultations are supported
  return IoPersonOutline
}

const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'in-progress':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'completed':
      return 'Completed'
    case 'in-progress':
      return 'In Progress'
    case 'pending':
      return 'Pending'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}

const DoctorAllConsultations = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [consultations, setConsultations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('today') // 'today', 'monthly', 'yearly', 'all'
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'completed', 'in-progress', 'pending'
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [pagination, setPagination] = useState(null)
  const [selectedDate, setSelectedDate] = useState('') // YYYY-MM-DD date filter

  // Reset page when filters or search change
  useEffect(() => {
    setPage(1)
  }, [filterPeriod, filterStatus, searchTerm, selectedDate])

  // Fetch consultations from API
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        setLoading(true)
        const params = {
          page,
          limit,
          ...(filterStatus !== 'all' && { status: filterStatus }),
        }
        const response = await getAllDoctorConsultations(params)

        if (response) {
          const consultationsData = Array.isArray(response)
            ? response
            : response.consultations || response.items || []

          // Set pagination data
          if (response.pagination) {
            setPagination(response.pagination)
          }

          const transformed = consultationsData.map(consultation => {
            const rawTime = consultation.appointmentTime || consultation.createdAt || consultation.date || new Date().toISOString()
            const jsDate = new Date(rawTime)

            // Local date string (YYYY-MM-DD) for reliable date filtering/display
            let localDate = null
            if (!Number.isNaN(jsDate.getTime())) {
              const y = jsDate.getFullYear()
              const m = String(jsDate.getMonth() + 1).padStart(2, '0')
              const d = String(jsDate.getDate()).padStart(2, '0')
              localDate = `${y}-${m}-${d}`
            }

            return {
              id: consultation._id || consultation.id,
              patientId: consultation.patientId?._id || consultation.patientId?.id || consultation.patientId || '',
              patientName: consultation.patientId?.firstName && consultation.patientId?.lastName
                ? `${consultation.patientId.firstName} ${consultation.patientId.lastName}`
                : consultation.patientId?.name || consultation.patientName || 'Unknown Patient',
              age: consultation.patientId?.age || consultation.age || null,
              gender: consultation.patientId?.gender || consultation.gender || 'N/A',
              patientImage: consultation.patientId?.profileImage || consultation.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(consultation.patientId?.firstName || consultation.patientName || 'Patient')}&background=0077C2&color=fff&size=160`,
              appointmentTime: rawTime,
              localDate,
              appointmentType: consultation.appointmentType || consultation.type || 'Follow-up',
              status: consultation.status || 'completed',
              reason: consultation.reason || consultation.complaint || consultation.chiefComplaint || 'Consultation',
              type: consultation.type || 'In-person',
              diagnosis: consultation.diagnosis || '',
            }
          })

          setConsultations(transformed)
        }
      } catch (error) {
        console.error('Error fetching consultations:', error)
        toast.error('Failed to load consultations')
      } finally {
        setLoading(false)
      }
    }

    fetchConsultations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filterStatus])

  // Get today's date for filtering
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get current month start and end
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  currentMonthEnd.setHours(23, 59, 59, 999)

  // Get current year start and end
  const currentYearStart = new Date(today.getFullYear(), 0, 1)
  const currentYearEnd = new Date(today.getFullYear(), 11, 31)
  currentYearEnd.setHours(23, 59, 59, 999)

  // Filter consultations based on period and status
  const filteredConsultations = useMemo(() => {
    let filtered = consultations

    // Filter by period
    if (filterPeriod === 'today') {
      filtered = filtered.filter((cons) => {
        const consDate = new Date(cons.appointmentTime)
        return consDate >= today && consDate < tomorrow
      })
    } else if (filterPeriod === 'monthly') {
      filtered = filtered.filter((cons) => {
        const consDate = new Date(cons.appointmentTime)
        return consDate >= currentMonthStart && consDate <= currentMonthEnd
      })
    } else if (filterPeriod === 'yearly') {
      filtered = filtered.filter((cons) => {
        const consDate = new Date(cons.appointmentTime)
        return consDate >= currentYearStart && consDate <= currentYearEnd
      })
    }
    // 'all' shows all consultations

    // Filter by selected calendar date (overlays on top of period filter)
    if (selectedDate) {
      filtered = filtered.filter((cons) => {
        if (cons.localDate) {
          return cons.localDate === selectedDate
        }
        const raw = cons.appointmentTime
        if (!raw) return false
        if (typeof raw === 'string') {
          const datePart = raw.split('T')[0]
          return datePart === selectedDate
        }
        const iso = raw.toISOString().slice(0, 10)
        return iso === selectedDate
      })
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((cons) => cons.status === filterStatus)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (cons) =>
          cons.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cons.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (cons.diagnosis && cons.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.appointmentTime)
      const dateB = new Date(b.appointmentTime)
      return dateB - dateA
    })
  }, [consultations, filterPeriod, filterStatus, searchTerm, selectedDate, today, tomorrow, currentMonthStart, currentMonthEnd, currentYearStart, currentYearEnd])

  // Calculate statistics
  const stats = useMemo(() => {
    const todayCons = consultations.filter((cons) => {
      const consDate = new Date(cons.appointmentTime)
      return consDate >= today && consDate < tomorrow
    })
    const monthlyCons = consultations.filter((cons) => {
      const consDate = new Date(cons.appointmentTime)
      return consDate >= currentMonthStart && consDate <= currentMonthEnd
    })
    const yearlyCons = consultations.filter((cons) => {
      const consDate = new Date(cons.appointmentTime)
      return consDate >= currentYearStart && consDate <= currentYearEnd
    })

    return {
      today: todayCons.length,
      monthly: monthlyCons.length,
      yearly: yearlyCons.length,
      total: consultations.length,
      completed: consultations.filter((cons) => cons.status === 'completed').length,
      inProgress: consultations.filter((cons) => cons.status === 'in-progress').length,
      pending: consultations.filter((cons) => cons.status === 'pending').length,
    }
  }, [consultations, today, tomorrow, currentMonthStart, currentMonthEnd, currentYearStart, currentYearEnd])

  const handleViewConsultation = (consultation) => {
    // Navigate to consultations page with consultation data
    navigate('/doctor/consultations', {
      state: {
        selectedConsultation: consultation,
      },
    })
  }

  return (
    <>
      <DoctorNavbar />
      <section className="flex flex-col gap-4 pb-24">
        {/* Statistics Cards - Clickable */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          <button
            type="button"
            onClick={() => setFilterPeriod('today')}
            className={`group relative overflow-hidden rounded-xl lg:rounded-2xl border p-3 lg:p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] lg:hover:scale-105 ${filterPeriod === 'today'
                ? 'border-emerald-400 bg-emerald-100 ring-2 ring-emerald-200 lg:ring-4'
                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300'
              }`}
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/10 group-hover:to-emerald-500/20 transition-all duration-300"></div>

            <div className="relative flex items-start justify-between mb-2 lg:mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-xs font-semibold uppercase tracking-wide text-emerald-700 lg:text-emerald-800 mb-1 lg:mb-2 group-hover:text-emerald-900 transition-colors">Today</p>
                <p className="text-xl lg:text-4xl font-bold text-emerald-900 leading-none group-hover:text-emerald-950 transition-colors duration-300">{stats.today}</p>
              </div>
              <div className="flex h-8 w-8 lg:h-14 lg:w-14 items-center justify-center rounded-lg lg:rounded-xl bg-emerald-500 text-white group-hover:bg-emerald-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <IoCalendarOutline className="text-base lg:text-2xl" aria-hidden="true" />
              </div>
            </div>
            <p className="relative text-[9px] lg:text-xs text-emerald-700 lg:text-emerald-800 leading-tight group-hover:text-emerald-900 transition-colors">Consultations today</p>
            <div className="hidden lg:block mt-3 pt-3 border-t border-emerald-200 group-hover:border-emerald-300 transition-colors">
              <p className="text-xs text-emerald-700">Active: {stats.inProgress + stats.pending}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod('monthly')}
            className={`group relative overflow-hidden rounded-xl lg:rounded-2xl border p-3 lg:p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] lg:hover:scale-105 ${filterPeriod === 'monthly'
                ? 'border-blue-400 bg-blue-100 ring-2 ring-blue-200 lg:ring-4'
                : 'border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300'
              }`}
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-blue-500/20 transition-all duration-300"></div>

            <div className="relative flex items-start justify-between mb-2 lg:mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-xs font-semibold uppercase tracking-wide text-blue-700 lg:text-blue-800 mb-1 lg:mb-2 group-hover:text-blue-900 transition-colors">This Month</p>
                <p className="text-xl lg:text-4xl font-bold text-blue-900 leading-none group-hover:text-blue-950 transition-colors duration-300">{stats.monthly}</p>
              </div>
              <div className="flex h-8 w-8 lg:h-14 lg:w-14 items-center justify-center rounded-lg lg:rounded-xl bg-blue-500 text-white group-hover:bg-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <IoDocumentTextOutline className="text-base lg:text-2xl" aria-hidden="true" />
              </div>
            </div>
            <p className="relative text-[9px] lg:text-xs text-blue-700 lg:text-blue-800 leading-tight group-hover:text-blue-900 transition-colors">This month's total</p>
            <div className="hidden lg:block mt-3 pt-3 border-t border-blue-200 group-hover:border-blue-300 transition-colors">
              <p className="text-xs text-blue-700">Completed: {consultations.filter(c => {
                const consDate = new Date(c.appointmentTime)
                return consDate >= currentMonthStart && consDate <= currentMonthEnd && c.status === 'completed'
              }).length}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod('yearly')}
            className={`group relative overflow-hidden rounded-xl lg:rounded-2xl border p-3 lg:p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] lg:hover:scale-105 ${filterPeriod === 'yearly'
                ? 'border-purple-400 bg-purple-100 ring-2 ring-purple-200 lg:ring-4'
                : 'border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-300'
              }`}
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/10 group-hover:to-purple-500/20 transition-all duration-300"></div>

            <div className="relative flex items-start justify-between mb-2 lg:mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-xs font-semibold uppercase tracking-wide text-purple-700 lg:text-purple-800 mb-1 lg:mb-2 group-hover:text-purple-900 transition-colors">This Year</p>
                <p className="text-xl lg:text-4xl font-bold text-purple-900 leading-none group-hover:text-purple-950 transition-colors duration-300">{stats.yearly}</p>
              </div>
              <div className="flex h-8 w-8 lg:h-14 lg:w-14 items-center justify-center rounded-lg lg:rounded-xl bg-purple-500 text-white group-hover:bg-purple-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <IoTimeOutline className="text-base lg:text-2xl" aria-hidden="true" />
              </div>
            </div>
            <p className="relative text-[9px] lg:text-xs text-purple-700 lg:text-purple-800 leading-tight group-hover:text-purple-900 transition-colors">Year-to-date total</p>
            <div className="hidden lg:block mt-3 pt-3 border-t border-purple-200 group-hover:border-purple-300 transition-colors">
              <p className="text-xs text-purple-700">Completed: {consultations.filter(c => {
                const consDate = new Date(c.appointmentTime)
                return consDate >= currentYearStart && consDate <= currentYearEnd && c.status === 'completed'
              }).length}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFilterPeriod('all')}
            className={`group relative overflow-hidden rounded-xl lg:rounded-2xl border p-3 lg:p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] lg:hover:scale-105 ${filterPeriod === 'all'
                ? 'border-slate-400 bg-slate-100 ring-2 ring-slate-200 lg:ring-4'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
              }`}
          >
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/0 to-slate-500/0 group-hover:from-slate-500/10 group-hover:to-slate-500/20 transition-all duration-300"></div>

            <div className="relative flex items-start justify-between mb-2 lg:mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] lg:text-xs font-semibold uppercase tracking-wide text-slate-600 lg:text-slate-700 mb-1 lg:mb-2 group-hover:text-slate-900 transition-colors">Total</p>
                <p className="text-xl lg:text-4xl font-bold text-slate-900 leading-none group-hover:text-slate-950 transition-colors duration-300">{stats.total}</p>
              </div>
              <div className="flex h-8 w-8 lg:h-14 lg:w-14 items-center justify-center rounded-lg lg:rounded-xl bg-slate-500 text-white group-hover:bg-slate-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                <IoMedicalOutline className="text-base lg:text-2xl" aria-hidden="true" />
              </div>
            </div>
            <p className="relative text-[9px] lg:text-xs text-slate-600 lg:text-slate-700 leading-tight group-hover:text-slate-900 transition-colors">All consultations</p>
            <div className="hidden lg:block mt-3 pt-3 border-t border-slate-200 group-hover:border-slate-300 transition-colors">
              <p className="text-xs text-slate-700">Completed: {stats.completed} | Pending: {stats.pending}</p>
            </div>
          </button>
        </div>

        {/* Search + Date Filter */}
        <div className="space-y-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IoSearchOutline className="h-5 w-5" aria-hidden="true" />
            </span>
            <input
              type="search"
              placeholder="Search by patient name, reason, or diagnosis..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">
              Filter by date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-[rgba(0,119,194,0.3)]"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Consultations List */}
        <div className="space-y-3 lg:grid lg:grid-cols-6 lg:gap-3 lg:space-y-0">
          {loading ? (
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <IoDocumentTextOutline className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
              <p className="mt-4 text-sm font-medium text-slate-600">Loading consultations...</p>
            </div>
          ) : filteredConsultations.length === 0 ? (
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <IoDocumentTextOutline className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-600">No consultations found</p>
              <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredConsultations.map((consultation) => {
              const TypeIcon = getTypeIcon(consultation.type)
              return (
                <div
                  key={consultation.id}
                  className="group relative overflow-hidden rounded-xl lg:rounded-lg border border-slate-200 bg-white p-3 lg:p-3 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 cursor-pointer active:scale-[0.98] lg:hover:scale-[1.01]"
                  onClick={() => handleViewConsultation(consultation)}
                >
                  {/* Hover Background Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0077C2]/0 to-[#0077C2]/0 group-hover:from-[#0077C2]/5 group-hover:to-[#0077C2]/10 transition-all duration-300"></div>
                  <div className="relative flex flex-col items-start gap-2.5 lg:gap-2.5">
                    {/* Top Row: Patient Image + Status */}
                    <div className="flex items-start justify-between w-full">
                      {/* Patient Image */}
                      <div className="relative shrink-0">
                        <img
                          src={consultation.patientImage}
                          alt={consultation.patientName}
                          className="h-12 w-12 lg:h-14 lg:w-14 rounded-lg object-cover ring-2 ring-slate-100 group-hover:ring-primary/30 transition-all duration-300 group-hover:scale-110 shrink-0"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(consultation.patientName)}&background=0077C2&color=fff&size=160`
                          }}
                        />
                        {consultation.status === 'completed' && (
                          <div className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 lg:h-4 lg:w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white group-hover:scale-110 group-hover:ring-emerald-400 transition-all duration-300">
                            <IoCheckmarkCircleOutline className="h-2 w-2 lg:h-2.5 lg:w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      {/* Status Badge */}
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] lg:text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(consultation.status)} group-hover:scale-105 transition-transform duration-300`}
                      >
                        {consultation.status === 'completed' ? (
                          <IoCheckmarkCircleOutline className="h-2.5 w-2.5" />
                        ) : consultation.status === 'in-progress' ? (
                          <IoTimeOutline className="h-2.5 w-2.5" />
                        ) : (
                          <IoTimeOutline className="h-2.5 w-2.5" />
                        )}
                        <span>{getStatusText(consultation.status)}</span>
                      </span>
                    </div>

                    {/* Consultation Info */}
                    <div className="flex-1 min-w-0 w-full space-y-2">
                      {/* Patient Name */}
                      <div>
                        <h3 className="text-sm lg:text-base font-bold text-slate-900 truncate group-hover:text-primary transition-colors duration-300">{consultation.patientName}</h3>
                        <p className="text-xs lg:text-sm text-slate-600 mt-1 group-hover:text-slate-700 transition-colors line-clamp-2">{consultation.reason}</p>
                      </div>

                      {/* Consultation Details */}
                      <div className="flex flex-col items-start gap-1.5 lg:gap-1.5 text-[10px] lg:text-xs text-slate-600 group-hover:text-slate-700 transition-colors">
                        <div className="flex items-center gap-1.5 w-full">
                          <IoCalendarOutline className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-500 shrink-0" />
                          <span className="line-clamp-1 flex-1">
                            {formatDate(consultation.localDate || consultation.appointmentTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 w-full">
                          <TypeIcon className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-500 shrink-0" />
                          <span className="flex-1">{consultation.type}</span>
                        </div>
                        {consultation.diagnosis && (
                          <div className="flex items-center gap-1.5 w-full">
                            <IoDocumentTextOutline className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-500 shrink-0" />
                            <span className="font-semibold text-slate-900 line-clamp-1 flex-1">{consultation.diagnosis}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={pagination.page || page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit || limit}
              onPageChange={(newPage) => {
                setPage(newPage)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              loading={loading}
            />
          </div>
        )}
      </section>
    </>
  )
}

export default DoctorAllConsultations

