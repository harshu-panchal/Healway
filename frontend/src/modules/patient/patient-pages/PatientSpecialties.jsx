import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoArrowBackOutline,
  IoPulseOutline,
  IoHeartOutline,
} from 'react-icons/io5'
import { TbStethoscope, TbVaccine } from 'react-icons/tb'
import { MdOutlineEscalatorWarning } from 'react-icons/md'
import { getSpecialties, getDiscoveryDoctors } from '../patient-services/patientService'
import { useToast } from '../../../contexts/ToastContext'

// Default specialties (will be replaced by API data)
const defaultSpecialties = [
  {
    id: 'dentist',
    label: 'Dentist',
    icon: TbStethoscope,
    gradient: 'from-cyan-400 to-[#0077C2]',
    bgGradient: 'bg-gradient-to-br from-cyan-50 to-[rgba(0,119,194,0.1)]',
    iconBg: 'bg-gradient-to-br from-cyan-50 to-[rgba(0,119,194,0.1)]',
    textColor: 'text-primary',
    shadowColor: 'shadow-cyan-200/50',
    doctorCount: 0, // Will be calculated from API data
  },
  {
    id: 'cardio',
    label: 'Cardiology',
    icon: IoHeartOutline,
    gradient: 'from-pink-400 to-rose-500',
    bgGradient: 'bg-gradient-to-br from-pink-50 to-rose-50',
    iconBg: 'bg-gradient-to-br from-pink-50 to-rose-50',
    textColor: 'text-rose-600',
    shadowColor: 'shadow-pink-200/50',
    doctorCount: 0, // Will be calculated from API data
  },
  {
    id: 'ortho',
    label: 'Orthopedic',
    icon: MdOutlineEscalatorWarning,
    gradient: 'from-emerald-400 to-green-500',
    bgGradient: 'bg-gradient-to-br from-emerald-50 to-green-50',
    iconBg: 'bg-gradient-to-br from-emerald-50 to-green-50',
    textColor: 'text-green-600',
    shadowColor: 'shadow-emerald-200/50',
    doctorCount: 0, // Will be calculated from API data
  },
  {
    id: 'neuro',
    label: 'Neurology',
    icon: IoPulseOutline,
    gradient: 'from-purple-400 to-violet-500',
    bgGradient: 'bg-gradient-to-br from-purple-50 to-violet-50',
    iconBg: 'bg-gradient-to-br from-purple-50 to-violet-50',
    textColor: 'text-violet-600',
    shadowColor: 'shadow-purple-200/50',
    doctorCount: 0, // Will be calculated from API data
  },
  {
    id: 'general',
    label: 'General',
    icon: TbStethoscope,
    gradient: 'from-[#0077C2] to-indigo-500',
    bgGradient: 'bg-gradient-to-br from-[rgba(0,119,194,0.1)] to-indigo-50',
    iconBg: 'bg-gradient-to-br from-[rgba(0,119,194,0.1)] to-indigo-50',
    textColor: 'text-indigo-600',
    shadowColor: 'shadow-[rgba(0,119,194,0.1)]',
    doctorCount: 0, // Will be calculated from API data
  },
  {
    id: 'vaccine',
    label: 'Vaccines',
    icon: TbVaccine,
    gradient: 'from-amber-400 to-orange-500',
    bgGradient: 'bg-gradient-to-br from-amber-50 to-orange-50',
    iconBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    textColor: 'text-amber-700',
    shadowColor: 'shadow-amber-200/50',
    doctorCount: 0, // No doctors for vaccines
  },
]

const PatientSpecialties = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [specialtiesList, setSpecialtiesList] = useState(defaultSpecialties)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch specialties and doctors from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const [specialtiesResponse, doctorsResponse] = await Promise.all([
          getSpecialties().catch(() => ({ success: false, data: [] })),
          getDiscoveryDoctors().catch(() => ({ success: false, data: [] })),
        ])
        
        // Get specialties from API or use defaults
        let specialtiesData = []
        if (specialtiesResponse.success && specialtiesResponse.data) {
          specialtiesData = Array.isArray(specialtiesResponse.data) 
            ? specialtiesResponse.data 
            : specialtiesResponse.data.specialties || []
        }
        
        // Get doctors to count by specialty
        let doctorsData = []
        if (doctorsResponse) {
          doctorsData = Array.isArray(doctorsResponse) 
            ? doctorsResponse 
            : doctorsResponse.items || []
        }
        
        // Map specialties with doctor counts
        const specialtyMap = new Map()
        doctorsData.forEach(doctor => {
          const specialty = (doctor.specialization || doctor.specialty || 'General').toLowerCase()
          specialtyMap.set(specialty, (specialtyMap.get(specialty) || 0) + 1)
        })
        
        // Build specialties list
        const specialtiesWithCounts = defaultSpecialties.map(spec => {
          const specialtyKey = spec.label.toLowerCase()
          const count = specialtyMap.get(specialtyKey) || 0
          return { ...spec, doctorCount: count }
        })
        
        // Add any specialties from API that aren't in defaults
        if (specialtiesData.length > 0) {
          specialtiesData.forEach(spec => {
            const specLabel = typeof spec === 'string' ? spec : spec.label || spec.name
            const specialtyKey = specLabel.toLowerCase()
            if (!specialtiesWithCounts.find(s => s.label.toLowerCase() === specialtyKey)) {
              const count = specialtyMap.get(specialtyKey) || 0
              specialtiesWithCounts.push({
                id: specialtyKey.replace(/\s+/g, '_'),
                label: specLabel,
                icon: TbStethoscope,
                gradient: 'from-[#0077C2] to-indigo-500',
                bgGradient: 'bg-gradient-to-br from-[rgba(0,119,194,0.1)] to-indigo-50',
                iconBg: 'bg-gradient-to-br from-[rgba(0,119,194,0.1)] to-indigo-50',
                textColor: 'text-indigo-600',
                shadowColor: 'shadow-[rgba(0,119,194,0.1)]',
                doctorCount: count,
              })
            }
          })
        }
        
        setSpecialtiesList(specialtiesWithCounts)
      } catch (err) {
        console.error('Error fetching specialties:', err)
        setError(err.message || 'Failed to load specialties')
        toast.error('Failed to load specialties')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

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
          <h1 className="text-2xl font-bold text-slate-900">Doctor Specialities</h1>
          <p className="text-sm text-slate-600">{specialties.length} specialities available</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-slate-600">Loading specialties...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-red-600">Error: {error}</p>
          <p className="mt-1 text-xs text-red-500">Please try again later.</p>
        </div>
      )}

      {/* Specialties Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-3">
          {specialtiesList.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-slate-600">No specialties found</p>
              <p className="mt-1 text-xs text-slate-500">No specialties available at the moment.</p>
            </div>
          ) : (
            specialtiesList.map(({ id, label, icon: Icon, gradient, iconBg, textColor, shadowColor, doctorCount }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(`/patient/specialties/${id}/doctors`)}
            className="group relative flex flex-col items-center gap-2.5 p-4 transition-all active:scale-95"
          >
            <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl ${iconBg} shadow-md ${shadowColor} transition-transform group-hover:scale-110`}>
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${gradient} opacity-0 transition-opacity group-hover:opacity-10`} />
              <Icon className={`relative text-xl ${textColor} transition-transform group-hover:scale-110`} aria-hidden="true" />
            </div>
            <span className={`text-xs font-semibold ${textColor} transition-colors text-center`}>{label}</span>
            <span className="text-[10px] font-medium text-slate-500">{doctorCount} doctor{doctorCount !== 1 ? 's' : ''}</span>
          </button>
            ))
          )}
        </div>
      )}
    </section>
  )
}

export default PatientSpecialties

