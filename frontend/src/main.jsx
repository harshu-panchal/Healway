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
  if (typeof args[0] === 'string') {
    if (
      args[0].includes('<svg> attribute') ||
      args[0].includes('Expected length') ||
      args[0].includes('"auto"')
    ) {
      return // Suppress these errors
    }
  }
  
  try {
    originalError.apply(console, args)
  } catch (e) {
    // If native console.error throws a coercion error, prevent it from crashing the app
    // and log a fallback message safely.
    originalError('[console.error crash prevented]: Could not log the original error object due to a primitive conversion failure.');
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
