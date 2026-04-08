import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { getAuthToken } from './utils/apiClient'
import { NotificationProvider } from './contexts/NotificationContext'
import { CallProvider } from './contexts/CallContext'
import PageLoader from './components/PageLoader'
import ProtectedRoute from './components/ProtectedRoute'
import { initializePushNotifications, setupForegroundNotificationHandler } from './services/pushNotificationService'

// Shared Components
import PatientNavbar from './modules/patient/patient-components/PatientNavbar'
import DoctorNavbar from './modules/doctor/doctor-components/DoctorNavbar'
import DoctorHeader from './modules/doctor/doctor-components/DoctorHeader'
import DoctorFooter from './modules/doctor/doctor-components/DoctorFooter'
import AdminNavbar from './modules/admin/admin-components/AdminNavbar'
import WebNavbar from './modules/website/web-components/WebNavbar'
import CallPopup from './modules/shared/CallPopup'
import IncomingCallNotification from './modules/shared/IncomingCallNotification'
import DoctorCallStatus from './modules/shared/DoctorCallStatus'

// --- Lazy loaded modules ---

// Patient Pages
const PatientDashboard = lazy(() => import('./modules/patient/patient-pages/PatientDashboard'))
const PatientDoctors = lazy(() => import('./modules/patient/patient-pages/PatientDoctors'))
const PatientDoctorDetails = lazy(() => import('./modules/patient/patient-pages/PatientDoctorDetails'))
const PatientProfile = lazy(() => import('./modules/patient/patient-pages/PatientProfile'))
const PatientLocations = lazy(() => import('./modules/patient/patient-pages/PatientLocations'))
const PatientPrescriptions = lazy(() => import('./modules/patient/patient-pages/PatientPrescriptions'))

const PatientSpecialties = lazy(() => import('./modules/patient/patient-pages/PatientSpecialties'))
const PatientSpecialtyDoctors = lazy(() => import('./modules/patient/patient-pages/PatientSpecialtyDoctors'))
const PatientUpcomingSchedules = lazy(() => import('./modules/patient/patient-pages/PatientUpcomingSchedules'))
const PatientTransactions = lazy(() => import('./modules/patient/patient-pages/PatientTransactions'))
const PatientTransactionDetail = lazy(() => import('./modules/patient/patient-pages/PatientTransactionDetail'))
const PatientAppointments = lazy(() => import('./modules/patient/patient-pages/PatientAppointments'))
const PatientAnnouncements = lazy(() => import('./modules/patient/patient-pages/PatientAnnouncements'))

const PatientSupport = lazy(() => import('./modules/patient/patient-pages/PatientSupport'))


// Doctor Pages
const DoctorLogin = lazy(() => import('./modules/doctor/doctor-pages/DoctorLogin'))
const DoctorDashboard = lazy(() => import('./modules/doctor/doctor-pages/DoctorDashboard'))
const DoctorProfile = lazy(() => import('./modules/doctor/doctor-pages/DoctorProfile'))
const DoctorWallet = lazy(() => import('./modules/doctor/doctor-pages/DoctorWallet'))
const WalletBalance = lazy(() => import('./modules/doctor/doctor-pages/WalletBalance'))
const WalletEarning = lazy(() => import('./modules/doctor/doctor-pages/WalletEarning'))
const WalletWithdraw = lazy(() => import('./modules/doctor/doctor-pages/WalletWithdraw'))
const WalletTransaction = lazy(() => import('./modules/doctor/doctor-pages/WalletTransaction'))
const DoctorConsultations = lazy(() => import('./modules/doctor/doctor-pages/DoctorConsultations'))
const DoctorPatients = lazy(() => import('./modules/doctor/doctor-pages/DoctorPatients'))
const DoctorAllPatients = lazy(() => import('./modules/doctor/doctor-pages/DoctorAllPatients'))
const DoctorAppointments = lazy(() => import('./modules/doctor/doctor-pages/DoctorAppointments'))
const DoctorAllConsultations = lazy(() => import('./modules/doctor/doctor-pages/DoctorAllConsultations'))
const DoctorAnnouncements = lazy(() => import('./modules/doctor/doctor-pages/DoctorAnnouncements'))
const DoctorSupport = lazy(() => import('./modules/doctor/doctor-pages/DoctorSupport'))
const DoctorSlotManagement = lazy(() => import('./modules/doctor/doctor-pages/DoctorSlotManagement'))
const PrivacyPolicy = lazy(() => import('./modules/doctor/doctor-pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./modules/doctor/doctor-pages/TermsOfService'))
const MedicalGuidelines = lazy(() => import('./modules/doctor/doctor-pages/MedicalGuidelines'))
const DoctorFAQ = lazy(() => import('./modules/doctor/doctor-pages/DoctorFAQ'))
const HIPAACompliance = lazy(() => import('./modules/doctor/doctor-pages/HIPAACompliance'))
const DataProtection = lazy(() => import('./modules/doctor/doctor-pages/DataProtection'))



// Admin Pages
const AdminLogin = lazy(() => import('./modules/admin/admin-pages/AdminLogin'))
const AdminDashboard = lazy(() => import('./modules/admin/admin-pages/AdminDashboard'))
const AdminUsers = lazy(() => import('./modules/admin/admin-pages/AdminUsers'))
const AdminDoctors = lazy(() => import('./modules/admin/admin-pages/AdminDoctors'))
const AdminAppointments = lazy(() => import('./modules/admin/admin-pages/AdminAppointments'))
const AdminRequests = lazy(() => import('./modules/admin/admin-pages/AdminRequests'))
const AdminRevenue = lazy(() => import('./modules/admin/admin-pages/AdminRevenue'))
const AdminWallet = lazy(() => import('./modules/admin/admin-pages/AdminWallet'))
const AdminProviderRevenue = lazy(() => import('./modules/admin/admin-pages/AdminProviderRevenue'))
const AdminProfile = lazy(() => import('./modules/admin/admin-pages/AdminProfile'))
const AdminSettings = lazy(() => import('./modules/admin/admin-pages/AdminSettings'))
const AdminLegalContent = lazy(() => import('./modules/admin/admin-pages/AdminLegalContent'))
const AdminSupport = lazy(() => import('./modules/admin/admin-pages/AdminSupport'))
const AdminVerification = lazy(() => import('./modules/admin/admin-pages/AdminVerification'))
const AdminAnnouncements = lazy(() => import('./modules/admin/admin-pages/AdminAnnouncements'))
const AdminSpecialization = lazy(() => import('./modules/admin/admin-pages/AdminSpecialization'))
const AdminLocationManagement = lazy(() => import('./modules/admin/admin-pages/AdminLocationManagement'))
const AdminServices = lazy(() => import('./modules/admin/admin-pages/AdminServices.jsx'))
const AdminForgotPassword = lazy(() => import('./modules/admin/admin-pages/AdminForgotPassword'))
const AdminVerifyOTP = lazy(() => import('./modules/admin/admin-pages/AdminVerifyOTP'))
const AdminResetPassword = lazy(() => import('./modules/admin/admin-pages/AdminResetPassword'))

// Shared/Website Pages
const NotificationsPage = lazy(() => import('./modules/shared/NotificationsPage'))
const Home = lazy(() => import('./modules/website/web-pages/Home'))
const WebOnBoarding = lazy(() => import('./modules/website/web-pages/WebOnBoarding'))

function PatientRoutes() {
  const location = useLocation()
  const isLoginPage = location.pathname === '/patient/login'
  const token = getAuthToken('patient')

  // If not authenticated and not on login page, redirect to patient login
  if (!token && !isLoginPage) {
    return <Navigate to="/patient/login" replace />
  }

  return (
    <NotificationProvider module="patient">
      {!isLoginPage && <PatientNavbar />}
      {!isLoginPage && <IncomingCallNotification />}
      <main className={isLoginPage ? '' : 'px-4 pb-24 pt-20 sm:px-6'}>
        <Routes>
          <Route path="/" element={
            token ? <ProtectedRoute module="patient"><Navigate to="/patient/dashboard" replace /></ProtectedRoute> : <Navigate to="/patient/login" replace />
          } />
          {/* Patient login (uses the shared auth page) */}
          <Route path="/login" element={
            <Suspense fallback={<PageLoader />}><DoctorLogin /></Suspense>
          } />
          <Route path="/dashboard" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientDashboard /></ProtectedRoute></Suspense>
          } />
          {/* Specific route must come before general route */}
          <Route path="/doctors/:id" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientDoctorDetails /></ProtectedRoute></Suspense>
          } />
          <Route path="/doctors" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientDoctors /></ProtectedRoute></Suspense>
          } />

          <Route path="/profile" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientProfile /></ProtectedRoute></Suspense>
          } />
          <Route path="/locations" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientLocations /></ProtectedRoute></Suspense>
          } />
          <Route path="/prescriptions" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientPrescriptions /></ProtectedRoute></Suspense>
          } />
          <Route path="/specialties" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientSpecialties /></ProtectedRoute></Suspense>
          } />
          <Route path="/specialties/:specialtyId/doctors" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientSpecialtyDoctors /></ProtectedRoute></Suspense>
          } />
          <Route path="/upcoming-schedules" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientUpcomingSchedules /></ProtectedRoute></Suspense>
          } />

          <Route path="/transactions" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientTransactions /></ProtectedRoute></Suspense>
          } />
          <Route path="/transactions/:id" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientTransactionDetail /></ProtectedRoute></Suspense>
          } />
          <Route path="/appointments" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientAppointments /></ProtectedRoute></Suspense>
          } />
          <Route path="/announcements" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientAnnouncements /></ProtectedRoute></Suspense>
          } />


          <Route path="/support" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><PatientSupport /></ProtectedRoute></Suspense>
          } />
          <Route path="/notifications" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="patient"><NotificationsPage /></ProtectedRoute></Suspense>
          } />
          <Route path="*" element={
            token ? <ProtectedRoute module="patient"><Navigate to="/patient/dashboard" replace /></ProtectedRoute> : <Navigate to="/patient/login" replace />
          } />
        </Routes>
        {/* Call Popup - Only for patients */}
        <CallPopup />
      </main>
    </NotificationProvider>
  )
}

function AdminRoutes() {
  const location = useLocation()
  const isPublicAdminPage = [
    '/admin/login',
    '/admin/forgot-password',
    '/admin/verify-otp',
    '/admin/reset-password'
  ].includes(location.pathname)
  const token = getAuthToken('admin')
  const isAuthenticated = !!token && !isPublicAdminPage

  // If not authenticated and not on a public admin page, force redirect to login
  if (!token && !isPublicAdminPage) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <NotificationProvider module="admin">
      {isAuthenticated && <AdminNavbar />}
      <main className={isPublicAdminPage ? '' : 'px-4 pb-24 pt-28 sm:px-6 lg:ml-64 transition-all duration-300'}>
        <Routes>
          {/* Public route - Login page */}
          <Route path="/login" element={
            <Suspense fallback={<PageLoader />}><AdminLogin /></Suspense>
          } />

          {/* Protected routes - All require authentication */}
          <Route path="/" element={
            token ? <ProtectedRoute module="admin"><Navigate to="/admin/dashboard" replace /></ProtectedRoute> : <Navigate to="/admin/login" replace />
          } />
          <Route path="/dashboard" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminDashboard /></ProtectedRoute></Suspense>
          } />
          <Route path="/users" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminUsers /></ProtectedRoute></Suspense>
          } />
          <Route path="/doctors" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminDoctors /></ProtectedRoute></Suspense>
          } />
          <Route path="/specialization" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminSpecialization /></ProtectedRoute></Suspense>
          } />
          <Route path="/locations" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminLocationManagement /></ProtectedRoute></Suspense>
          } />
          <Route path="/services" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminServices /></ProtectedRoute></Suspense>
          } />
          <Route path="/revenue" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminRevenue /></ProtectedRoute></Suspense>
          } />
          <Route path="/wallet" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminWallet /></ProtectedRoute></Suspense>
          } />

          <Route path="/revenue/:type" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminProviderRevenue /></ProtectedRoute></Suspense>
          } />
          <Route path="/verification" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminVerification /></ProtectedRoute></Suspense>
          } />
          <Route path="/announcements" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminAnnouncements /></ProtectedRoute></Suspense>
          } />
          <Route path="/appointments" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminAppointments /></ProtectedRoute></Suspense>
          } />

          <Route path="/profile" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminProfile /></ProtectedRoute></Suspense>
          } />
          <Route path="/support" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminSupport /></ProtectedRoute></Suspense>
          } />
          <Route path="/settings" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminSettings /></ProtectedRoute></Suspense>
          } />
          <Route path="/legal-content" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><AdminLegalContent /></ProtectedRoute></Suspense>
          } />
          <Route path="/notifications" element={
            <Suspense fallback={<PageLoader />}><ProtectedRoute module="admin"><NotificationsPage /></ProtectedRoute></Suspense>
          } />

          {/* Public Password Reset Routes */}
          <Route path="/forgot-password" element={
            <Suspense fallback={<PageLoader />}><AdminForgotPassword /></Suspense>
          } />
          <Route path="/verify-otp" element={
            <Suspense fallback={<PageLoader />}><AdminVerifyOTP /></Suspense>
          } />
          <Route path="/reset-password" element={
            <Suspense fallback={<PageLoader />}><AdminResetPassword /></Suspense>
          } />

          {/* Catch-all - redirect to login if not authenticated */}
          <Route path="*" element={
            token ? <ProtectedRoute module="admin"><Navigate to="/admin/dashboard" replace /></ProtectedRoute> : <Navigate to="/admin/login" replace />
          } />
        </Routes>
      </main>
    </NotificationProvider>
  )
}

function DoctorRoutes() {
  const location = useLocation()
  const forceLogin = new URLSearchParams(location.search).get('force') === '1'
  const isPublicDoctorPage = [
    '/doctor/login',
    '/doctor/signup',
    '/doctor/terms-of-service',
    '/doctor/privacy-policy',
  ].includes(location.pathname)
  const doctorToken = getAuthToken('doctor')
  const patientToken = getAuthToken('patient')
  const adminToken = getAuthToken('admin')

  // If already authenticated and on login page, redirect to the right dashboard
  if (!forceLogin && location.pathname === '/doctor/login') {
    if (doctorToken) return <Navigate to="/doctor/dashboard" replace />
    if (patientToken) return <Navigate to="/patient/dashboard" replace />
    if (adminToken) return <Navigate to="/admin/dashboard" replace />
  }

  // If already authenticated as a doctor and on signup page, redirect to dashboard
  if (!forceLogin && location.pathname === '/doctor/signup' && doctorToken) {
    return <Navigate to="/doctor/dashboard" replace />
  }

  return (
    <NotificationProvider module="doctor">
      {/* Mobile Navbar - Only visible on mobile/tablet */}
      {!isPublicDoctorPage && <DoctorNavbar />}

      {/* Desktop Header - Only visible on desktop */}
      {!isPublicDoctorPage && <DoctorHeader />}

      {/* Doctor Call Status Indicator */}
      {!isPublicDoctorPage && <DoctorCallStatus />}

      {/* Call Popup - For doctors to join WebRTC */}
      {!isPublicDoctorPage && <CallPopup />}

      <main className={isPublicDoctorPage ? '' : 'px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-8 lg:min-h-screen lg:flex lg:flex-col'}>
        <div className="max-w-7xl mx-auto w-full lg:flex-1">
          <Routes>
            <Route
              path="/"
              element={
                doctorToken ? (
                  <ProtectedRoute module="doctor">
                    <Navigate to="/doctor/dashboard" replace />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/doctor/login" replace />
                )
              }
            />
            <Route path="/login" element={
              <Suspense fallback={<PageLoader />}><DoctorLogin /></Suspense>
            } />
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorDashboard />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/wallet"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorWallet />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/wallet/balance"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <WalletBalance />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/wallet/earning"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <WalletEarning />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/wallet/withdraw"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <WalletWithdraw />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/wallet/transaction"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <WalletTransaction />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/patients"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorAllPatients />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/queue"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorPatients />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/all-patients"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorAllPatients />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/appointments"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorAppointments />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/all-consultations"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorAllConsultations />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/consultations"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorConsultations />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/announcements"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorAnnouncements />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/profile"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorProfile />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/support"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorSupport />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/slot-management"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorSlotManagement />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/notifications"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <NotificationsPage />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/faq"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DoctorFAQ />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/privacy-policy"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PrivacyPolicy role="doctor" />
                </Suspense>
              }
            />
            <Route
              path="/terms-of-service"
              element={
                <Suspense fallback={<PageLoader />}>
                  <TermsOfService role="doctor" />
                </Suspense>
              }
            />
            <Route
              path="/medical-guidelines"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <MedicalGuidelines />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/hipaa-compliance"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <HIPAACompliance />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="/data-protection"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ProtectedRoute module="doctor">
                    <DataProtection />
                  </ProtectedRoute>
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Navigate to={doctorToken ? "/doctor/dashboard" : "/doctor/login"} replace />
              }
            />
          </Routes>
        </div>
      </main>

      {/* Desktop Footer - Only visible on desktop */}
      {!isPublicDoctorPage && <DoctorFooter />}
    </NotificationProvider>
  )
}







function WebsiteRoutes() {
  return (
    <>
      <WebNavbar />
      <main>
        <Routes>
          <Route path="/" element={
            <Suspense fallback={<PageLoader />}><Home /></Suspense>
          } />
        </Routes>
      </main>
    </>
  )
}

function DefaultRedirect() {
  const patientToken = getAuthToken('patient')
  const doctorToken = getAuthToken('doctor')

  const adminToken = getAuthToken('admin')

  // If authenticated, redirect to respective dashboard
  if (patientToken) {
    return <Navigate to="/patient/dashboard" replace />
  }
  if (doctorToken) {
    return <Navigate to="/doctor/dashboard" replace />
  }

  if (adminToken) {
    return <Navigate to="/admin/dashboard" replace />
  }

  // Default to landing page for unauthenticated users
  return (
    <>
      <WebNavbar />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Home />
        </Suspense>
      </main>
    </>
  )
}

function App() {
  useEffect(() => {
    // Initialize push notifications: register service worker on app load
    initializePushNotifications()

    // Handle foreground push notifications (app is open)
    setupForegroundNotificationHandler((payload) => {
      // Foreground notifications are shown as browser Notification objects
      // by setupForegroundNotificationHandler itself.
      // Add any custom in-app toast or UI update here if needed.
      console.log('ðŸ“¬ Push notification received while app is open:', payload?.notification?.title)
    })
  }, [])

  return (
    <CallProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900">
          <Routes>
            {/* Patient Routes */}
            <Route path="/patient/*" element={<PatientRoutes />} />

            {/* Doctor Routes */}
            <Route path="/doctor/*" element={<DoctorRoutes />} />






            {/* Admin Routes */}
            <Route path="/admin/*" element={<AdminRoutes />} />

            {/* Website Routes - Landing Page */}
            <Route path="/website/*" element={<WebsiteRoutes />} />

            {/* Onboarding Route - No Navbar */}
            <Route path="/onboarding" element={
              <Suspense fallback={<PageLoader />}><WebOnBoarding /></Suspense>
            } />

            {/* Public legal pages used by signup flows */}
            <Route path="/terms" element={
              <Suspense fallback={<PageLoader />}><TermsOfService role="patient" /></Suspense>
            } />
            <Route path="/privacy" element={
              <Suspense fallback={<PageLoader />}><PrivacyPolicy role="patient" /></Suspense>
            } />

            {/* Default route - show landing page or redirect if authenticated */}
            <Route path="/" element={<DefaultRedirect />} />
          </Routes>
        </div>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          limit={1}
        />
      </Router>
    </CallProvider>
  )
}

export default App


