import apiClient from '../utils/apiClient'

export const getLegalDocument = async (documentType) => {
  const response = await apiClient.get(`/public/legal/${documentType}`)
  return response?.data || { content: '', lastUpdatedAt: null }
}

export default {
  getLegalDocument,
}

