import apiClient from '../utils/apiClient'

export const getLegalDocument = async (documentType, role) => {
  const endpoint = role ? `/public/legal/${role}/${documentType}` : `/public/legal/${documentType}`
  const response = await apiClient.get(endpoint)
  return response?.data || { content: '', lastUpdatedAt: null }
}

export default {
  getLegalDocument,
}
