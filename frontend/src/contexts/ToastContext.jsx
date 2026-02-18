import { createContext, useContext, useCallback } from 'react'
import toast from '../utils/toastUtils'

const ToastContext = createContext(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }) => {
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    switch (type) {
      case 'success':
        return toast.success(message, { autoClose: duration })
      case 'error':
        return toast.error(message, { autoClose: duration })
      case 'warning':
        return toast.warning(message, { autoClose: duration })
      default:
        return toast.info(message, { autoClose: duration })
    }
  }, [])

  const success = useCallback((message, duration) => {
    return toast.success(message, { autoClose: duration })
  }, [])

  const error = useCallback((message, duration) => {
    return toast.error(message, { autoClose: duration })
  }, [])

  const info = useCallback((message, duration) => {
    return toast.info(message, { autoClose: duration })
  }, [])

  const warning = useCallback((message, duration) => {
    return toast.warning(message, { autoClose: duration })
  }, [])

  const removeToast = useCallback((id) => {
    toast.dismiss(id)
  }, [])

  const value = {
    showToast,
    removeToast,
    success,
    error,
    info,
    warning,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}


