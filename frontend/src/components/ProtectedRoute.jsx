import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getAuthToken } from '../utils/apiClient'
import { useEffect, useState } from 'react'

/**
 * ProtectedRoute Component
 * Protects routes that require authentication
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children - Component to render if authenticated
 * @param {string} props.module - Module name (patient, doctor, admin)
 * @param {string} props.redirectTo - Path to redirect if not authenticated (default: /{module}/login)
 */
const ProtectedRoute = ({ children, module, redirectTo = null }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [hasToken, setHasToken] = useState(false)
  
  useEffect(() => {
    const token = getAuthToken(module)
    if (!token) {
      setHasToken(false)
      const loginPath = redirectTo || `/${module}/login`
      navigate(loginPath, { 
        replace: true, 
        state: { from: location.pathname } 
      })
    } else {
      setHasToken(true)
    }
    setIsChecking(false)
  }, [module, redirectTo, navigate, location.pathname])

  if (isChecking) {
    return null // Or a loading spinner
  }

  if (!hasToken) {
    return null // Will be handled by navigate in useEffect
  }

  // If token exists, render the protected component
  return children
}

export default ProtectedRoute

