import { useEffect, useState } from 'react'
import { IoDocumentTextOutline, IoCheckmarkCircleOutline } from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import { getAdminSettings, updateAdminSettings } from '../admin-services/adminService'

const defaultLegalContent = {
  termsOfService: '',
  privacyPolicy: '',
}

const AdminLegalContent = () => {
  const toast = useToast()
  const [legalContent, setLegalContent] = useState(defaultLegalContent)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadLegalContent = async () => {
      try {
        const response = await getAdminSettings()
        setLegalContent({
          ...defaultLegalContent,
          ...(response?.data?.legalContent || {}),
        })
      } catch (error) {
        console.error('Error loading legal content:', error)
        toast.error('Failed to load legal content')
      } finally {
        setIsLoading(false)
      }
    }

    loadLegalContent()
  }, [toast])

  const handleChange = (key, value) => {
    setLegalContent((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateAdminSettings({
        legalContent: {
          termsOfService: legalContent.termsOfService || '',
          privacyPolicy: legalContent.privacyPolicy || '',
        },
      })
      toast.success('Legal content saved successfully')
    } catch (error) {
      console.error('Error saving legal content:', error)
      toast.error(error.message || 'Failed to save legal content')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 pb-20 pt-20 lg:pt-24">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Legal Content</h1>
        <p className="mt-1 text-sm text-slate-600">Manage Terms of Service and Privacy Policy content for signup pages</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <IoDocumentTextOutline className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900">Public Legal Documents</h2>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading legal content...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="termsOfService" className="text-sm font-semibold text-slate-700">
                Terms of Service
              </label>
              <textarea
                id="termsOfService"
                value={legalContent.termsOfService}
                onChange={(event) => handleChange('termsOfService', event.target.value)}
                placeholder="Write Terms of Service content here..."
                rows={12}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="privacyPolicy" className="text-sm font-semibold text-slate-700">
                Privacy Policy
              </label>
              <textarea
                id="privacyPolicy"
                value={legalContent.privacyPolicy}
                onChange={(event) => handleChange('privacyPolicy', event.target.value)}
                placeholder="Write Privacy Policy content here..."
                rows={12}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <IoCheckmarkCircleOutline className="h-5 w-5" />
          {isSaving ? 'Saving...' : 'Save Legal Content'}
        </button>
      </div>
    </section>
  )
}

export default AdminLegalContent

