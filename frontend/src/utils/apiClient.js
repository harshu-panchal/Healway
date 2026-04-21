/**
 * Base API Client for making HTTP requests
 * This is a reusable utility that can be used by all modules
 * 
 * Usage:
 * import apiClient from '@/utils/apiClient'
 * const response = await apiClient.post('/admin/auth/login', data)
 */

// Get API base URL from environment variable
// For development: http://localhost:5000/api
// For production: https://your-backend-domain.com/api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

/**
 * Get authentication token from storage
 * @param {string} module - Module name (admin, patient, doctor, etc.)
 * @returns {string|null} Auth token or null
 */
const getAuthToken = (module = 'admin') => {
  // Try localStorage first, then sessionStorage
  // Check all possible token keys
  return (
    localStorage.getItem(`${module}AuthToken`) ||
    localStorage.getItem(`${module}AccessToken`) ||
    sessionStorage.getItem(`${module}AuthToken`) ||
    sessionStorage.getItem(`${module}AccessToken`) ||
    null
  )
}

/**
 * Get refresh token from storage
 * @param {string} module - Module name
 * @returns {string|null} Refresh token or null
 */
const getRefreshToken = (module = 'admin') => {
  return (
    localStorage.getItem(`${module}RefreshToken`) ||
    sessionStorage.getItem(`${module}RefreshToken`) ||
    null
  )
}

/**
 * Get auth headers for API requests
 * @param {string} module - Module name
 * @param {object} additionalHeaders - Additional headers to include
 * @returns {object} Headers object
 */
const getAuthHeaders = (module = 'admin', additionalHeaders = {}) => {
  const token = getAuthToken(module)
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...additionalHeaders,
  }
}

/**
 * Store tokens in storage
 * @param {string} module - Module name
 * @param {object} tokens - Tokens object with accessToken and refreshToken
 * @param {boolean} remember - Whether to use localStorage (true) or sessionStorage (false)
 */
const storeTokens = (module, tokens, remember = true) => {
  const storage = remember ? localStorage : sessionStorage
  if (tokens.accessToken) {
    storage.setItem(`${module}AuthToken`, tokens.accessToken)
    storage.setItem(`${module}AccessToken`, tokens.accessToken)
  }
  if (tokens.refreshToken) {
    storage.setItem(`${module}RefreshToken`, tokens.refreshToken)
  }
}

/**
 * Clear tokens from storage
 * @param {string} module - Module name
 */
const clearTokens = (module = 'admin') => {
  localStorage.removeItem(`${module}AuthToken`)
  localStorage.removeItem(`${module}AccessToken`)
  localStorage.removeItem(`${module}RefreshToken`)
  sessionStorage.removeItem(`${module}AuthToken`)
  sessionStorage.removeItem(`${module}AccessToken`)
  sessionStorage.removeItem(`${module}RefreshToken`)
}

/**
 * Map module name to API endpoint path
 * @param {string} module - Module name (patient, doctor, etc.)
 * @returns {string} API endpoint path (patients, doctors, etc.)
 */
const getModuleApiPath = (module) => {
  const moduleMap = {
    'patient': 'patients',
    'doctor': 'doctors',
    'admin': 'admin',
  }
  return moduleMap[module] || module
}

/**
 * Refresh access token using refresh token
 * @param {string} module - Module name
 * @returns {Promise<object>} New tokens
 */
const refreshAccessToken = async (module = 'admin') => {
  const refreshToken = getRefreshToken(module)

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const apiPath = getModuleApiPath(module)

  try {
    const response = await fetch(`${API_BASE_URL}/${apiPath}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    const data = await response.json()

    if (data.success && data.data) {
      // Store new tokens
      const remember = !!localStorage.getItem(`${module}AuthToken`)
      storeTokens(module, {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      }, remember)

      return data.data
    }

    throw new Error('Invalid refresh response')
  } catch (error) {
    // Clear tokens on refresh failure
    clearTokens(module)
    throw error
  }
}

// Track pending GET requests for deduplication
const pendingRequests = new Map()

/**
 * Make API request with automatic token refresh on 401
 * @param {string} endpoint - API endpoint (e.g., '/admin/auth/login')
 * @param {object} options - Fetch options (can include signal for AbortController)
 * @param {string} module - Module name for token management
 * @returns {Promise<Response>} Fetch response
 */
const apiRequest = async (endpoint, options = {}, module = 'admin') => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  // Check if this is a public auth endpoint (login/signup) that shouldn't require token
  const isAuthEndpoint = endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/login/otp') ||
    endpoint.includes('/auth/request-otp') ||
    endpoint.includes('/auth/signup') ||
    endpoint.includes('/auth/forgot-password') ||
    endpoint.includes('/auth/verify-otp') ||
    endpoint.includes('/auth/reset-password') ||
    endpoint.includes('/auth/check-exists')

  // Check if this is a public discovery endpoint (doctors, specialties)
  const isPublicDiscoveryEndpoint = (endpoint.includes('/patients/doctors') ||
    endpoint.includes('/patients/specialties') ||
    endpoint.includes('/specialties') ||
    endpoint.includes('/services') ||
    endpoint.includes('/location/state') ||
    endpoint.includes('/location/city') ||
    endpoint.includes('/public/legal') ||
    endpoint.includes('/public/settings')) &&
    !endpoint.includes('/admin/')

  // For protected endpoints (not auth or public discovery), check token before making request
  if (!isAuthEndpoint && !isPublicDiscoveryEndpoint) {
    const token = getAuthToken(module)
    if (!token) {
      // No token, clear any stale tokens and redirect immediately
      clearTokens(module)
      const loginPath = module === 'admin' ? '/admin/login' : `/${module}/login`
      if (window.location.pathname !== loginPath && !window.location.pathname.includes('/login')) {
        window.location.href = loginPath
      }
      throw new Error('Authentication token missing. Please login again.')
    }
  }

  // Check if body is FormData
  const isFormData = options.body instanceof FormData

  // Build headers
  const authHeaders = getAuthHeaders(module, {});
  let headers = {
    ...authHeaders,
    ...options.headers,
  };

  // If it's pure auth endpoint, we might not want tokens?
  // But usually sending it doesn't hurt.
  // However, for FormData, we MUST NOT set Content-Type
  if (isFormData) {
    delete headers['Content-Type'];
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // If it is explicitly an auth endpoint OR public discovery, and we are missing token,
  // we still shouldn't have thrown. We already handled the throw block above.

  const config = {
    method: options.method || 'GET',
    headers: headers,
    body: options.body,
    signal: options.signal,
  }

  try {
    let response = await fetch(url, config)

    // Handle 429 Too Many Requests with retry logic
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      let delay = 1000

      if (retryAfter) {
        delay = parseInt(retryAfter) * 1000
      } else {
        delay = 1000
      }

      await new Promise(resolve => setTimeout(resolve, delay))

      if (!config.signal?.aborted) {
        response = await fetch(url, config)
      } else {
        throw new DOMException('Request aborted', 'AbortError')
      }
    }

    // If 401 Unauthorized
    if (response.status === 401) {
      if (isAuthEndpoint || isPublicDiscoveryEndpoint) {
        return response
      }

      if (getRefreshToken(module)) {
        try {
          await refreshAccessToken(module)
          config.headers = getAuthHeaders(module, options.headers)
          response = await fetch(url, config)
        } catch (refreshError) {
          clearTokens(module)
          throw new Error('Session expired. Please login again.')
        }
      } else {
        clearTokens(module)
        throw new Error('Authentication token missing. Please login again.')
      }
    }

    if (response.status === 403 && !isAuthEndpoint && !isPublicDiscoveryEndpoint) {
      const errorData = await response.clone().json().catch(() => ({}))
      const message = String(errorData.message || '')
      const shouldForceLogout =
        message.includes('Doctor access is disabled by admin') ||
        message.includes('Your session has been ended by admin')

      if (shouldForceLogout) {
        clearTokens(module)
        if (module === 'doctor') {
          window.location.href = '/doctor/login'
        }
      }
    }

    return response
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    console.error(`API Request Error [${module}]:`, error)
    throw error
  }
}

/**
 * API Client class
 */
class ApiClient {
  constructor(module = 'admin') {
    this.module = module
  }

  async get(endpoint, params = {}, signal = null) {
    const cleanParams = {}
    Object.keys(params).forEach(key => {
      const value = params[key]
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = value
      }
    })
    const queryString = new URLSearchParams(cleanParams).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

    // Deduplication logic for GET requests
    const requestKey = `${this.module}:${fullUrl}`
    if (pendingRequests.has(requestKey) && !signal) {
      return pendingRequests.get(requestKey)
    }

    const requestPromise = (async () => {
      try {
        const response = await apiRequest(url, { method: 'GET', signal }, this.module)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          if (response.status === 429) {
            throw new Error(errorData.message || 'Too many requests. Please wait a moment and try again.')
          }
          throw new Error(errorData.message || `Request failed: ${response.statusText}`)
        }

        const jsonData = await response.json()
        return jsonData
      } catch (error) {
        if (error.name === 'AbortError') {
          throw error
        }
        throw error
      } finally {
        // Remove from pending map once complete
        if (!signal) {
          pendingRequests.delete(requestKey)
        }
      }
    })()

    // Store in pending map if no signal is provided (to avoid complications with cancellation)
    if (!signal) {
      pendingRequests.set(requestKey, requestPromise)
    }

    return requestPromise
  }

  async post(endpoint, data = {}) {
    const isFormData = data instanceof FormData

    const response = await apiRequest(
      endpoint,
      {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data),
      },
      this.module
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Request failed: ${response.statusText}`)
    }

    return await response.json()
  }

  async put(endpoint, data = {}) {
    const isFormData = data instanceof FormData

    const response = await apiRequest(
      endpoint,
      {
        method: 'PUT',
        body: isFormData ? data : JSON.stringify(data),
      },
      this.module
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Request failed: ${response.statusText}`)
    }

    return await response.json()
  }

  async patch(endpoint, data = {}) {
    const isFormData = data instanceof FormData

    const response = await apiRequest(
      endpoint,
      {
        method: 'PATCH',
        body: isFormData ? data : JSON.stringify(data),
      },
      this.module
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Request failed: ${response.statusText}`)
    }

    return await response.json()
  }

  async delete(endpoint, data = null) {
    const isFormData = data instanceof FormData

    const response = await apiRequest(
      endpoint,
      {
        method: 'DELETE',
        body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
      },
      this.module
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Request failed: ${response.statusText}`)
    }

    return await response.json()
  }

  async upload(endpoint, formData) {
    const token = getAuthToken(this.module)
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
    const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    let response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      })
    } catch (fetchError) {
      if (fetchError.message?.includes('Failed to fetch') ||
        fetchError.message?.includes('NetworkError') ||
        fetchError.name === 'TypeError') {
        throw new Error('Cannot connect to server. Please make sure the backend server is running on port 5000.')
      }
      throw fetchError
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Upload failed: ${response.statusText}`)
    }

    return await response.json()
  }
}

// Export default instance for admin
const apiClient = new ApiClient('admin')

/**
 * Get full URL for a file path from the backend
 * Handles Cloudinary URLs (pass-through), blob URLs, and legacy local paths
 * Supports basic Cloudinary transformations like width/height
 * @param {string} path - Relative path or full URL to the file
 * @param {object} options - Optional { width, height, crop } for transformation
 * @returns {string} Full URL to the file
 */
export const getFileUrl = (path, options = {}) => {
  if (!path) return null
  if (typeof path !== 'string') return null

  // Cloudinary URLs - handle resizing if options provided
  if (path.startsWith('http')) {
    if (path.includes('cloudinary.com') && (options.width || options.height)) {
      const parts = path.split('/upload/')
      if (parts.length === 2) {
        const transformations = []
        if (options.width) transformations.push(`w_${options.width}`)
        if (options.height) transformations.push(`h_${options.height}`)
        transformations.push(`c_${options.crop || 'fill'}`)
        transformations.push('q_auto', 'f_auto') // Quality and format auto-optimization

        return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`
      }
    }
    return path
  }

  // Blob URLs - return as-is
  if (path.startsWith('blob:')) return path

  // Legacy local paths - map to backend /uploads/ for backward compatibility
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
  const rootBase = apiBase.replace(/\/api\/?$/, '')

  let cleanPath = path.startsWith('/') ? path : `/${path}`

  if (!cleanPath.startsWith('/uploads/')) {
    cleanPath = `/uploads${cleanPath}`
  }

  return `${rootBase}${cleanPath}`
}

// Export class and other utilities
export { ApiClient, storeTokens, clearTokens, getAuthToken, getRefreshToken }

export default apiClient
