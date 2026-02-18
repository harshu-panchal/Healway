import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DoctorNavbar from '../doctor-components/DoctorNavbar'
import {
  getPatientQueue,
  getPatientById,
  getPatientHistory,
  updateQueueStatus,
} from '../doctor-services/doctorService'
import { useToast } from '../../../contexts/ToastContext'
import { getSocket } from '../../../utils/socketClient'
import {
  IoPeopleOutline,
  IoSearchOutline,
  IoCloseOutline,
  IoCalendarOutline,
  IoDocumentTextOutline,
  IoPersonOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
} from 'react-icons/io5'

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatTime = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    if (typeof dateString === 'string' && (dateString.includes('AM') || dateString.includes('PM'))) {
      if (dateString.includes('T') && (dateString.includes('AM') || dateString.includes('PM'))) {
        const timeMatch = dateString.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i)
        if (timeMatch) return timeMatch[1]
      }
      return dateString
    }
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  } catch (error) {
    console.error('Error formatting time:', error, dateString)
    return 'N/A'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const DoctorPatients = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const isDashboardPage = location.pathname === '/doctor/dashboard' || location.pathname === '/doctor/'

  const [appointments, setAppointments] = useState([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)
  const [appointmentsError, setAppointmentsError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [medicalHistory, setMedicalHistory] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Fetch appointments from API
  const fetchAppointments = async () => {
    try {
      setLoadingAppointments(true)
      setAppointmentsError(null)
      const todayStr = getTodayDateString()
      const response = await getPatientQueue(todayStr)

      if (response) {
        // Fix: response is already response.data from doctorService
        const queueData = response.appointments || response.queue || []

        const transformedAppointments = Array.isArray(queueData) ? queueData.map((appt) => ({
          id: appt._id || appt.id,
          _id: appt._id || appt.id,
          patientId: appt.patientId?._id || appt.patientId || appt.patientId?.id,
          patientName: appt.patientId?.firstName && appt.patientId?.lastName
            ? `${appt.patientId.firstName} ${appt.patientId.lastName}`
            : appt.patientId?.name || appt.patientName || 'Patient',
          age: appt.patientId?.age || appt.age || 0,
          gender: appt.patientId?.gender || appt.gender || 'unknown',
          appointmentTime: appt.appointmentTime || appt.appointmentDate,
          appointmentDate: appt.appointmentDate || appt.date,
          appointmentType: appt.appointmentType || appt.type || 'New',
          consultationMode: appt.consultationMode || 'in_person',
          status: appt.status || 'waiting',
          queueStatus: appt.queueStatus || appt.status || 'waiting',
          queueNumber: appt.tokenNumber || appt.queueNumber || 0,
          reason: appt.reason || appt.chiefComplaint || 'Consultation',
          time: appt.time,
          patientImage: appt.patientId?.profileImage || appt.patientId?.image || appt.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.patientId?.firstName || 'Patient')}&background=0077C2&color=fff&size=160`,
          originalData: appt,
        })) : []

        setAppointments(transformedAppointments)
      } else {
        setAppointments([])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load appointments'
      setAppointmentsError(errorMessage)
      setAppointments([])
    } finally {
      setLoadingAppointments(false)
    }
  }

  useEffect(() => {
    if (location.pathname === '/doctor/patients' || isDashboardPage) {
      fetchAppointments()
      const interval = setInterval(fetchAppointments, 30000)
      return () => clearInterval(interval)
    } else {
      setLoadingAppointments(false)
    }
  }, [location.pathname, isDashboardPage])

  // Socket listener for real-time queue updates
  useEffect(() => {
    let socket = getSocket()
    if (!socket) return

    const handleQueueUpdated = (data) => {
      if (data?.appointmentId) {
        setAppointments((prev) =>
          prev.map((appt) => {
            if (appt.id === data.appointmentId || appt._id === data.appointmentId) {
              if (data.status !== undefined || data.queueStatus !== undefined) {
                return {
                  ...appt,
                  status: data.status !== undefined ? data.status : appt.status,
                  queueStatus: data.queueStatus !== undefined ? data.queueStatus : (data.status || appt.queueStatus),
                }
              }
            }
            return appt
          })
        )
      }
    }

    socket.on('queue:updated', handleQueueUpdated)
    return () => {
      socket.off('queue:updated', handleQueueUpdated)
    }
  }, [])

  const filteredAppointments = appointments.filter((appt) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const patientName = appt.patientName || ''
      const reason = appt.reason || ''
      return (
        patientName.toLowerCase().includes(searchLower) ||
        reason.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // Helper function to determine which buttons to show for an appointment
  const getAppointmentButtons = (appointment) => {
    const status = appointment.status || appointment.originalData?.status
    const queueStatus = appointment.queueStatus || appointment.originalData?.queueStatus

    if (status === 'completed') {
      return { showButtons: false, buttons: [], showCompletedLabel: true }
    }

    if (status === 'cancelled' || status === 'cancelled_by_session' || queueStatus === 'no-show') {
      return { showButtons: false, buttons: [], showCancelledLabel: true }
    }

    if (['scheduled', 'confirmed'].includes(status)) {
      return {
        showButtons: true,
        buttons: ['complete', 'cancel']
      }
    }

    return { showButtons: false, buttons: [] }
  }

  const handleComplete = async (appointmentId) => {
    try {
      const response = await updateQueueStatus(appointmentId, 'completed')
      if (response) {
        toast.success('Appointment marked as completed')
        fetchAppointments()
      } else {
        toast.error(response.message || 'Failed to complete appointment')
      }
    } catch (error) {
      console.error('Error completing appointment:', error)
      toast.error('Failed to complete appointment')
    }
  }

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return
    try {
      const response = await updateQueueStatus(appointmentId, 'cancelled')
      if (response) {
        toast.success('Appointment cancelled')
        fetchAppointments()
      } else {
        toast.error(response.message || 'Failed to cancel appointment')
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast.error('Failed to cancel appointment')
    }
  }

  const handleViewHistory = (appointment) => {
    setSelectedPatient(appointment)
    setShowHistoryModal(true)
  }

  // Load patient history when patient is selected
  useEffect(() => {
    const loadPatientHistory = async () => {
      if (selectedPatient?.patientId || selectedPatient?._id) {
        try {
          setLoadingHistory(true)
          const patientId = selectedPatient.patientId || selectedPatient._id
          const historyResponse = await getPatientHistory(patientId)
          if (historyResponse) {
            setMedicalHistory(historyResponse)
          } else {
            setMedicalHistory(null)
          }
        } catch (error) {
          console.error('Error loading patient history:', error)
          setMedicalHistory(null)
        } finally {
          setLoadingHistory(false)
        }
      } else {
        setMedicalHistory(null)
      }
    }
    loadPatientHistory()
  }, [selectedPatient?.patientId, selectedPatient?._id])

  if (loadingAppointments && appointments.length === 0 && !appointmentsError) {
    return (
      <>
        <DoctorNavbar />
        <section className={`flex flex-col gap-4 pb-24 ${isDashboardPage ? '-mt-20' : ''}`}>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <IoPeopleOutline className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
            <p className="mt-4 text-sm font-medium text-slate-600">Loading patients...</p>
          </div>
        </section>
      </>
    )
  }

  if (appointmentsError && appointments.length === 0) {
    return (
      <>
        <DoctorNavbar />
        <section className={`flex flex-col gap-4 pb-24 ${isDashboardPage ? '-mt-20' : ''}`}>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
            <IoCloseCircleOutline className="mx-auto h-12 w-12 text-red-300" />
            <p className="mt-4 text-sm font-medium text-red-600">Error loading patients</p>
            <p className="mt-1 text-xs text-red-500">{appointmentsError}</p>
            <button
              onClick={() => fetchAppointments()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <DoctorNavbar />
      <section className={`flex flex-col gap-4 pb-24 ${isDashboardPage ? '-mt-20' : ''}`}>
        {/* Search Bar */}
        <div className="mb-4 mt-4">
          <div className="relative">
            <IoSearchOutline className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patients by name or reason..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2"
            />
          </div>
        </div>

        {/* Appointment Queue */}
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <IoPeopleOutline className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-600">No appointments found</p>
              <p className="mt-1 text-xs text-slate-500">Your appointment queue will appear here</p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`rounded-xl border bg-white p-3 shadow-sm transition-all ${appointment.status === 'completed'
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : appointment.status === 'cancelled'
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-slate-200 hover:shadow-md'
                  }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex shrink-0 items-center justify-center">
                      <span className={`text-xs font-semibold ${appointment.status === 'completed' ? 'text-emerald-700' :
                        appointment.status === 'cancelled' ? 'text-red-600' : 'text-slate-600'
                        }`}>
                        {appointment.queueNumber}.
                      </span>
                    </div>

                    <img
                      src={appointment.patientImage}
                      alt={appointment.patientName}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(appointment.patientName)}&background=0077C2&color=fff&size=160`
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {appointment.patientName}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {appointment.age || 0} years • {appointment.gender?.charAt(0).toUpperCase() || 'N/A'}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center">
                      <div className="text-xs font-medium text-slate-700">
                        {appointment.time || formatTime(appointment.appointmentTime)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${appointment.appointmentType === 'New' ? 'bg-primary/10 text-primary' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                      {appointment.appointmentType}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      <IoPersonOutline className="h-2.5 w-2.5" />
                      <span>{appointment.consultationMode?.replace('_', ' ')}</span>
                    </span>
                    {appointment.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <IoCheckmarkCircleOutline className="h-2.5 w-2.5" />
                        Completed
                      </span>
                    )}
                    {appointment.status === 'cancelled' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        <IoCloseCircleOutline className="h-2.5 w-2.5" />
                        Cancelled
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {getAppointmentButtons(appointment).showButtons && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleComplete(appointment.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                        >
                          <IoCheckmarkCircleOutline className="h-3.5 w-3.5" />
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(appointment.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 active:scale-95"
                        >
                          <IoCloseCircleOutline className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleViewHistory(appointment)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                    >
                      <IoDocumentTextOutline className="h-3.5 w-3.5" />
                      History
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Medical History Modal */}
      {showHistoryModal && selectedPatient && medicalHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowHistoryModal(false)
            }
          }}
        >
          <div className="relative w-full max-w-md max-h-[90vh] rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <img
                  src={selectedPatient.patientImage}
                  alt={selectedPatient.patientName}
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-slate-100"
                />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedPatient.patientName}</h2>
                  <p className="text-xs text-slate-600">
                    {selectedPatient.age} years • {selectedPatient.gender}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <IoCloseOutline className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {medicalHistory.personalInfo && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Personal Information
                  </h3>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="grid gap-2 grid-cols-2">
                      {medicalHistory.personalInfo.bloodGroup && (
                        <div>
                          <p className="text-xs text-slate-600">Blood Group</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {medicalHistory.personalInfo.bloodGroup}
                          </p>
                        </div>
                      )}
                      {medicalHistory.personalInfo.phone && (
                        <div>
                          <p className="text-xs text-slate-600">Phone</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {medicalHistory.personalInfo.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Conditions, Medications, etc could be here */}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DoctorPatients;
