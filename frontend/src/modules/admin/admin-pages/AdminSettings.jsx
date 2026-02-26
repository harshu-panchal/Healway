import { useEffect, useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { getAdminSettings, updateAdminSettings } from '../admin-services/adminService'
import {
  IoShieldCheckmarkOutline,
  IoNotificationsOutline,
  IoLockClosedOutline,
  IoDocumentTextOutline,
  IoCheckmarkCircleOutline,
} from 'react-icons/io5'

const defaultSettings = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  autoVerifyDoctors: false,
  requireTwoFactor: false,
  maintenanceMode: false,
}

const AdminSettings = () => {
  const toast = useToast()
  const [settings, setSettings] = useState(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await getAdminSettings()
        if (response?.data) {
          setSettings({
            ...defaultSettings,
            ...response.data,
          })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        toast.error('Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateAdminSettings({
        emailNotifications: settings.emailNotifications,
        smsNotifications: settings.smsNotifications,
        pushNotifications: settings.pushNotifications,
        autoVerifyDoctors: settings.autoVerifyDoctors,
        requireTwoFactor: settings.requireTwoFactor,
        maintenanceMode: settings.maintenanceMode,
      })
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <section className="flex flex-col gap-3 pb-20 pt-20 lg:pt-24">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Loading settings...</p>
        </header>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 pb-20 pt-20 lg:pt-24">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your admin panel settings</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <IoNotificationsOutline className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900">Notification Settings</h2>
        </div>
        <div className="space-y-4">
          <ToggleRow
            label="Email Notifications"
            description="Receive notifications via email"
            isOn={settings.emailNotifications}
            onClick={() => handleToggle('emailNotifications')}
          />
          <ToggleRow
            label="SMS Notifications"
            description="Receive notifications via SMS"
            isOn={settings.smsNotifications}
            onClick={() => handleToggle('smsNotifications')}
          />
          <ToggleRow
            label="Push Notifications"
            description="Receive push notifications"
            isOn={settings.pushNotifications}
            onClick={() => handleToggle('pushNotifications')}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <IoShieldCheckmarkOutline className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900">Verification Settings</h2>
        </div>
        <ToggleRow
          label="Auto-Verify Doctors"
          description="Automatically verify new doctor registrations"
          isOn={settings.autoVerifyDoctors}
          onClick={() => handleToggle('autoVerifyDoctors')}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <IoLockClosedOutline className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900">Security Settings</h2>
        </div>
        <ToggleRow
          label="Two-Factor Authentication"
          description="Require 2FA for admin login"
          isOn={settings.requireTwoFactor}
          onClick={() => handleToggle('requireTwoFactor')}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <IoDocumentTextOutline className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold text-slate-900">System Settings</h2>
        </div>
        <ToggleRow
          label="Maintenance Mode"
          description="Put the system in maintenance mode"
          isOn={settings.maintenanceMode}
          onClick={() => handleToggle('maintenanceMode')}
        />
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <IoCheckmarkCircleOutline className="h-5 w-5" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </section>
  )
}

const ToggleRow = ({ label, description, isOn, onClick }) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
      <button
        onClick={onClick}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isOn ? 'bg-primary' : 'bg-slate-300'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOn ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  )
}

export default AdminSettings
