import apiClient from '../utils/apiClient'

export const getPublicFooterSettings = async () => {
  const response = await apiClient.get('/public/settings/footer')
  return response?.data || {}
}

export default {
  getPublicFooterSettings,
}
