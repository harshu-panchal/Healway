import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorNavbar from '../doctor-components/DoctorNavbar'
import {
  IoPeopleOutline,
  IoSearchOutline,
  IoTimeOutline,
  IoDocumentTextOutline,
  IoCallOutline,
  IoMailOutline,
  IoMedicalOutline,
} from 'react-icons/io5'
import { getDoctorPatients, getPatientById } from '../doctor-services/doctorService'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const DoctorAllPatients = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'active', 'inactive'
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [pagination, setPagination] = useState(null)

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1)
  }, [searchTerm, filterStatus])

  // Fetch patients from API
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true)
        const params = {
          page,
          limit,
          ...(searchTerm && { search: searchTerm }),
        }
        const response = await getDoctorPatients(params)

        if (response) {
          const patientsData = Array.isArray(response)
            ? response
            : response.patients || response.items || []

          // Set pagination data
          if (response.pagination) {
            setPagination(response.pagination)
          }

          const transformed = patientsData.map(patient => ({
            id: patient._id || patient.id,
            patientId: patient._id || patient.id,
            patientName: patient.firstName && patient.lastName
              ? `${patient.firstName} ${patient.lastName}`
              : patient.name || 'Unknown Patient',
            age: patient.age || patient.dateOfBirth
              ? (new Date().getFullYear() - new Date(patient.dateOfBirth || new Date()).getFullYear())
              : null,
            gender: patient.gender || 'N/A',
            patientImage: patient.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.firstName || patient.name || 'Patient')}&background=0077C2&color=fff&size=160`,
            patientPhone: patient.phone || '',
            patientEmail: patient.email || '',
            patientAddress: (() => {
              if (patient.address && typeof patient.address === 'object') {
                const addressParts = [
                  patient.address.line1,
                  patient.address.line2,
                  patient.address.city,
                  patient.address.state,
                  patient.address.postalCode,
                  patient.address.country
                ].filter(Boolean)
                return addressParts.length > 0 ? addressParts.join(', ') : 'Not provided'
              }
              return patient.address || 'Not provided'
            })(),
            // Preserve original address object for later use
            originalAddress: patient.address,
            firstVisit: patient.firstVisit || patient.firstAppointmentDate || null,
            lastVisit: patient.lastVisit || patient.lastAppointmentDate || null,
            totalVisits: patient.totalVisits || patient.totalAppointments || 0,
            patientType: patient.totalVisits > 1 ? 'returning' : 'new',
            totalConsultations: patient.totalConsultations || 0,
            lastDiagnosis: patient.lastDiagnosis || '',
            status: patient.status || 'active',
          }))

          setPatients(transformed)
        }
      } catch (error) {
        console.error('Error fetching patients:', error)
        toast.error('Failed to load patients')
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, searchTerm])

  // Filter patients based on search and filters
  const filteredPatients = useMemo(() => {
    let filtered = patients

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          patient.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.patientPhone.includes(searchTerm) ||
          patient.patientEmail.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((patient) => patient.status === filterStatus)
    }

    return filtered
  }, [patients, searchTerm, filterStatus])

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: pagination?.total || patients.length,
      new: patients.filter((p) => p.patientType === 'new').length,
      returning: patients.filter((p) => p.patientType === 'returning').length,
      active: patients.filter((p) => p.status === 'active').length,
      inactive: patients.filter((p) => p.status === 'inactive').length,
    }
  }, [patients, pagination])

  const handleViewPatient = async (patient) => {
    try {
      // Fetch full patient data from backend to ensure we have complete address
      let fullPatientData = null

      if (patient.patientId) {
        try {
          const patientResponse = await getPatientById(patient.patientId)
          if (patientResponse) {
            fullPatientData = patientResponse
          }
        } catch (error) {
          console.error('Error fetching patient data:', error)
        }
      }

      // Use full patient data or fallback to patient data from list
      const finalPatientData = fullPatientData || patient

      // Format address properly
      let formattedAddress = 'Not provided'
      const address = finalPatientData.address || finalPatientData.originalAddress
      if (address && typeof address === 'object') {
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
      } else if (finalPatientData.patientAddress && typeof finalPatientData.patientAddress === 'string' && finalPatientData.patientAddress !== 'Not provided') {
        formattedAddress = finalPatientData.patientAddress
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

      const patientDateOfBirth = finalPatientData.dateOfBirth || patient.dateOfBirth
      const calculatedAge = patientDateOfBirth ? calculateAge(patientDateOfBirth) : (finalPatientData.age || patient.age || null)

      // Get patient ID as string
      const patientIdString = patient.patientId || finalPatientData._id || finalPatientData.id

      // Create consultation data with real patient information
      const consultationData = {
        id: `cons-${patient.id}-${Date.now()}`,
        _id: `cons-${patient.id}-${Date.now()}`,
        patientName: finalPatientData.firstName && finalPatientData.lastName
          ? `${finalPatientData.firstName} ${finalPatientData.lastName}`
          : patient.patientName || 'Unknown Patient',
        age: calculatedAge,
        gender: finalPatientData.gender || patient.gender || 'male',
        appointmentTime: patient.lastVisit || new Date().toISOString(),
        appointmentDate: patient.lastVisit ? (typeof patient.lastVisit === 'string' ? patient.lastVisit.split('T')[0] : new Date(patient.lastVisit).toISOString().split('T')[0]) : null,
        appointmentType: patient.patientType === 'new' ? 'New' : 'Follow-up',
        status: 'completed',
        reason: patient.lastDiagnosis || 'Consultation',
        patientImage: finalPatientData.profileImage || patient.patientImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(finalPatientData.firstName || patient.patientName || 'Patient')}&background=0077C2&color=fff&size=160`,
        patientPhone: finalPatientData.phone || patient.patientPhone || '',
        patientEmail: finalPatientData.email || patient.patientEmail || '',
        patientAddress: formattedAddress,
        // Include patientId object structure for transformConsultationData
        patientId: {
          _id: patientIdString,
          id: patientIdString,
          firstName: finalPatientData.firstName || patient.patientName?.split(' ')[0] || '',
          lastName: finalPatientData.lastName || patient.patientName?.split(' ').slice(1).join(' ') || '',
          email: finalPatientData.email || patient.patientEmail || '',
          phone: finalPatientData.phone || patient.patientPhone || '',
          dateOfBirth: patientDateOfBirth || null,
          gender: finalPatientData.gender || patient.gender || 'male',
          profileImage: finalPatientData.profileImage || patient.patientImage || null,
          address: address || null,
        },
        diagnosis: '',
        vitals: {},
        investigations: [],
        advice: '',
        attachments: [],
      }

      navigate('/doctor/consultations', {
        state: {
          selectedConsultation: consultationData,
        },
      })
    } catch (error) {
      console.error('Error handling patient view:', error)
      toast.error('Failed to load patient data')
    }
  }

  return (
    <>
      <DoctorNavbar />
      <section className="flex flex-col gap-4 pb-24">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-slate-900 lg:text-3xl">My Patients</h2>
          <p className="text-sm text-slate-600">View and manage records of all your associated patients</p>
        </header>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
          <button
            onClick={() => {
              setFilterStatus('all')
            }}
            className={`rounded-xl border p-3 lg:p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${filterStatus === 'all'
              ? 'border-primary bg-gradient-to-br from-[#0077C2] to-[var(--color-primary-dark)] text-white lg:shadow-xl'
              : 'border-slate-200 bg-white hover:border-primary/30 hover:bg-slate-50'
              }`}
          >
            <p className={`text-[10px] lg:text-sm font-semibold uppercase mb-1.5 lg:mb-2 ${filterStatus === 'all' ? 'text-white/90' : 'text-slate-600'
              }`}>Total</p>
            <p className={`text-xl lg:text-4xl font-bold transition-all duration-300 ${filterStatus === 'all' ? 'text-white' : 'text-slate-900'
              }`}>{stats.total}</p>
          </button>
          <button
            onClick={() => {
              setFilterStatus('active')
            }}
            className={`rounded-xl border p-3 lg:p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${filterStatus === 'active'
              ? 'border-emerald-600 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white lg:shadow-xl'
              : 'border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100'
              }`}
          >
            <p className={`text-[10px] lg:text-sm font-semibold uppercase mb-1.5 lg:mb-2 ${filterStatus === 'active' ? 'text-white/90' : 'text-emerald-700'
              }`}>Active</p>
            <p className={`text-xl lg:text-4xl font-bold transition-all duration-300 ${filterStatus === 'active' ? 'text-white' : 'text-emerald-900'
              }`}>{stats.active}</p>
          </button>
          <button
            onClick={() => {
              setFilterStatus('inactive')
            }}
            className={`rounded-xl border p-3 lg:p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${filterStatus === 'inactive'
              ? 'border-slate-600 bg-gradient-to-br from-slate-600 to-slate-700 text-white lg:shadow-xl'
              : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
              }`}
          >
            <p className={`text-[10px] lg:text-sm font-semibold uppercase mb-1.5 lg:mb-2 ${filterStatus === 'inactive' ? 'text-white/90' : 'text-slate-600'
              }`}>Inactive</p>
            <p className={`text-xl lg:text-4xl font-bold transition-all duration-300 ${filterStatus === 'inactive' ? 'text-white' : 'text-slate-900'
              }`}>{stats.inactive}</p>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IoSearchOutline className="h-5 w-5" aria-hidden="true" />
          </span>
          <input
            type="search"
            placeholder="Search by name, phone, or email..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(0,119,194,0.2)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Patients List */}
        <div className="space-y-3 lg:grid lg:grid-cols-6 lg:gap-4 lg:space-y-0">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm lg:col-span-6">
              <IoPeopleOutline className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
              <p className="mt-4 text-sm font-medium text-slate-600">Loading patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm lg:col-span-6">
              <IoPeopleOutline className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-600">No patients found</p>
              <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:scale-105 lg:flex lg:flex-col lg:group"
              >
                {/* Top Row: Profile Image + Name (Left) and Active Status (Right) */}
                <div className="flex items-start justify-between mb-3 lg:mb-3">
                  {/* Left Side: Profile Image + Name */}
                  <div className="flex items-center gap-2.5 lg:gap-3 flex-1 min-w-0">
                    {/* Profile Image - Left Top */}
                    <img
                      src={patient.patientImage}
                      alt={patient.patientName}
                      className="h-10 w-10 lg:h-12 lg:w-12 rounded-lg object-cover ring-2 ring-slate-100 shrink-0 transition-all duration-300 group-hover:ring-primary/30 group-hover:scale-110"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.patientName)}&background=0077C2&color=fff&size=160`
                      }}
                    />

                    {/* Name - Heading next to Profile */}
                    <h3 className="text-sm lg:text-base font-bold text-slate-900 group-hover:text-primary transition-colors duration-300 break-words">{patient.patientName}</h3>
                  </div>

                  {/* Right Side: Active Status */}
                  <span
                    className={`rounded-full px-2 py-0.5 lg:px-2 lg:py-0.5 text-[8px] lg:text-[9px] font-semibold shrink-0 transition-all duration-300 group-hover:scale-105 ${patient.status === 'active'
                      ? 'bg-green-500 text-white group-hover:bg-green-600'
                      : 'bg-slate-400 text-white group-hover:bg-slate-500'
                      }`}
                  >
                    {patient.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Patient Info - Below Top Row */}
                <div className="flex flex-col lg:flex-1">
                  <p className="text-xs lg:text-sm text-slate-600 mb-2.5 lg:mb-3">
                    {patient.age} years • {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
                  </p>

                  {/* Contact Info */}
                  <div className="space-y-1.5 lg:space-y-1.5 text-[11px] lg:text-xs text-slate-600 mb-2.5 lg:mb-3">
                    {patient.patientPhone && (
                      <div className="flex items-center gap-1.5 transition-colors duration-300 group-hover:text-primary">
                        <IoCallOutline className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-400 shrink-0 transition-colors duration-300 group-hover:text-primary" />
                        <span className="truncate">{patient.patientPhone}</span>
                      </div>
                    )}
                    {patient.patientEmail && (
                      <div className="flex items-center gap-1.5 transition-colors duration-300 group-hover:text-primary">
                        <IoMailOutline className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-400 shrink-0 transition-colors duration-300 group-hover:text-primary" />
                        <span className="truncate">{patient.patientEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Visit History */}
                  <div className="flex flex-wrap items-center gap-2.5 lg:gap-3 text-[11px] lg:text-xs text-slate-600 mb-3 lg:mb-4">
                    <div className="flex items-center gap-1.5 transition-colors duration-300 group-hover:text-primary">
                      <IoTimeOutline className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-400 shrink-0 transition-colors duration-300 group-hover:text-primary" />
                      <span>Last: {formatDate(patient.lastVisit)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 transition-colors duration-300 group-hover:text-primary">
                      <IoDocumentTextOutline className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-400 shrink-0 transition-colors duration-300 group-hover:text-primary" />
                      <span>Visits: {patient.totalVisits}</span>
                    </div>
                    {patient.lastDiagnosis && (
                      <div className="flex items-center gap-1.5 transition-colors duration-300 group-hover:text-primary">
                        <IoMedicalOutline className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-400 shrink-0 transition-colors duration-300 group-hover:text-primary" />
                        <span className="truncate">{patient.lastDiagnosis}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button - Full Width */}
                  <button
                    type="button"
                    onClick={() => handleViewPatient(patient)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 lg:py-2.5 text-xs lg:text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-[var(--color-primary-dark)] hover:shadow-lg hover:scale-105 active:scale-95 mt-auto"
                  >
                    <IoDocumentTextOutline className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    View Records
                  </button>
                </div>
              </div>
            ))
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

export default DoctorAllPatients

