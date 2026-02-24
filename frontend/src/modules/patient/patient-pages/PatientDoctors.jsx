import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  IoSearchOutline,
  IoLocationOutline,
  IoTimeOutline,
  IoPulseOutline,
  IoHeartOutline,
  IoImageOutline,
  IoStar,
  IoVideocamOutline,
  IoCallOutline,
  IoChatbubbleOutline,
  IoPeopleOutline,
  IoCalendarOutline,
} from 'react-icons/io5'
import { TbStethoscope } from 'react-icons/tb'
import { MdOutlineEscalatorWarning } from 'react-icons/md'
import { getDiscoveryDoctors, getSpecialties } from '../patient-services/patientService'
import { getFileUrl } from '../../../utils/apiClient'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

// Default specialties (will be replaced by API data)
const defaultSpecialties = [
  { id: 'all', label: 'All Specialties', icon: TbStethoscope },
  { id: 'dentist', label: 'Dentist', icon: TbStethoscope },
  { id: 'cardio', label: 'Cardiology', icon: IoHeartOutline },
  { id: 'ortho', label: 'Orthopedic', icon: MdOutlineEscalatorWarning },
  { id: 'neuro', label: 'Neurology', icon: IoPulseOutline },
  { id: 'general', label: 'General', icon: TbStethoscope },
]

// Default doctors (will be replaced by API data)
const defaultDoctors = []


// Helper function to check if doctor is active
const isDoctorActive = (doctorName) => {
  try {
    const saved = localStorage.getItem('doctorProfile')
    if (saved) {
      const profile = JSON.parse(saved)
      const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
      // Check if this doctor matches the saved profile
      if (doctorName.includes(profile.firstName) || doctorName.includes(profile.lastName) || doctorName === fullName) {
        return profile.isActive !== false // Default to true if not set
      }
    }
    // Check separate active status
    const activeStatus = localStorage.getItem('doctorProfileActive')
    if (activeStatus !== null && saved) {
      const isActive = JSON.parse(activeStatus)
      const profile = JSON.parse(saved)
      const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
      if (doctorName.includes(profile.firstName) || doctorName.includes(profile.lastName) || doctorName === fullName) {
        return isActive
      }
    }
  } catch (error) {
    console.error('Error checking doctor active status:', error)
  }
  // Default: show all doctors if no profile found (for mock data)
  return true
}

const PatientDoctors = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState('all')
  const [doctors, setDoctors] = useState(defaultDoctors)
  const [specialtiesList, setSpecialtiesList] = useState(defaultSpecialties)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCity, setSelectedCity] = useState('all') // For filtering doctors by city
  const sortBy = 'relevance' // Default sort: by relevance
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch specialties from API
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const response = await getSpecialties()
        // getSpecialties returns response.data which is the specialties array
        const specialtiesData = Array.isArray(response) ? response : []

        if (specialtiesData.length > 0) {
          const formattedSpecialties = [
            { id: 'all', label: 'All Specialties', icon: TbStethoscope, name: 'all' },
            ...specialtiesData.map(s => ({
              id: s._id || s.id,
              label: s.name,
              name: s.name,
              icon: TbStethoscope,
              // Use uploaded icon if available
              iconUrl: s.icon
            }))
          ]
          setSpecialtiesList(formattedSpecialties)
        }
      } catch (err) {
        console.error('Error fetching specialties:', err)
      }
    }
    fetchSpecialties()
  }, [])

  // Handle URL params - normalize to name
  useEffect(() => {
    const specialtyFromUrl = searchParams.get('specialty')
    if (specialtyFromUrl) {
      // Decode URI component just in case
      const decoded = decodeURIComponent(specialtyFromUrl)
      setSelectedSpecialty(decoded)
    } else {
      setSelectedSpecialty('all')
    }
  }, [searchParams])

  // Fetch doctors based on selected specialty (name) and search term
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const filters = {
          limit: 1000,
          page: 1,
          _t: Date.now(),
        }

        // Apply filters
        if (selectedSpecialty && selectedSpecialty !== 'all') {
          filters.specialty = selectedSpecialty
        }

        if (searchTerm && searchTerm.trim()) {
          filters.search = searchTerm.trim()
        }

        const doctorsResponseData = await getDiscoveryDoctors(filters)

        if (doctorsResponseData) {
          let doctorsData = []
          if (Array.isArray(doctorsResponseData)) {
            doctorsData = doctorsResponseData
          } else if (doctorsResponseData.items) {
            doctorsData = doctorsResponseData.items
          }

          const transformed = doctorsData.map((doctor) => {
            // ... existing transformation logic ...
            // Helper to format address
            const formatFullAddress = (clinicDetails) => {
              if (!clinicDetails) return 'Location not available'
              const parts = []
              if (clinicDetails.name) parts.push(clinicDetails.name)
              if (clinicDetails.address) {
                const addr = clinicDetails.address
                if (addr.line1) parts.push(addr.line1)
                if (addr.city) parts.push(addr.city)
                if (addr.state) parts.push(addr.state)
              }
              return parts.length > 0 ? parts.join(', ') : 'Location not available'
            }

            return {
              id: doctor._id || doctor.id,
              _id: doctor._id || doctor.id,
              name: doctor.firstName && doctor.lastName
                ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                : doctor.name || 'Dr. Unknown',
              specialty: doctor.specialization || doctor.specialty || 'General',
              experience: doctor.experienceYears
                ? `${doctor.experienceYears} years`
                : doctor.experience || 'N/A',
              consultationFee: doctor.fees?.inPerson?.final !== undefined ? doctor.fees.inPerson.final : (doctor.consultationFee || 0),
              original_fees: doctor.fees?.inPerson?.original || doctor.original_fees || 0,
              discount_amount: doctor.fees?.inPerson?.discount || doctor.discount_amount || 0,
              distance: doctor.distance || 'N/A',
              location: formatFullAddress(doctor.clinicDetails),
              clinicName: doctor.clinicDetails?.name || '',
              // Add other necessary fields
              image: doctor.profileImage ? getFileUrl(doctor.profileImage) : null,
              clinicImages: doctor.clinicDetails?.images ? doctor.clinicDetails.images.map(img => getFileUrl(img.url || img)) : [],
              availability: 'Available',
              nextSlot: 'Today, 2:00 PM', // Mock for now
              consultationModes: doctor.consultationModes || ['in_person'],
              isFeatured: !!doctor.isFeatured,
              city: doctor.clinicDetails?.address?.city || '',
            }
          })

          setDoctors(transformed)
        } else {
          setDoctors([])
        }
      } catch (err) {
        console.error('Error fetching doctors:', err)
        setError(err.message || 'Failed to load doctors')
        setDoctors([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedSpecialty, searchTerm])


  // Extract unique cities from doctors
  const availableCities = useMemo(() => {
    const citySet = new Set()
    doctors.forEach((doctor) => {
      const city = (doctor.city || '').trim()
      if (city) {
        citySet.add(city)
      }
    })
    return Array.from(citySet).sort()
  }, [doctors])

  const filteredDoctors = useMemo(() => {
    let filtered = [...doctors] // Start with fetched doctors

    // Client-side filtering as backup or refinement
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(d => {
        const s = (d.specialty || '').toLowerCase()
        const target = selectedSpecialty.toLowerCase()
        return s.includes(target) || target.includes(s)
      })
    }

    // Filter by selected city
    if (selectedCity && selectedCity !== 'all') {
      filtered = filtered.filter(d => {
        const city = (d.city || '').trim().toLowerCase()
        return city === selectedCity.toLowerCase()
      })
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(term) ||
        d.specialty.toLowerCase().includes(term) ||
        d.location.toLowerCase().includes(term)
      )
    }

    return filtered.sort((a, b) => {
      // ... existing sort logic ...
      if (sortBy === 'fee-low') return a.consultationFee - b.consultationFee
      if (sortBy === 'fee-high') return b.consultationFee - a.consultationFee
      return 0
    })
  }, [doctors, searchTerm, selectedSpecialty, selectedCity, sortBy])

  // Calculate paginated doctors
  const paginatedDoctors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredDoctors.slice(startIndex, endIndex)
  }, [filteredDoctors, currentPage])

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage)
  const totalItems = filteredDoctors.length

  // Reset to page 1 when search, specialty, or city changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedSpecialty, selectedCity])

  const handleSpecialtyClick = (specialty) => {
    if (specialty.id === 'all') {
      // If 'All' is clicked, we could either show all doctors or keep them on this page.
      // The user wants to go to a doctor list page. 
      // Let's navigate to the specialty doctors page with 'all' as ID if supported.
      navigate(`/patient/specialties/all/doctors`)
    } else {
      navigate(`/patient/specialties/${specialty.id}/doctors`)
    }
  }

  return (
    <section className="flex flex-col gap-6 pb-6 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Find Your Doctor</h1>
        <p className="text-sm text-slate-600">Choose a specialty to see available doctors</p>
      </div>

      {/* Specialty Grid - 2 Columns, Scrollable */}
      <div className="grid grid-cols-2 gap-4 pb-4 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-hide">
        {specialtiesList.map((specialty) => {
          const Icon = specialty.icon
          const isSelected = selectedSpecialty === specialty.name
          return (
            <div
              key={specialty.id}
              onClick={() => handleSpecialtyClick(specialty)}
              className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-lg hover:border-primary/20 active:scale-[0.95] flex flex-col items-center text-center group"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 bg-primary/5 group-hover:bg-primary/10 transition-colors"
              >
                {specialty.iconUrl ? (
                  <img
                    src={getFileUrl(specialty.iconUrl)}
                    alt={specialty.label}
                    className="w-10 h-10 object-contain"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = '<div class="text-primary"><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="2em" width="2em"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><path d="M22 10 A2 2 0 0 1 20 12 A2 2 0 0 1 18 10 A2 2 0 0 1 22 10 z"/></svg></div>'
                    }}
                  />
                ) : (
                  <Icon className="w-8 h-8 text-primary" aria-hidden="true" />
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-800 leading-snug">
                {specialty.label}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                Explore Doctors
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default PatientDoctors
