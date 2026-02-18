import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Initialize dummy data on app load
import './utils/initializeDummyData.js'
import { ToastProvider } from './contexts/ToastContext'

// Suppress Razorpay SVG console errors (Razorpay's internal issue)
const originalError = console.error
console.error = (...args) => {
  // Filter out Razorpay SVG attribute errors
  if (
    args[0]?.includes?.('<svg> attribute') ||
    args[0]?.includes?.('Expected length') ||
    args[0]?.includes?.('"auto"')
  ) {
    return // Suppress these errors
  }
  originalError.apply(console, args)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
