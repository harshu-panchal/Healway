import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IoArrowBackOutline,
  IoPulseOutline,
  IoHeartOutline,
  IoArrowForwardOutline,
} from 'react-icons/io5'
import { TbStethoscope, TbVaccine } from 'react-icons/tb'
import { MdOutlineEscalatorWarning } from 'react-icons/md'
import WebNavbar from '../web-components/WebNavbar'
import WebFooter from '../web-components/WebFooter'
import { ApiClient, getFileUrl } from '../../../utils/apiClient'

const Specialization = () => {
  const navigate = useNavigate()
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        setLoading(true)
        const publicClient = new ApiClient('public')
        const data = await publicClient.get('/specialties')
        if (data.success) {
          setSpecialties(data.data)
        } else {
          throw new Error(data.message || 'Failed to fetch specializations')
        }
      } catch (err) {
        console.error('Error fetching specializations:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSpecialties()
  }, [])

  const getIcon = (name) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('cardio')) return IoHeartOutline
    if (lowerName.includes('dentist')) return TbStethoscope
    if (lowerName.includes('ortho')) return MdOutlineEscalatorWarning
    if (lowerName.includes('neuro')) return IoPulseOutline
    if (lowerName.includes('vaccine')) return TbVaccine
    return TbStethoscope
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  return (
    <div className="min-h-screen bg-white">
      <WebNavbar />

      <section className="pt-24 pb-12 md:pt-32 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
            <div className="space-y-2">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all duration-200 mb-4"
              >
                <IoArrowBackOutline className="text-xl" />
                <span>Back to Home</span>
              </button>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                Choose a <span className="text-primary">Specialization</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                Select the type of care you need to find the right healthcare provider for you.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Loading specializations...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-100">
              <p className="text-red-600 font-medium mb-4">Error: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold"
              >
                Try Again
              </button>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {specialties.map((specialty) => {
                const Icon = getIcon(specialty.name)
                const iconUrl = specialty.icon ? getFileUrl(specialty.icon) : null

                return (
                  <motion.div
                    key={specialty._id}
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    onClick={() => navigate('/onboarding', { 
                      state: { 
                        initialRole: 'patient',
                        specialty: specialty.name 
                      } 
                    })}
                    className="group cursor-pointer bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors duration-300 overflow-hidden">
                      {iconUrl ? (
                        <img 
                          src={iconUrl} 
                          alt={specialty.name}
                          className="w-full h-full object-cover p-2"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'block'
                          }}
                        />
                      ) : null}
                      <Icon 
                        className="text-4xl text-primary" 
                        style={{ display: iconUrl ? 'none' : 'block' }}
                      />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                      {specialty.name}
                    </h3>
                    <p className="text-slate-600 text-sm mb-6 line-clamp-3 flex-grow">
                      {specialty.description || `Consult with experienced ${specialty.name} specialists for your healthcare needs.`}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">
                          {specialty.doctorCount || 0}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          Doctors Available
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-primary font-bold text-sm">
                        <span>Select</span>
                        <IoArrowForwardOutline className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {!loading && !error && specialties.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-600">No specializations found. Please check back later.</p>
            </div>
          )}
        </div>
      </section>

      <WebFooter />
    </div>
  )
}

export default Specialization
