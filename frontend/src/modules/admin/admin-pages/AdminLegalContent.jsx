import { useEffect, useState } from 'react'
import { IoDocumentTextOutline, IoCheckmarkCircleOutline } from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import { getAdminSettings, updateAdminSettings } from '../admin-services/adminService'

const defaultLegalContent = {
  patientTermsOfService: '',
  patientPrivacyPolicy: '',
  doctorTermsOfService: '',
  doctorPrivacyPolicy: '',
}

const textareaClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

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
          patientTermsOfService: legalContent.patientTermsOfService || '',
          patientPrivacyPolicy: legalContent.patientPrivacyPolicy || '',
          doctorTermsOfService: legalContent.doctorTermsOfService || '',
          doctorPrivacyPolicy: legalContent.doctorPrivacyPolicy || '',
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
        <p className="mt-1 text-sm text-slate-600">Manage separate Terms of Service and Privacy Policy content for patient and doctor signup pages</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <IoDocumentTextOutline className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900">Role-Based Legal Documents</h2>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading legal content...</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Patient</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="patientTermsOfService" className="text-sm font-semibold text-slate-700">
                    Terms of Service
                  </label>
                  <textarea
                    id="patientTermsOfService"
                    value={legalContent.patientTermsOfService}
                    onChange={(event) => handleChange('patientTermsOfService', event.target.value)}
                    placeholder="Write patient Terms of Service content here..."
                    rows={10}
                    className={textareaClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="patientPrivacyPolicy" className="text-sm font-semibold text-slate-700">
                    Privacy Policy
                  </label>
                  <textarea
                    id="patientPrivacyPolicy"
                    value={legalContent.patientPrivacyPolicy}
                    onChange={(event) => handleChange('patientPrivacyPolicy', event.target.value)}
                    placeholder="Write patient Privacy Policy content here..."
                    rows={10}
                    className={textareaClassName}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Doctor</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="doctorTermsOfService" className="text-sm font-semibold text-slate-700">
                    Terms of Service
                  </label>
                  <textarea
                    id="doctorTermsOfService"
                    value={legalContent.doctorTermsOfService}
                    onChange={(event) => handleChange('doctorTermsOfService', event.target.value)}
                    placeholder="Write doctor Terms of Service content here..."
                    rows={10}
                    className={textareaClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="doctorPrivacyPolicy" className="text-sm font-semibold text-slate-700">
                    Privacy Policy
                  </label>
                  <textarea
                    id="doctorPrivacyPolicy"
                    value={legalContent.doctorPrivacyPolicy}
                    onChange={(event) => handleChange('doctorPrivacyPolicy', event.target.value)}
                    placeholder="Write doctor Privacy Policy content here..."
                    rows={10}
                    className={textareaClassName}
                  />
                </div>
              </div>
            </section>
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
