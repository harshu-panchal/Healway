import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { IoArrowBackOutline, IoDocumentTextOutline } from 'react-icons/io5'
import { getLegalDocument } from '../../services/legalService'

const fallbackContent = {
  terms: `Welcome to Healway. By using this platform, you agree to follow applicable laws, maintain truthful account information, and use services responsibly. Healway may update these terms from time to time. Continued use after updates means you accept those updates.`,
  privacy: `Healway collects and processes account and healthcare-related data to provide core platform services. We apply reasonable security controls and only use data as required for service delivery, compliance, and support. You can contact us for privacy-related requests.`,
}

const fallbackUpdated = {
  terms: 'January 1, 2025',
  privacy: 'January 1, 2025',
}

const formatDate = (value, defaultDate) => {
  if (!value) return defaultDate
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return defaultDate
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const LegalContentPage = ({ type, role }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [content, setContent] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const pageTitle = type === 'terms' ? 'Terms of Service' : 'Privacy Policy'

  useEffect(() => {
    let isMounted = true

    const loadContent = async () => {
      try {
        const data = await getLegalDocument(type, role)
        if (!isMounted) return
        setContent((data?.content || '').trim())
        setLastUpdatedAt(data?.lastUpdatedAt || null)
      } catch (error) {
        console.error(`Failed to load ${type} content:`, error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadContent()
    return () => {
      isMounted = false
    }
  }, [type, role])

  const finalContent = useMemo(() => {
    return content || fallbackContent[type]
  }, [content, type])

  const handleBack = () => {
    const fromPath = location.state?.fromPath
    const restoreAuthView = location.state?.restoreAuthView

    if (fromPath) {
      navigate(fromPath, {
        state: restoreAuthView ? { restoreAuthView } : undefined,
      })
      return
    }

    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-primary"
        >
          <IoArrowBackOutline className="h-4 w-4" />
          Back
        </button>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <IoDocumentTextOutline className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{pageTitle}</h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Last updated: {formatDate(lastUpdatedAt, fallbackUpdated[type])}
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading content...</p>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700 sm:text-[15px]">
                {finalContent}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default LegalContentPage
