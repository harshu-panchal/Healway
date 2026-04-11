import { useNavigate } from 'react-router-dom'
import { IoArrowBackOutline } from 'react-icons/io5'
import DoctorLogin from '../../doctor/doctor-pages/DoctorLogin'
import WebFooter from '../web-components/WebFooter'
import onboardingImage from '../../../assets/images/img4.png'
import healwayLogo from '../../../assets/logo/healway-logo.png'

const WebOnBoarding = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row flex-1">
        <div className="relative order-1 flex w-full flex-col items-center justify-center bg-white p-8 md:sticky md:top-0 md:h-screen md:w-1/2 md:overflow-hidden">
          <button
            onClick={() => navigate('/')}
            className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-primary transition-all duration-200 hover:scale-105 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/30 md:left-8 md:top-8"
            aria-label="Back to home"
          >
            <IoArrowBackOutline className="h-5 w-5" />
            <span className="hidden text-sm font-semibold sm:inline">Back to Home</span>
          </button>

          <div className="mb-8 md:mb-12">
            <img src={healwayLogo} alt="Healway Logo" className="h-12 w-auto object-contain md:h-16" />
          </div>
          <img
            src={onboardingImage}
            alt="Healthcare Onboarding"
            className="h-auto w-full max-w-xs object-contain md:max-w-lg"
          />
        </div>

        <div className="order-2 flex w-full items-start justify-center overflow-y-auto bg-primary px-6 py-8 sm:px-8 lg:px-12 md:h-screen md:w-1/2">
          <div className="w-full">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">Join Healway</h1>
              <p className="text-sm text-white/80 sm:text-base">Start your healthcare journey with us</p>
            </div>

            <DoctorLogin embedded initialMode="signup" initialRole="patient" />
          </div>
        </div>
      </div>
      <WebFooter />
    </div>
  )
}

export default WebOnBoarding
