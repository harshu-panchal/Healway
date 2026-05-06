import { useEffect, useRef, useState } from 'react'
import {
  IoCallOutline,
  IoCheckmarkCircleOutline,
  IoDocumentTextOutline,
  IoGlobeOutline,
  IoImageOutline,
  IoLogoFacebook,
  IoLogoTwitter,
  IoLogoLinkedin,
  IoLogoInstagram,
  IoLogoWhatsapp,
  IoLogoYoutube,
  IoMailOutline,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import { getAdminSettings, updateAdminSettings, uploadFooterImage } from '../admin-services/adminService'

const defaultLegalContent = {
  patientTermsOfService: '',
  patientPrivacyPolicy: '',
  doctorTermsOfService: '',
  doctorPrivacyPolicy: '',
  contactUs: '',
  faq: '',
  helpCenter: '',
}

const defaultFooterSettings = {
  brandImage: '',
  description: '',
  supportPhone: '',
  supportEmail: '',
  whatsappNumber: '',
  facebookUrl: '',
  twitterUrl: '',
  linkedinUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
}

const textareaClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const AdminLegalContent = () => {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [legalContent, setLegalContent] = useState(defaultLegalContent)
  const [footerSettings, setFooterSettings] = useState(defaultFooterSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await getAdminSettings()
        setLegalContent({
          ...defaultLegalContent,
          ...(response?.data?.legalContent || {}),
        })
        setFooterSettings({
          ...defaultFooterSettings,
          ...(response?.data?.footerSettings || {}),
        })
      } catch (error) {
        console.error('Error loading admin settings:', error)
        toast.error('Failed to load admin settings')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  const handleLegalChange = (key, value) => {
    setLegalContent((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleFooterChange = (key, value) => {
    // For phone and whatsapp, only allow digits and a leading +
    if (key === 'supportPhone' || key === 'whatsappNumber') {
      const filtered = value.replace(/[^\d+]/g, '')
      setFooterSettings((prev) => ({
        ...prev,
        [key]: filtered,
      }))
      return
    }

    setFooterSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const validateSettings = () => {
    // Gmail validation
    if (footerSettings.supportEmail && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(footerSettings.supportEmail)) {
      toast.warning('Support email must be a valid Gmail address (ending in @gmail.com)')
      return false
    }

    // Social Media URL validation
    const validateUrl = (url, platform) => {
      if (!url) return true
      try {
        const parsed = new URL(url)
        return parsed.hostname.includes(platform)
      } catch (e) {
        return false
      }
    }

    if (footerSettings.facebookUrl && !validateUrl(footerSettings.facebookUrl, 'facebook.com')) {
      toast.warning('Please enter a valid Facebook URL')
      return false
    }
    if (footerSettings.instagramUrl && !validateUrl(footerSettings.instagramUrl, 'instagram.com')) {
      toast.warning('Please enter a valid Instagram URL')
      return false
    }
    if (footerSettings.twitterUrl && !validateUrl(footerSettings.twitterUrl, 'twitter.com')) {
      toast.warning('Please enter a valid Twitter/X URL')
      return false
    }
    if (footerSettings.linkedinUrl && !validateUrl(footerSettings.linkedinUrl, 'linkedin.com')) {
      toast.warning('Please enter a valid LinkedIn URL')
      return false
    }
    if (footerSettings.youtubeUrl && !validateUrl(footerSettings.youtubeUrl, 'youtube.com')) {
      toast.warning('Please enter a valid YouTube URL')
      return false
    }

    // Phone number validation
    if (footerSettings.supportPhone && footerSettings.supportPhone.replace(/\+/g, '').length < 10) {
      toast.warning('Support phone number should be at least 10 digits')
      return false
    }

    if (footerSettings.whatsappNumber && footerSettings.whatsappNumber.replace(/\+/g, '').length < 10) {
      toast.warning('WhatsApp number should be at least 10 digits')
      return false
    }

    return true
  }

  const handleFooterImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    try {
      const response = await uploadFooterImage(file)
      const imageUrl = response?.data?.url || response?.data?.data?.url

      if (!imageUrl) {
        throw new Error('Image URL not found in upload response')
      }

      setFooterSettings((prev) => ({
        ...prev,
        brandImage: imageUrl,
      }))
      toast.success('Footer image uploaded successfully')
    } catch (error) {
      console.error('Error uploading footer image:', error)
      toast.error(error.message || 'Failed to upload footer image')
    } finally {
      setIsUploadingImage(false)
      event.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!validateSettings()) return

    setIsSaving(true)
    try {
      await updateAdminSettings({
        legalContent: {
          patientTermsOfService: legalContent.patientTermsOfService || '',
          patientPrivacyPolicy: legalContent.patientPrivacyPolicy || '',
          doctorTermsOfService: legalContent.doctorTermsOfService || '',
          doctorPrivacyPolicy: legalContent.doctorPrivacyPolicy || '',
          contactUs: legalContent.contactUs || '',
          faq: legalContent.faq || '',
          helpCenter: legalContent.helpCenter || '',
        },
        footerSettings: {
          brandImage: footerSettings.brandImage || '',
          description: footerSettings.description || '',
          supportPhone: footerSettings.supportPhone || '',
          supportEmail: footerSettings.supportEmail || '',
          whatsappNumber: footerSettings.whatsappNumber || '',
          facebookUrl: footerSettings.facebookUrl || '',
          twitterUrl: footerSettings.twitterUrl || '',
          linkedinUrl: footerSettings.linkedinUrl || '',
          instagramUrl: footerSettings.instagramUrl || '',
          youtubeUrl: footerSettings.youtubeUrl || '',
        },
      })
      toast.success('Legal content and footer settings saved successfully')
    } catch (error) {
      console.error('Error saving admin settings:', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-4 pb-20 pt-20 lg:pt-24">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Legal Content & Footer Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage signup legal pages and website footer content from one place without affecting the rest of the platform.
        </p>
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
                    onChange={(event) => handleLegalChange('patientTermsOfService', event.target.value)}
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
                    onChange={(event) => handleLegalChange('patientPrivacyPolicy', event.target.value)}
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
                    onChange={(event) => handleLegalChange('doctorTermsOfService', event.target.value)}
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
                    onChange={(event) => handleLegalChange('doctorPrivacyPolicy', event.target.value)}
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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <IoGlobeOutline className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Website Footer Content</h2>
            <p className="text-sm text-slate-500">These values control the public website footer shown on landing and onboarding pages.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading footer settings...</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">Brand & Contact</h3>

              <div className="mb-4 flex flex-col gap-3">
                <label className="text-sm font-semibold text-slate-700">Footer Brand Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFooterImageUpload}
                />
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4">
                  <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {footerSettings.brandImage ? (
                      <img
                        src={footerSettings.brandImage}
                        alt="Footer brand"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <IoImageOutline className="h-5 w-5" />
                        <span>No image selected</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFooterChange('brandImage', '')}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="footerDescription" className="text-sm font-semibold text-slate-700">
                    Description
                  </label>
                  <textarea
                    id="footerDescription"
                    rows={5}
                    value={footerSettings.description}
                    onChange={(event) => handleFooterChange('description', event.target.value)}
                    placeholder="Write the footer description shown below the image."
                    className={textareaClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="supportPhone" className="text-sm font-semibold text-slate-700">
                    Support Phone Number
                  </label>
                  <input
                    id="supportPhone"
                    type="text"
                    value={footerSettings.supportPhone}
                    onChange={(event) => handleFooterChange('supportPhone', event.target.value)}
                    placeholder="+91 1234567890"
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="supportEmail" className="text-sm font-semibold text-slate-700">
                    Support Email
                  </label>
                  <input
                    id="supportEmail"
                    type="email"
                    value={footerSettings.supportEmail}
                    onChange={(event) => handleFooterChange('supportEmail', event.target.value)}
                    placeholder="support@healway.com"
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="whatsappNumber" className="text-sm font-semibold text-slate-700">
                    WhatsApp Number
                  </label>
                  <input
                    id="whatsappNumber"
                    type="text"
                    value={footerSettings.whatsappNumber}
                    onChange={(event) => handleFooterChange('whatsappNumber', event.target.value)}
                    placeholder="919876543210"
                    className={inputClassName}
                  />
                  <p className="text-xs text-slate-500">Enter digits with country code so WhatsApp click opens the same number.</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">Social Media</h3>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="facebookUrl" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <IoLogoFacebook className="h-4 w-4 text-blue-600" />
                    Facebook URL
                  </label>
                  <input
                    id="facebookUrl"
                    type="url"
                    value={footerSettings.facebookUrl}
                    onChange={(event) => handleFooterChange('facebookUrl', event.target.value)}
                    placeholder="https://facebook.com/your-page"
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="instagramUrl" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <IoLogoInstagram className="h-4 w-4 text-pink-500" />
                    Instagram URL
                  </label>
                  <input
                    id="instagramUrl"
                    type="url"
                    value={footerSettings.instagramUrl}
                    onChange={(event) => handleFooterChange('instagramUrl', event.target.value)}
                    placeholder="https://instagram.com/your-page"
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="twitterUrl" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <IoLogoTwitter className="h-4 w-4 text-sky-500" />
                    Twitter URL
                  </label>
                  <input
                    id="twitterUrl"
                    type="url"
                    value={footerSettings.twitterUrl}
                    onChange={(event) => handleFooterChange('twitterUrl', event.target.value)}
                    placeholder="https://twitter.com/your-page"
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="linkedinUrl" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <IoLogoLinkedin className="h-4 w-4 text-blue-700" />
                    LinkedIn URL
                  </label>
                  <input
                    id="linkedinUrl"
                    type="url"
                    value={footerSettings.linkedinUrl}
                    onChange={(event) => handleFooterChange('linkedinUrl', event.target.value)}
                    placeholder="https://linkedin.com/company/your-page"
                    className={inputClassName}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="youtubeUrl" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <IoLogoYoutube className="h-4 w-4 text-red-500" />
                    YouTube URL
                  </label>
                  <input
                    id="youtubeUrl"
                    type="url"
                    value={footerSettings.youtubeUrl}
                    onChange={(event) => handleFooterChange('youtubeUrl', event.target.value)}
                    placeholder="https://youtube.com/your-channel"
                    className={inputClassName}
                  />
                </div>

              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-800">Quick Preview Values</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><IoCallOutline className="h-4 w-4 text-blue-500" /> {footerSettings.supportPhone || 'No phone added yet'}</p>
                  <p className="flex items-center gap-2"><IoMailOutline className="h-4 w-4 text-emerald-500" /> {footerSettings.supportEmail || 'No email added yet'}</p>
                  <p className="flex items-center gap-2"><IoLogoWhatsapp className="h-4 w-4 text-green-500" /> {footerSettings.whatsappNumber || 'No WhatsApp number added yet'}</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <IoDocumentTextOutline className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900">Footer Support Pages</h2>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading support page content...</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label htmlFor="contactUs" className="mb-2 block text-sm font-semibold text-slate-700">
                Contact Us Page Content
              </label>
              <textarea
                id="contactUs"
                rows={12}
                value={legalContent.contactUs}
                onChange={(event) => handleLegalChange('contactUs', event.target.value)}
                placeholder="Write Contact Us page content here..."
                className={textareaClassName}
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label htmlFor="faq" className="mb-2 block text-sm font-semibold text-slate-700">
                FAQ Page Content
              </label>
              <textarea
                id="faq"
                rows={12}
                value={legalContent.faq}
                onChange={(event) => handleLegalChange('faq', event.target.value)}
                placeholder="Write FAQ page content here..."
                className={textareaClassName}
              />
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label htmlFor="helpCenter" className="mb-2 block text-sm font-semibold text-slate-700">
                Help Center Page Content
              </label>
              <textarea
                id="helpCenter"
                rows={12}
                value={legalContent.helpCenter}
                onChange={(event) => handleLegalChange('helpCenter', event.target.value)}
                placeholder="Write Help Center page content here..."
                className={textareaClassName}
              />
            </section>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading || isUploadingImage}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <IoCheckmarkCircleOutline className="h-5 w-5" />
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </section>
  )
}

export default AdminLegalContent
