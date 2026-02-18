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

  const handleCardClick = (doctorId) => {
    navigate(`/patient/doctors/${doctorId}`)
  }

  return (
    <section className="flex flex-col gap-4 pb-4">
      {/* Search Bar - Outside Card */}
      <div className="relative">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-primary)' }}>
            <IoSearchOutline className="h-5 w-5" aria-hidden="true" />
          </span>
          <input
            id="doctor-search"
            type="text"
            placeholder="Search by name, specialty, or location..."
            className="w-full rounded-lg border bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:bg-white hover:shadow-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-base"
            style={{ borderColor: 'var(--color-primary-border)' }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-primary)'
              e.target.style.boxShadow = '0 0 0 2px var(--color-primary-border)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-primary-border)'
              e.target.style.boxShadow = ''
            }}
            onMouseEnter={(e) => {
              if (document.activeElement !== e.target) {
                e.target.style.borderColor = 'rgba(0, 119, 194, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (document.activeElement !== e.target) {
                e.target.style.borderColor = 'var(--color-primary-border)'
              }
            }}
            value={searchTerm}
            onChange={(e) => {
              const value = e.target.value
              setSearchTerm(value)
            }}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Specialty Filters - Scrollable Cards */}
      <div className="flex gap-4 overflow-x-auto pb-3 mx-1 px-1 scrollbar-hide [-webkit-overflow-scrolling:touch]">
        {specialtiesList.map((specialty) => {
          const Icon = specialty.icon
          const isSelected = selectedSpecialty === specialty.name
          return (
            <div
              key={specialty.id}
              onClick={() => setSelectedSpecialty(isSelected ? 'all' : specialty.name)}
              className={`flex-shrink-0 w-28 bg-white rounded-2xl p-3 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-[0.95] flex flex-col items-center text-center group ${isSelected
                ? 'border-2 shadow-md'
                : 'border border-slate-100 hover:border-primary/20'
                }`}
              style={isSelected ? { borderColor: 'var(--color-primary)', boxShadow: '0 4px 12px -2px var(--color-primary-border)' } : {}}
            >
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-2 transition-colors ${isSelected ? 'bg-primary/15' : 'bg-primary/5 group-hover:bg-primary/10'
                  }`}
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
                  <Icon className="w-7 h-7 text-primary" aria-hidden="true" />
                )}
              </div>
              <h3 className={`text-[11px] font-semibold leading-snug line-clamp-2 ${isSelected ? 'text-primary' : 'text-slate-700'
                }`}>
                {specialty.label}
              </h3>
            </div>
          )
        })}
      </div>

      {/* City Filter - Scrollable pills */}
      {availableCities.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch]">
          <button
            onClick={() => setSelectedCity('all')}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedCity === 'all'
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
          >
            All Cities
          </button>
          {availableCities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(selectedCity === city ? 'all' : city)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedCity === city
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">Loading doctors...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-medium text-red-600">Error: {error}</p>
          <p className="mt-1 text-xs text-red-500">Please try again later.</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-600">No doctors found matching your criteria.</p>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedDoctors.map((doctor) => {
            const handleCardClickInner = (e) => {
              e.stopPropagation();
              if (doctor.id || doctor._id) {
                navigate(`/patient/doctors/${doctor.id || doctor._id}`)
              } else {
                toast.error('Doctor details unavailable');
              }
            }

            return (
              <div
                key={doctor.id || doctor._id || Math.random()}
                onClick={handleCardClickInner}
                className="group bg-white border border-slate-100 rounded-[24px] overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] cursor-pointer transition-all duration-300 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12)] hover:border-primary/30 hover:-translate-y-1.5 active:scale-[0.98]"
              >
                <div className="p-5 sm:p-6">
                  {/* Top Section: Info & Pricing */}
                  <div className="flex flex-col sm:flex-row gap-5">
                    {/* Left: Avatar & Main Info */}
                    <div className="flex gap-5 flex-1 items-center sm:items-start">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-primary/20 rounded-[22px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <img
                          src={doctor.image}
                          alt={doctor.name}
                          className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-[22px] object-cover ring-4 ring-white shadow-sm transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.name)}&background=0077C2&color=fff&size=200&bold=true`
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
                          <div className="flex flex-wrap items-center gap-2.5 mb-2">
                            <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight">
                              {doctor.name}
                            </h3>
                            {doctor.experience && doctor.experience !== 'N/A' && (
                              <span className="shrink-0 bg-blue-50 text-blue-600 text-[11px] font-black px-2.5 py-1 rounded-lg border border-blue-100/60 uppercase tracking-widest">
                                {doctor.experience} EXP
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-primary mb-3 flex items-center gap-1.5">
                            <span className="w-5 h-[2px] bg-primary/30 rounded-full" />
                            {doctor.specialty}
                          </p>

                          <div className="space-y-1.5">
                            {doctor.clinicName && (
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{doctor.clinicName}</p>
                              </div>
                            )}
                            <div className="flex items-start gap-2 text-slate-500">
                              <IoLocationOutline className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                              <p className="text-xs font-medium leading-relaxed line-clamp-2">{doctor.location}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Pricing Section */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-5 sm:pt-0 sm:pl-6 bg-slate-50/50 sm:bg-transparent -mx-5 sm:mx-0 px-5 sm:px-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Consultation Fee</p>
                        <div className="flex items-center sm:justify-end gap-2.5">
                          {doctor.discount_amount > 0 && doctor.original_fees > 0 && (
                            <span className="text-base line-through text-slate-300 font-bold italic">₹{doctor.original_fees}</span>
                          )}
                          <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{doctor.consultationFee}</span>
                        </div>
                        {doctor.discount_amount > 0 && (
                          <div className="flex items-center sm:justify-end mt-1.5">
                            <div className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm shadow-emerald-200">
                              <span>SAVE ₹{doctor.discount_amount}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-100/80 my-5" />

                  {/* Bottom Strip: Modes & CTA */}
                  <div className="flex flex-col md:flex-row items-center gap-5">
                    {/* Modes Badge List */}
                    <div className="flex flex-wrap gap-2.5 flex-1">
                      {(doctor.consultationModes && doctor.consultationModes.length > 0
                        ? Array.from(new Set(doctor.consultationModes))
                        : ['in_person']).map((mode, index) => {
                          let Icon, label, colorClass, bgClass;
                          switch (mode) {
                            case 'in_person': Icon = IoPeopleOutline; label = 'In-Clinic'; colorClass = 'text-purple-600'; bgClass = 'bg-purple-500/10'; break;
                            case 'video_call': Icon = IoVideocamOutline; label = 'Video'; colorClass = 'text-blue-600'; bgClass = 'bg-blue-500/10'; break;
                            case 'voice_call': case 'call': Icon = IoCallOutline; label = 'Audio'; colorClass = 'text-emerald-600'; bgClass = 'bg-emerald-500/10'; break;
                            default: return null;
                          }
                          return (
                            <div key={index} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl ${bgClass} ${colorClass} transition-all border border-transparent hover:border-current/20`}>
                              <Icon className="h-3.5 w-3.5" />
                              <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
                            </div>
                          );
                        })
                      }
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={handleCardClickInner}
                      className="w-full md:w-auto min-w-[200px] h-[52px] bg-primary text-white font-black py-4 px-8 rounded-2xl text-[13px] uppercase tracking-[0.1em] transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(0,119,194,0.5)] hover:bg-primary-dark hover:shadow-[0_15px_35px_-10px_rgba(0,119,194,0.6)] active:scale-95 flex items-center justify-center gap-3"
                    >
                      <span>Book Appointment</span>
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-[360deg] transition-transform duration-700">
                        <IoCalendarOutline className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  </div>

                  {/* Availability Notice */}
                  {doctor.availability.includes('today') && doctor.nextSlot && (
                    <div className="mt-5 p-3.5 bg-gradient-to-r from-emerald-50 to-white rounded-2xl border border-emerald-100/60 shadow-inner flex items-center gap-4">
                      <div className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-sm border-2 border-white"></span>
                      </div>
                      <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest leading-none">Status: Live Now</p>
                        <p className="text-xs font-bold text-slate-700">
                          Next Available: <span className="bg-white px-2 py-0.5 rounded shadow-sm text-primary">{doctor.nextSlot}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredDoctors.length > 0 && totalPages > 1 && (
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

export default PatientDoctors
