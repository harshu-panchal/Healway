import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  IoHeartOutline,
  IoCalendarOutline,
  IoDocumentsOutline,
  IoShieldCheckmarkOutline,
  IoCheckmarkCircleOutline,
  IoArrowForwardOutline,
  IoTimeOutline,
  IoChevronDownOutline,
  IoWalletOutline,
  IoNotificationsOutline,
} from 'react-icons/io5'
import {
  FaUserMd,
  FaStethoscope,
  FaChartLine,
  FaUserCheck,
  FaShieldAlt,
  FaGooglePlay,
} from 'react-icons/fa'
import {
  HiOutlineCalendar,
  HiOutlineChartBar,
} from 'react-icons/hi'
import WebNavbar from '../web-components/WebNavbar'
import WebFooter from '../web-components/WebFooter'
import DoctorBenefitsCarousel from '../web-components/DoctorBenefitsCarousel'
import heroImage from '../../../assets/images/img1.png'
import featuresImage from '../../../assets/images/img5.png'
import doctorImage from '../../../assets/images/img2.png'

import healwayLogo from '../../../assets/logo/healway-logo.png'

const Home = () => {
  const navigate = useNavigate()

  const scrollToSection = (sectionId) => {
    const element = document.querySelector(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const features = [
    {
      icon: FaStethoscope,
      title: 'Online Consultations',
      keyPoints: ['Video & Audio Calls', '24/7 Available', 'Instant Prescriptions'],
      color: 'blue',
    },
    {
      icon: IoCalendarOutline,
      title: 'Easy Appointments',
      keyPoints: ['Flexible Scheduling', 'Smart Reminders', 'Reschedule Anytime'],
      color: 'green',
    },
    {
      icon: IoDocumentsOutline,
      title: 'Health Records',
      keyPoints: ['Secure Storage', 'Easy Access', 'Share Anytime'],
      color: 'indigo',
    },
    {
      icon: IoShieldCheckmarkOutline,
      title: 'Secure & Private',
      keyPoints: ['HIPAA Compliant', 'Encrypted Data', 'Privacy First'],
      color: 'red',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <WebNavbar />

      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden pt-16 md:pt-20"
        style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 md:pt-12 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-left space-y-6 md:space-y-8"
            >
              <div className="space-y-4 md:space-y-6">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight">
                  Your Health,{' '}
                  <span className="text-primary">Simplified</span>
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-slate-600 leading-relaxed max-w-xl">
                  Connect with trusted doctors and manage your health. All in one place.
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-start gap-4 pt-4"
              >
                <button
                  onClick={() => navigate('/specializations')}
                  className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 hover:bg-primary-dark"
                >
                  <span>Get Started</span>
                  <IoArrowForwardOutline className="text-xl" />
                </button>
                <button
                  onClick={() => scrollToSection('#features')}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-primary rounded-xl text-lg font-semibold border-2 border-primary hover:bg-primary/5 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>Learn More</span>
                  <IoChevronDownOutline className="text-xl" />
                </button>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className="flex items-center justify-center lg:justify-end"
            >
              <img
                src={heroImage}
                alt="Healthcare Services"
                className="w-full h-auto object-contain"
              />
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden md:block">
          <IoChevronDownOutline className="text-3xl text-primary animate-bounce" />
        </div>
      </section>

      {/* App Coming Soon Section */}
      <section className="relative py-12 md:py-16 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 right-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center lg:text-left space-y-4 order-2 lg:order-1"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                <IoNotificationsOutline className="text-base" />
                <span>Mobile App Launching Soon</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                Get Our{' '}
                <span className="text-primary">Mobile App</span>
                <br />
                on Your Device
              </h2>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
                Experience seamless healthcare management with our mobile app. Available for patients and healthcare providers.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
                <div className="group relative flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl shadow-lg overflow-hidden opacity-75 cursor-default">
                  <FaGooglePlay className="text-xl shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] text-white/80">Patient App</div>
                    <div className="text-sm font-bold leading-none">Google Play</div>
                  </div>
                </div>

                <div className="group relative flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl shadow-lg overflow-hidden opacity-75 cursor-default">
                  <FaGooglePlay className="text-xl shrink-0" />
                  <div className="text-left">
                    <div className="text-[10px] text-white/80">Provider App</div>
                    <div className="text-sm font-bold leading-none">Google Play</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <IoCheckmarkCircleOutline className="text-green-500 text-base" />
                  <span>For Patients</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <IoCheckmarkCircleOutline className="text-green-500 text-base" />
                  <span>For Doctors</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
              className="relative flex items-center justify-center order-1 lg:order-2"
            >
              <div className="relative w-full max-w-[180px] mx-auto">
                <div className="relative mx-auto">
                  <div className="relative bg-slate-900 rounded-[1.5rem] p-1 shadow-2xl">
                    <div className="bg-white rounded-[1.25rem] overflow-hidden">
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-14 h-2.5 bg-slate-900 rounded-b-sm z-10" />
                      <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 aspect-[9/19.5] flex flex-col">
                        <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 text-[8px] text-slate-600">
                          <span>9:41</span>
                          <div className="flex items-center gap-0.5">
                            <div className="w-1.5 h-0.5 border border-slate-600 rounded-sm">
                              <div className="w-1 h-full bg-slate-600 rounded-sm" />
                            </div>
                            <div className="w-2 h-0.5 border border-slate-600 rounded-sm">
                              <div className="w-1.5 h-full bg-slate-600 rounded-sm" />
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center px-2.5 space-y-2.5">
                          <div className="relative">
                            <div className="absolute inset-0 bg-primary/10 rounded-lg blur-lg" />
                            <div className="relative bg-white rounded-lg p-2.5 shadow-lg">
                              <img
                                src={healwayLogo}
                                alt="Healway Logo"
                                className="w-12 h-12 object-contain"
                              />
                            </div>
                          </div>

                          <div className="text-center space-y-0.5">
                            <h3 className="text-sm font-bold text-slate-900">Healway</h3>
                            <p className="text-[8px] text-slate-600">Your Health Companion</p>
                          </div>

                          <div className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-white/50">
                            <div className="flex items-center gap-0.5 text-slate-700">
                              <IoNotificationsOutline className="text-blue-500 text-[9px]" />
                              <span className="font-semibold text-[8px]">Launching Soon</span>
                            </div>
                          </div>
                        </div>

                        <div className="px-2.5 pb-1.5 pt-1 border-t border-slate-200/50">
                          <div className="h-0.5 w-10 bg-slate-300 rounded-full mx-auto" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-10 h-10 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need for{' '}
              <span className="text-primary">Better Health</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Comprehensive healthcare services at your fingertips, designed to make your health journey seamless and convenient.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex items-center justify-center lg:justify-start order-2 lg:order-1"
            >
              <img
                src={featuresImage}
                alt="Healthcare Features"
                className="w-full max-w-sm h-auto object-contain"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="order-1 lg:order-2"
            >
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="grid grid-cols-2 gap-3"
              >
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="group relative bg-white rounded-lg p-3 shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                  >
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${feature.color === 'blue' ? 'bg-gradient-to-br from-blue-50/30 to-transparent' :
                      feature.color === 'green' ? 'bg-gradient-to-br from-green-50/30 to-transparent' :
                        feature.color === 'indigo' ? 'bg-gradient-to-br from-indigo-50/30 to-transparent' :
                          'bg-gradient-to-br from-red-50/30 to-transparent'
                      }`} />

                    <div className="relative z-10">
                      <div className={`inline-flex p-2 rounded-lg mb-2 shadow-sm transition-transform duration-300 group-hover:scale-110 ${feature.color === 'blue' ? 'bg-gradient-to-br from-blue-100 to-blue-50' :
                        feature.color === 'green' ? 'bg-gradient-to-br from-green-100 to-green-50' :
                          feature.color === 'indigo' ? 'bg-gradient-to-br from-indigo-100 to-indigo-50' :
                            'bg-gradient-to-br from-red-100 to-red-50'
                        }`}>
                        <feature.icon className={`text-xl drop-shadow-sm transition-all duration-300 group-hover:drop-shadow-md ${feature.color === 'blue' ? 'text-blue-600' :
                          feature.color === 'green' ? 'text-green-600' :
                            feature.color === 'indigo' ? 'text-indigo-600' :
                              'text-red-600'
                          }`} />
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mb-1.5 transition-colors duration-300 group-hover:text-primary">
                        {feature.title}
                      </h3>

                      <ul className="space-y-1">
                        {feature.keyPoints.map((point, idx) => (
                          <li
                            key={point}
                            className="flex items-center gap-1.5 text-xs text-slate-600 transition-transform duration-200 group-hover:translate-x-1"
                            style={{ transitionDelay: `${idx * 30}ms` }}
                          >
                            <IoCheckmarkCircleOutline className="text-green-500 shrink-0 text-xs transition-transform duration-200 group-hover:scale-110" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center mt-12"
          >
            <button
              onClick={() => navigate('/specializations')}
              className="px-8 py-4 bg-primary text-white rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <span>Get Started</span>
              <IoArrowForwardOutline className="text-xl" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* For Doctors Section */}
      <section
        id="doctors"
        className="py-20 md:py-32 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom right, #0077C2, #005a9e)',
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center justify-center p-3 bg-white/20 rounded-full mb-6">
              <FaUserMd className="text-4xl" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Join Healway as a Doctor
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Expand your practice and reach more patients. Manage consultations, appointments, and earnings all in one platform.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
          >
            <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
              <DoctorBenefitsCarousel
                items={[
                  {
                    icon: HiOutlineCalendar,
                    title: 'Flexible Schedule',
                    description: 'Set your own availability and manage appointments efficiently.',
                  },
                  {
                    icon: FaChartLine,
                    title: 'Grow Your Practice',
                    description: 'Reach thousands of patients looking for quality healthcare.',
                  },
                  {
                    icon: IoShieldCheckmarkOutline,
                    title: 'Secure Platform',
                    description: 'HIPAA-compliant platform with encrypted patient data.',
                  },
                  {
                    icon: IoWalletOutline,
                    title: 'Easy Payments',
                    description: 'Get paid securely and on time directly to your bank account.',
                  },
                  {
                    icon: HiOutlineChartBar,
                    title: 'Analytics Dashboard',
                    description: 'Monitor your practice performance with detailed insights.',
                  },
                  {
                    icon: FaUserCheck,
                    title: 'Patient Management',
                    description: 'Access patient history and medical records centrally.',
                  },
                ]}
                baseWidth={320}
                autoplay={true}
                autoplayDelay={3500}
                pauseOnHover={true}
                loop={true}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center justify-center lg:justify-end order-1 lg:order-2"
            >
              <img
                src={doctorImage}
                alt="Doctor Dashboard"
                className="w-full max-w-md lg:max-w-lg h-auto object-contain"
              />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-12"
          >
            <button
              onClick={() => navigate('/onboarding')}
              className="px-8 py-4 bg-white text-primary rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <span>Join as Doctor</span>
              <IoArrowForwardOutline className="text-xl" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Healway Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Why Choose <span className="text-primary">Healway</span>?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We're committed to making healthcare accessible, convenient, and reliable for everyone.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
          >
            {[
              {
                icon: FaShieldAlt,
                title: 'Verified Providers',
                description: 'All doctors are verified and licensed medical professionals.',
                color: 'blue',
              },
              {
                icon: IoTimeOutline,
                title: '24/7 Availability',
                description: 'Access healthcare services anytime, anywhere.',
                color: 'green',
              },
              {
                icon: IoShieldCheckmarkOutline,
                title: 'Secure & Private',
                description: 'Your data is encrypted and protected with HIPAA compliance.',
                color: 'purple',
              },
              {
                icon: IoHeartOutline,
                title: 'Patient First',
                description: 'Our platform is designed with your health and convenience in mind.',
                color: 'red',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                <motion.div
                  className="relative h-full bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 overflow-hidden cursor-pointer"
                  whileHover={{ y: -8, scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div className="relative z-10 text-center">
                    <motion.div
                      className={`inline-flex p-4 rounded-2xl mb-4 shadow-md ${feature.color === 'blue' ? 'bg-gradient-to-br from-blue-100 to-blue-50' :
                        feature.color === 'green' ? 'bg-gradient-to-br from-green-100 to-green-50' :
                          feature.color === 'purple' ? 'bg-gradient-to-br from-purple-100 to-purple-50' :
                            'bg-gradient-to-br from-red-100 to-red-50'
                        }`}
                    >
                      <feature.icon className={`text-4xl ${feature.color === 'blue' ? 'text-blue-600' :
                        feature.color === 'green' ? 'text-green-600' :
                          feature.color === 'purple' ? 'text-purple-600' :
                            'text-red-600'
                        }`} />
                    </motion.div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <WebFooter />
    </div>
  )
}

export default Home
