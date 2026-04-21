import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IoArrowBackOutline,
  IoLocationOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoStar,
  IoEyeOutline,
} from 'react-icons/io5'
import { getSpecialtyDoctors, getDoctors } from '../patient-services/patientService'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'
import { openDoctorBooking } from '../patient-utils/bookingNavigation'
import { canBookDoctor, canShowDoctorProfile } from '../patient-utils/doctorAccess'

const specialtyLabels = {
  'dentist': 'Dentist',
  'cardio': 'Cardiology',
  'ortho': 'Orthopedic',
  'neuro': 'Neurology',
  'general': 'General',
}


const PatientSpecialtyDoctors = () => {
  const { specialtyId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const specialtyLabel = useMemo(() => {
    if (specialtyId === 'all') return 'All Specialties'
    if (specialtyLabels[specialtyId]) return specialtyLabels[specialtyId]
    if (doctors.length > 0) {
      return doctors[0].specialization || doctors[0].specialty || 'Selected'
    }
    return 'Loading...'
  }, [specialtyId, doctors])

  // Fetch doctors by specialty from API
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true)
        setError(null)

        const { getAuthToken } = await import('../../../utils/apiClient')
        const token = getAuthToken('patient')
        if (!token) {
          navigate('/patient/login')
          return
        }

        let response
        if (specialtyId === 'all') {
          // Fetch all doctors
          response = await getDoctors({ limit: 100 })
        } else {
          // Fetch doctors by specialty
          response = await getSpecialtyDoctors(specialtyId, { limit: 100 })
        }

        if (response) {
          const doctorsData = Array.isArray(response)
            ? response
            : response.items || []

          // Filter by active status (doctors should already be filtered by backend, but double-check)
          const activeDoctors = doctorsData.filter((doctor) => canShowDoctorProfile(doctor))

          setDoctors(activeDoctors)
        } else {
          setDoctors([])
        }
      } catch (err) {
        console.error('Error fetching specialty doctors:', err)
        setError(err.message || 'Failed to load doctors')
        toast.error('Failed to load doctors')
        setDoctors([])
      } finally {
        setLoading(false)
      }
    }

    if (specialtyId) {
      fetchDoctors()
    }
  }, [specialtyId, navigate, toast])

  const handleCardClick = (doctorId) => {
    if (doctorId) {
      navigate(`/patient/doctors/${doctorId}`)
    } else {
      console.error('Doctor ID missing in specialty doctors list')
      toast.error('Doctor details unavailable')
    }
  }

  // Calculate paginated doctors
  const paginatedDoctors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return doctors.slice(startIndex, endIndex)
  }, [doctors, currentPage])

  const totalPages = Math.ceil(doctors.length / itemsPerPage)
  const totalItems = doctors.length

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
          <h1 className="text-2xl font-bold text-slate-900">{specialtyLabel} Doctors</h1>
          <p className="text-sm text-slate-600">{doctors.length} doctor(s) available</p>
        </div>
      </div>

      {/* Doctors List */}
      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">Loading doctors...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No doctors found in this specialty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedDoctors.map((doctor) => {
            const doctorId = doctor._id || doctor.id
            const doctorName = doctor.firstName && doctor.lastName
              ? `Dr. ${doctor.firstName} ${doctor.lastName}`
              : doctor.name || 'Doctor'
            const specialty = doctor.specialization || doctor.specialty || ''

            // Format full address
            const formatFullAddress = (clinicDetails) => {
              if (!clinicDetails) return 'Location not available'

              const parts = []
              if (clinicDetails.name) parts.push(clinicDetails.name)

              if (clinicDetails.address) {
                const addr = clinicDetails.address
                if (addr.line1) parts.push(addr.line1)
                if (addr.line2) parts.push(addr.line2)
                if (addr.city) parts.push(addr.city)
                if (addr.state) parts.push(addr.state)
                if (addr.postalCode) parts.push(addr.postalCode)
                if (addr.country) parts.push(addr.country)
              }

              return parts.length > 0 ? parts.join(', ') : 'Location not available'
            }

            const location = formatFullAddress(doctor.clinicDetails)
            const consultationFee = doctor.consultationFee || 0
            const originalFees = doctor.original_fees || 0
            const discountAmount = doctor.discount_amount || 0
            const profileImage = doctor.profileImage || doctor.image || ''

            return (
              <div
                key={doctorId}
                className="group bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] cursor-pointer transition-all duration-500 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)] hover:border-primary/30 hover:-translate-y-1.5 active:scale-[0.98]"
                onClick={() => handleCardClick(doctorId)}
              >
                <div className="p-6">
                  <div className="flex gap-5 mb-5 items-center sm:items-start">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 bg-primary/20 rounded-[22px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <img
                        src={profileImage}
                        alt={doctorName}
                        className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-[22px] object-cover ring-4 ring-white shadow-sm transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0077C2&color=fff&size=200&bold=true`
                        }}
                      />
                      {doctor.isFeatured && (
                        <div className="absolute -top-3 -left-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white p-2 rounded-xl shadow-lg transform -rotate-12 group-hover:rotate-0 transition-transform duration-300">
                          <IoStar className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col h-full justify-center">
                        <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight mb-1 group-hover:text-primary transition-colors">
                          {doctorName}
                        </h3>
                        <p className="text-sm font-bold text-primary mb-3 flex items-center gap-1.5">
                          <span className="w-5 h-[2px] bg-primary/30 rounded-full" />
                          {specialty}
                        </p>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="shrink-0 bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded border border-blue-100/50 uppercase tracking-tight">
                            {doctor.experienceYears || doctor.experience || 'NEW'} EXP
                          </span>
                        </div>

                        <div className="flex items-start gap-2 text-slate-500">
                          <IoLocationOutline className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                          <p className="text-xs font-medium leading-relaxed text-slate-600">{location}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 pt-5 border-t border-slate-100 bg-slate-50/30 -mx-6 px-6 sm:bg-transparent sm:mx-0 sm:px-0">
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Fees</p>
                      <div className="flex items-center gap-2.5">
                        {discountAmount > 0 && originalFees > 0 && (
                          <span className="text-sm line-through text-slate-300 font-bold italic">₹{originalFees}</span>
                        )}
                        <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{consultationFee}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-1.5 shadow-sm">
                          <span>SAVE ₹{discountAmount}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCardClick(doctorId)
                        }}
                        aria-label="View doctor profile"
                        className="h-[40px] w-[40px] shrink-0 rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-300 shadow-sm hover:border-primary/30 hover:bg-slate-50 hover:text-primary active:scale-95 flex items-center justify-center"
                      >
                        <IoEyeOutline className="h-4 w-4" />
                      </button>
                      {canBookDoctor(doctor) ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDoctorBooking(navigate, doctorId)
                          }}
                          className="h-[40px] px-4 bg-primary text-white font-bold rounded-xl text-[11px] uppercase tracking-wider transition-all duration-300 shadow-lg shadow-primary/20 hover:bg-primary-dark hover:shadow-xl hover:translate-y-[-1px] active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <span>Book Now</span>
                          <IoCalendarOutline className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="h-[40px] px-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center">
                          Booking Off
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && doctors.length > 0 && totalPages > 1 && (
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

export default PatientSpecialtyDoctors

