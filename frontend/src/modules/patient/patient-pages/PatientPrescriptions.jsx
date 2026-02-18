import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../../../contexts/ToastContext'
import {
  getPatientPrescriptions,
  getDoctors,
} from '../patient-services/patientService'
import { getFileUrl } from '../../../utils/apiClient'
import Pagination from '../../../components/Pagination'
import {
  IoDocumentTextOutline,
  IoCalendarOutline,
  IoDownloadOutline,
  IoShareSocialOutline,
  IoEyeOutline,
  IoArrowBackOutline,
  IoCloseOutline,
  IoPeopleOutline,
  IoSearchOutline,
} from 'react-icons/io5'

// Default prescriptions (will be replaced by API data)
const defaultPrescriptions = []


const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const PatientPrescriptions = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPrescription, setSelectedPrescription] = useState(null)
  const [filter, setFilter] = useState('all') // all, active, completed
  const [showShareModal, setShowShareModal] = useState(false)
  const [sharePrescriptionId, setSharePrescriptionId] = useState(null)
  const [selectedDoctors, setSelectedDoctors] = useState([])
  const [shareSearchTerm, setShareSearchTerm] = useState('')
  const [isSharing, setIsSharing] = useState(false)

  const [prescriptions, setPrescriptions] = useState(defaultPrescriptions)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch prescriptions from API
  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getPatientPrescriptions()

        if (response.success && response.data) {
          const prescriptionsData = Array.isArray(response.data)
            ? response.data
            : response.data.items || response.data.prescriptions || []

          // Transform API data to match component structure
          const transformed = prescriptionsData.map(presc => ({
            id: presc._id || presc.id,
            _id: presc._id || presc.id,
            doctor: presc.doctorId ? {
              name: (() => {
                // Build doctor name from firstName and lastName
                if (presc.doctorId.firstName && presc.doctorId.lastName) {
                  return `Dr. ${presc.doctorId.firstName} ${presc.doctorId.lastName}`
                } else if (presc.doctorId.firstName) {
                  return `Dr. ${presc.doctorId.firstName}`
                } else if (presc.doctorId.lastName) {
                  return `Dr. ${presc.doctorId.lastName}`
                } else if (presc.doctorId.name) {
                  return presc.doctorId.name.startsWith('Dr.') ? presc.doctorId.name : `Dr. ${presc.doctorId.name}`
                } else {
                  // Last resort: check originalData or use fallback
                  return presc.originalData?.doctorId?.firstName || presc.originalData?.doctorId?.lastName
                    ? `Dr. ${presc.originalData.doctorId.firstName || ''} ${presc.originalData.doctorId.lastName || ''}`.trim()
                    : 'Dr. Unknown'
                }
              })(),
              specialty: presc.doctorId.specialization || presc.doctorId.specialty || '',
              phone: presc.doctorId.phone || '',
              email: presc.doctorId.email || '',
              clinicName: presc.doctorId.clinicDetails?.name || presc.doctorId.clinicDetails?.clinicName || '',
              clinicAddress: presc.doctorId.clinicDetails?.address || null,
              digitalSignature: presc.doctorId.digitalSignature || null,
              image: presc.doctorId.profileImage || presc.doctorId.image || (() => {
                const firstName = presc.doctorId.firstName || ''
                const lastName = presc.doctorId.lastName || ''
                const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || 'Doctor'
                return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0077C2&color=fff&size=128&bold=true`
              })(),
            } : (presc.doctor || {}),
            patient: presc.patientId ? {
              name: presc.patientId.firstName && presc.patientId.lastName
                ? `${presc.patientId.firstName} ${presc.patientId.lastName}`
                : presc.patientId.name || 'N/A',
              dateOfBirth: presc.patientId.dateOfBirth || null,
              age: presc.patientId.dateOfBirth
                ? Math.floor((new Date() - new Date(presc.patientId.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
                : null,
              gender: presc.patientId.gender || 'N/A',
              phone: presc.patientId.phone || 'N/A',
              email: presc.patientId.email || '',
              address: presc.patientId.address || null,
            } : null,
            issuedAt: presc.createdAt ? new Date(presc.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            status: presc.status || 'active',
            // Get diagnosis, symptoms, investigations from consultationId if available
            diagnosis: presc.consultationId?.diagnosis || presc.diagnosis || '',
            symptoms: presc.consultationId?.symptoms || presc.symptoms || '',
            investigations: presc.consultationId?.investigations || presc.investigations || [],
            advice: presc.consultationId?.advice || presc.advice || presc.notes || '',
            followUpAt: presc.consultationId?.followUpDate || presc.followUpDate || presc.followUpAt || null,
            pdfUrl: presc.pdfFileUrl || presc.pdfUrl || '#',
            originalData: presc,
          }))

          setPrescriptions(transformed)
        }
      } catch (err) {
        console.error('Error fetching prescriptions:', err)
        setError(err.message || 'Failed to load prescriptions')
        toast.error('Failed to load prescriptions')
      } finally {
        setLoading(false)
      }
    }

    fetchPrescriptions()
  }, [toast])

  const filteredPrescriptions = prescriptions.filter((presc) => {
    if (filter === 'all') return true
    return presc.status === filter
  })

  // Calculate paginated prescriptions
  const paginatedPrescriptions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredPrescriptions.slice(startIndex, endIndex)
  }, [filteredPrescriptions, currentPage])

  const prescriptionsTotalPages = Math.ceil(filteredPrescriptions.length / itemsPerPage)
  const prescriptionsTotalItems = filteredPrescriptions.length

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const currentPrescription = prescriptions.find((p) => p.id === sharePrescriptionId)

  useEffect(() => {
    if (showShareModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showShareModal])

  const handleShareClick = (prescriptionId) => {
    setSharePrescriptionId(prescriptionId)
    setSelectedDoctors([])
    setShareSearchTerm('')
    setShowShareModal(true)
  }

  const handleCloseShareModal = () => {
    setShowShareModal(false)
    setSharePrescriptionId(null)
    setSelectedDoctors([])
    setShareSearchTerm('')
  }

  // Helper function to convert image URL to base64
  const urlToBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const dataURL = canvas.toDataURL('image/png')
          resolve(dataURL)
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = reject
      img.src = url
    })
  }

  const generatePDF = async (prescriptionData) => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const primaryColor = [0, 119, 194] // Primary Blue color for header
    const lightBlueColor = [230, 240, 255] // Light blue for diagnosis
    const lightPurpleColor = [240, 230, 250] // Light purple for tests
    const lightYellowColor = [255, 255, 200] // Light yellow for follow-up
    let yPos = margin

    // Header Section - Healway (Above Clinic Name) - Reduced size
    doc.setTextColor(...primaryColor)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Healway', pageWidth / 2, yPos, { align: 'center' })
    yPos += 6

    // Clinic Name in Primary (Below Healway) - Reduced size
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    const clinicName = prescriptionData.doctor?.clinicName || prescriptionData.originalData?.doctorId?.clinicDetails?.name || prescriptionData.originalData?.doctorId?.clinicDetails?.clinicName || 'Super Clinic'
    doc.text(clinicName, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5

    // Clinic Address (Centered) - Reduced spacing - Convert object to string
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    let clinicAddressRaw = prescriptionData.doctor?.clinicAddress || prescriptionData.originalData?.doctorId?.clinicDetails?.address
    let clinicAddress = 'Address not provided'

    if (clinicAddressRaw) {
      if (typeof clinicAddressRaw === 'string') {
        clinicAddress = clinicAddressRaw
      } else if (typeof clinicAddressRaw === 'object' && clinicAddressRaw !== null) {
        // Convert address object to string
        const addressParts = []
        if (clinicAddressRaw.line1) addressParts.push(clinicAddressRaw.line1)
        if (clinicAddressRaw.line2) addressParts.push(clinicAddressRaw.line2)
        if (clinicAddressRaw.city) addressParts.push(clinicAddressRaw.city)
        if (clinicAddressRaw.state) addressParts.push(clinicAddressRaw.state)
        if (clinicAddressRaw.postalCode || clinicAddressRaw.pincode) {
          addressParts.push(clinicAddressRaw.postalCode || clinicAddressRaw.pincode)
        }
        if (clinicAddressRaw.country) addressParts.push(clinicAddressRaw.country)
        clinicAddress = addressParts.join(', ').trim() || 'Address not provided'
      }
    }

    const addressLines = doc.splitTextToSize(clinicAddress, pageWidth - 2 * margin)
    addressLines.forEach((line) => {
      doc.text(line, pageWidth / 2, yPos, { align: 'center' })
      yPos += 3
    })

    // Contact Information (Left: Phone, Right: Email) - Compact
    yPos += 1
    doc.setFontSize(7)
    const contactY = yPos
    // Phone icon and number (left)
    doc.setFillColor(200, 0, 0) // Red circle for phone
    doc.circle(margin + 2, contactY - 1, 1.2, 'F')
    doc.setTextColor(0, 0, 0)
    const phone = prescriptionData.doctor?.phone || prescriptionData.originalData?.doctorId?.phone || 'N/A'
    doc.text(phone, margin + 5, contactY)

    // Email icon and address (right)
    doc.setFillColor(100, 100, 100) // Gray circle for email
    doc.circle(pageWidth - margin - 2, contactY - 1, 1.2, 'F')
    const email = prescriptionData.doctor?.email || prescriptionData.originalData?.doctorId?.email || 'N/A'
    doc.text(email, pageWidth - margin, contactY, { align: 'right' })
    yPos += 4

    // Teal horizontal line separator
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 6

    // Doctor Information (Left) and Patient Information (Right) - Compact
    const infoStartY = yPos
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Doctor Information', margin, infoStartY)
    doc.text('Patient Information', pageWidth - margin, infoStartY, { align: 'right' })

    yPos = infoStartY + 5
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')

    // Doctor Info (Left)
    doc.text(`Name: ${prescriptionData.doctor.name}`, margin, yPos)
    doc.text(`Specialty: ${prescriptionData.doctor.specialty}`, margin, yPos + 3)
    const issuedDate = formatDate(prescriptionData.issuedAt)
    doc.text(`Date: ${issuedDate}`, margin, yPos + 6)

    // Patient Info (Right) - Get from prescriptionData.patient first, then originalData
    let patientYPos = yPos
    const patient = prescriptionData.patient || prescriptionData.originalData?.patientId
    const patientName = patient?.name || (patient?.firstName && patient?.lastName
      ? `${patient.firstName} ${patient.lastName}`
      : 'N/A')
    doc.text(`Name: ${patientName}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 3

    const patientAge = patient?.age || (patient?.dateOfBirth
      ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
      : null)
    doc.text(`Age: ${patientAge ? `${patientAge} years` : 'N/A'}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 3

    const patientGender = patient?.gender || 'N/A'
    doc.text(`Gender: ${patientGender}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 3

    const patientPhone = patient?.phone || 'N/A'
    doc.text(`Phone: ${patientPhone}`, pageWidth - margin, patientYPos, { align: 'right' })
    patientYPos += 3

    // Patient Address - Always show if available
    const patientAddress = patient?.address
    if (patientAddress) {
      let addressText = ''
      if (typeof patientAddress === 'string') {
        addressText = patientAddress
      } else if (typeof patientAddress === 'object' && patientAddress !== null) {
        const addressParts = []
        if (patientAddress.line1) addressParts.push(patientAddress.line1)
        if (patientAddress.line2) addressParts.push(patientAddress.line2)
        if (patientAddress.city) addressParts.push(patientAddress.city)
        if (patientAddress.state) addressParts.push(patientAddress.state)
        if (patientAddress.pincode || patientAddress.postalCode) {
          addressParts.push(patientAddress.pincode || patientAddress.postalCode)
        }
        if (patientAddress.country) addressParts.push(patientAddress.country)
        addressText = addressParts.join(', ').trim()
      }

      if (addressText && addressText !== '[object Object]') {
        const addressLines = doc.splitTextToSize(`Address: ${addressText}`, pageWidth / 2 - margin - 5)
        addressLines.forEach((line, index) => {
          doc.text(line, pageWidth - margin, patientYPos + (index * 3), { align: 'right' })
        })
        patientYPos += (addressLines.length - 1) * 3
      }
    }

    // Set yPos to the maximum of doctor info end or patient info end
    yPos = Math.max(yPos + 9, patientYPos) + 2

    // Diagnosis Section with Light Blue Background Box - Compact
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Diagnosis', margin, yPos)
    yPos += 5

    // Light blue rounded box for diagnosis - Smaller height
    const diagnosisHeight = 6
    doc.setFillColor(...lightBlueColor)
    doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, diagnosisHeight, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const diagnosisText = prescriptionData.diagnosis || 'N/A'
    doc.text(diagnosisText, margin + 3, yPos + 1)
    yPos += diagnosisHeight + 3

    // Symptoms Section with Green Bullet Points - Compact
    if (prescriptionData.symptoms) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Symptoms', margin, yPos)
      yPos += 5
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      const symptomLines = typeof prescriptionData.symptoms === 'string'
        ? prescriptionData.symptoms.split('\n').filter(line => line.trim())
        : Array.isArray(prescriptionData.symptoms)
          ? prescriptionData.symptoms.filter(s => s && s.trim())
          : [String(prescriptionData.symptoms)]

      symptomLines.forEach((symptom) => {
        // Check if we're getting too close to bottom - stop if needed
        if (yPos > pageHeight - 60) return

        // Green bullet point
        doc.setFillColor(34, 197, 94) // Green color
        doc.circle(margin + 1.2, yPos - 0.8, 1, 'F')
        doc.setTextColor(0, 0, 0)
        const symptomText = typeof symptom === 'string' ? symptom.trim() : String(symptom)
        doc.text(symptomText, margin + 4, yPos)
        yPos += 3
      })
      yPos += 1
    }

    // Recommended Tests Section (Light Purple Boxes) - Compact
    if (prescriptionData.investigations && prescriptionData.investigations.length > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Recommended Tests', margin, yPos)
      yPos += 5

      prescriptionData.investigations.forEach((inv) => {
        // NO PAGE BREAKS - Stop if getting too close to bottom
        if (yPos > pageHeight - 50) return

        // Handle both frontend format (name) and backend format (testName)
        const invName = inv.name || inv.testName || 'Investigation'
        const invNotes = inv.notes || ''

        // Ensure invName is a valid string (not null, undefined, or object)
        const invNameStr = typeof invName === 'string' ? invName : String(invName || 'Investigation')
        const invNotesStr = typeof invNotes === 'string' ? invNotes : String(invNotes || '')

        // Light purple box for each test - Smaller height
        const testBoxHeight = invNotesStr ? 10 : 7
        doc.setFillColor(...lightPurpleColor)
        doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, testBoxHeight, 2, 2, 'F')

        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text(invNameStr, margin + 3, yPos + 1.5)

        if (invNotesStr) {
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          doc.text(invNotesStr, margin + 3, yPos + 6)
        }

        yPos += testBoxHeight + 2
      })
      yPos += 1
    }

    // Medical Advice Section - Compact - Always show if available
    if (prescriptionData.advice) {
      // Check if we have space, if not, adjust yPos
      if (yPos > pageHeight - 50) {
        yPos = pageHeight - 50
      }
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Medical Advice', margin, yPos)
      yPos += 5
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      const adviceText = typeof prescriptionData.advice === 'string' ? prescriptionData.advice : String(prescriptionData.advice || '')
      const adviceLines = doc.splitTextToSize(adviceText, pageWidth - 2 * margin)
      adviceLines.forEach((advice) => {
        if (yPos > pageHeight - 45) return
        doc.text(advice.trim(), margin, yPos)
        yPos += 3
      })
      yPos += 1
    }

    // Follow-up Appointment (Light Yellow Box) - Compact
    if ((prescriptionData.followUpAt || prescriptionData.followUpDate) && yPos < pageHeight - 35) {
      const followUpHeight = 9
      doc.setFillColor(...lightYellowColor)
      doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, followUpHeight, 2, 2, 'F')

      // Calendar icon (small square)
      doc.setFillColor(255, 200, 0)
      doc.roundedRect(margin + 2, yPos + 0.5, 2.5, 2.5, 0.5, 0.5, 'F')

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Follow-up Appointment', margin + 6, yPos + 2)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      const followUpDateValue = prescriptionData.followUpAt || prescriptionData.followUpDate
      const followUpDate = new Date(followUpDateValue).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      doc.text(followUpDate, margin + 6, yPos + 6)
      yPos += followUpHeight + 3
    }

    // Footer with Doctor Signature (Right side) - Fixed position
    // Ensure signature is always visible at the bottom
    const signatureSpace = 30
    const minYPos = pageHeight - signatureSpace - 5
    if (yPos < minYPos) {
      yPos = minYPos
    }

    // Doctor Signature (Right side) - Compact and properly positioned
    const signatureAreaWidth = 50  // Standard signature width
    const signatureX = pageWidth - margin - 55  // Position from right margin (55 = area width + spacing)
    const signatureY = yPos

    // Get digital signature from prescription data - handle both object and string formats
    const digitalSignatureRaw = prescriptionData.doctor?.digitalSignature || prescriptionData.originalData?.doctorId?.digitalSignature
    let signatureImageUrl = ''

    // Extract imageUrl from signature object or use string directly
    if (digitalSignatureRaw) {
      if (typeof digitalSignatureRaw === 'string') {
        signatureImageUrl = digitalSignatureRaw.trim()
      } else if (typeof digitalSignatureRaw === 'object' && digitalSignatureRaw !== null) {
        signatureImageUrl = digitalSignatureRaw.imageUrl || digitalSignatureRaw.url || ''
      }
    }

    // Add digital signature image if available
    if (signatureImageUrl && signatureImageUrl !== '') {
      try {
        let imageData = signatureImageUrl
        let imageFormat = 'PNG'

        // Determine image format from data URL or file extension
        if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
          imageFormat = 'JPEG'
        } else if (imageData.includes('data:image/png')) {
          imageFormat = 'PNG'
        } else if (imageData.includes('data:image/')) {
          const match = imageData.match(/data:image\/(\w+);/)
          if (match) {
            imageFormat = match[1].toUpperCase()
          }
        } else if (imageData.toLowerCase().endsWith('.jpg') || imageData.toLowerCase().endsWith('.jpeg')) {
          imageFormat = 'JPEG'
        } else if (imageData.toLowerCase().endsWith('.png')) {
          imageFormat = 'PNG'
        }

        // Calculate signature image dimensions - compact size for prescription
        // Standard signature size: width 50, height 18 (in jsPDF points)
        // This ensures signature is small and properly fits in the document
        const signatureWidth = 50  // Compact width
        const signatureHeight = 18  // Compact height

        // Position signature image above the signature line
        // Position it 18 points above the signature line (standard spacing)
        const signatureImageY = signatureY - signatureHeight

        // Add signature image with compact dimensions, properly positioned
        doc.addImage(imageData, imageFormat, signatureX, signatureImageY, signatureWidth, signatureHeight, undefined, 'FAST')
      } catch (error) {
        console.error('Error adding signature image to PDF:', error)
        // Fallback to line if image fails
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.line(signatureX, signatureY, signatureX + 50, signatureY)
      }
    } else {
      // Draw a line for signature if no image available
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(signatureX, signatureY, signatureX + 50, signatureY)
    }

    // Doctor name and designation below signature (centered under signature area)
    const hasSignatureImage = signatureImageUrl && signatureImageUrl !== ''

    // Position text appropriately - if image exists, position below it, otherwise below line
    const textYPos = hasSignatureImage ? signatureY + 6 : signatureY + 8
    const centerX = signatureX + 25  // Center of signature area (50/2 = 25)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    const doctorName = prescriptionData.doctor?.name || 'Dr. Unknown'
    doc.text(doctorName, centerX, textYPos, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    const doctorSpecialty = prescriptionData.doctor?.specialty || ''
    doc.text(doctorSpecialty, centerX, textYPos + 4, { align: 'center' })

    // Disclaimer at bottom center
    const disclaimerY = pageHeight - 4
    doc.setFontSize(5.5)
    doc.setTextColor(100, 100, 100)
    doc.text('This is a digitally generated prescription. For any queries, please contact the clinic.', pageWidth / 2, disclaimerY, { align: 'center' })

    return doc
  }

  const handleDownloadPDF = async (prescription) => {
    try {
      // If signature is a URL (not base64), convert it to base64 first
      const digitalSignatureRaw = prescription.doctor?.digitalSignature || prescription.originalData?.doctorId?.digitalSignature
      let signatureImageUrl = ''

      if (digitalSignatureRaw) {
        if (typeof digitalSignatureRaw === 'string') {
          signatureImageUrl = digitalSignatureRaw.trim()
        } else if (typeof digitalSignatureRaw === 'object' && digitalSignatureRaw !== null) {
          signatureImageUrl = digitalSignatureRaw.imageUrl || digitalSignatureRaw.url || ''
        }
      }

      // If signature is a URL (not base64), convert to base64
      if (signatureImageUrl && !signatureImageUrl.startsWith('data:image/')) {
        try {
          const base64Signature = await urlToBase64(signatureImageUrl)
          // Update prescription data with base64 signature
          prescription = {
            ...prescription,
            doctor: {
              ...prescription.doctor,
              digitalSignature: base64Signature
            }
          }
        } catch (error) {
          console.warn('Could not convert signature URL to base64, will try direct URL:', error)
        }
      }

      const doc = await generatePDF(prescription)
      const fileName = `Prescription_${prescription.doctor.name.replace(/\s+/g, '_')}_${prescription.issuedAt}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Error generating PDF. Please try again.')
    }
  }

  const handleViewPDF = async (prescription) => {
    try {
      // If signature is a URL (not base64), convert it to base64 first
      const digitalSignatureRaw = prescription.doctor?.digitalSignature || prescription.originalData?.doctorId?.digitalSignature
      let signatureImageUrl = ''

      if (digitalSignatureRaw) {
        if (typeof digitalSignatureRaw === 'string') {
          signatureImageUrl = digitalSignatureRaw.trim()
        } else if (typeof digitalSignatureRaw === 'object' && digitalSignatureRaw !== null) {
          signatureImageUrl = digitalSignatureRaw.imageUrl || digitalSignatureRaw.url || ''
        }
      }

      // If signature is a URL (not base64), convert to base64
      if (signatureImageUrl && !signatureImageUrl.startsWith('data:image/')) {
        try {
          const base64Signature = await urlToBase64(signatureImageUrl)
          // Update prescription data with base64 signature
          prescription = {
            ...prescription,
            doctor: {
              ...prescription.doctor,
              digitalSignature: base64Signature
            }
          }
        } catch (error) {
          console.warn('Could not convert signature URL to base64, will try direct URL:', error)
        }
      }

      const doc = await generatePDF(prescription)
      // Generate PDF blob and open in new window
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      // Clean up the URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl)
      }, 100)
    } catch (error) {
      console.error('Error viewing PDF:', error)
      toast.error('Error generating PDF. Please try again.')
    }
  }

  const handleShare = async () => {
    if (selectedDoctors.length === 0) {
      return
    }

    setIsSharing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    console.log('Sharing prescription:', {
      prescriptionId: sharePrescriptionId,
      doctors: selectedDoctors,
    })
    setIsSharing(false)

    // Navigate to first doctor's booking page
    if (selectedDoctors.length > 0) {
      const firstDoctorId = selectedDoctors[0]
      handleCloseShareModal()
      // Navigate to doctor details page with booking modal open
      navigate(`/patient/doctors/${firstDoctorId}?book=true`)
    }
  }

  // Calculate prescription counts
  const activePrescriptionsCount = prescriptions.filter((p) => p.status === 'active').length
  const totalPrescriptionsCount = prescriptions.length

  // State for doctors
  const [doctors, setDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  // Filter doctors for sharing
  const filteredDoctors = doctors.filter((doctor) => {
    if (!doctor.isActive) return false

    const search = shareSearchTerm.toLowerCase()
    const doctorName = doctor.firstName && doctor.lastName
      ? `Dr. ${doctor.firstName} ${doctor.lastName}`
      : doctor.name || ''
    const specialty = doctor.specialization || doctor.specialty || ''
    const location = doctor.clinicDetails?.clinicName || doctor.location || ''

    return (
      doctorName.toLowerCase().includes(search) ||
      specialty.toLowerCase().includes(search) ||
      location.toLowerCase().includes(search)
    )
  })

  // Fetch doctors for sharing
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true)
        const response = await getDoctors({ limit: 50 })
        if (response.success && response.data) {
          const items = Array.isArray(response.data)
            ? response.data
            : response.data.items || []
          setDoctors(items)
        }
      } catch (error) {
        console.error('Error fetching doctors:', error)
        setDoctors([])
      } finally {
        setLoadingDoctors(false)
      }
    }

    if (showShareModal) {
      fetchDoctors()
    }
  }, [showShareModal])

  return (
    <section className="flex flex-col gap-4 pb-4">
      {/* Prescription Card */}
      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          className={`relative overflow-hidden rounded-2xl border-2 p-4 shadow-sm transition-all border-primary bg-[rgba(0,119,194,0.05)]`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Total Prescriptions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalPrescriptionsCount}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{activePrescriptionsCount} Active</p>
            </div>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: '#14B8A6' }}
            >
              <IoDocumentTextOutline className="h-4 w-4 text-white" />
            </div>
          </div>
        </button>
      </div>

      {/* Filter Tabs */}
      <div id="filter-tabs" className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1">
        {[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${filter === tab.value
              ? 'text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
              }`}
            style={filter === tab.value ? { backgroundColor: 'var(--color-primary)' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Prescriptions List */}
      <div id="prescriptions-section">
        {filteredPrescriptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <IoDocumentTextOutline className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-sm font-medium text-slate-600">No prescriptions found</p>
            <p className="mt-1 text-xs text-slate-500">Prescriptions shared by doctors will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedPrescriptions.map((prescription) => (
              <article
                key={prescription.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: 'var(--color-primary-surface)' }} />

                <div className="relative">
                  {/* Doctor Info */}
                  <div className="flex items-start gap-4">
                    <img
                      src={prescription.doctor.image}
                      alt={prescription.doctor.name}
                      className="h-16 w-16 rounded-2xl object-cover ring-2 ring-slate-100 bg-slate-100"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(prescription.doctor.name)}&background=0077C2&color=fff&size=128&bold=true`
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">{prescription.doctor.name}</h3>
                      <p className="text-sm text-primary">{prescription.doctor.specialty}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${prescription.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                            }`}
                        >
                          {prescription.status === 'active' ? 'Active' : 'Completed'}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <IoCalendarOutline className="h-3.5 w-3.5" />
                          <span>Issued {formatDate(prescription.issuedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(prescription)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[rgba(0,119,194,0.2)] transition hover:bg-[var(--color-primary-dark)] active:scale-95"
                      >
                        <IoDownloadOutline className="h-4 w-4" />
                        Download PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewPDF(prescription)}
                        className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                        aria-label="View PDF"
                      >
                        <IoEyeOutline className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination for Prescriptions */}
        {filteredPrescriptions.length > 0 && prescriptionsTotalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={prescriptionsTotalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && currentPrescription && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseShareModal()
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Share Prescription</h2>
                <p className="text-sm text-slate-600">
                  {currentPrescription.doctor.name} - {currentPrescription.doctor.specialty}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseShareModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <IoCloseOutline className="h-5 w-5" />
              </button>
            </div>

            {/* Header for Doctors */}
            <div className="flex items-center justify-center border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <IoPeopleOutline className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-slate-900">Select Doctors</h3>
                {selectedDoctors.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {selectedDoctors.length}
                  </span>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-slate-200">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <IoSearchOutline className="h-5 w-5" />
                </span>
                <input
                  type="search"
                  placeholder="Search doctors..."
                  value={shareSearchTerm}
                  onChange={(e) => setShareSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-10 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2"
                />
              </div>
            </div>

            {/* Doctors List */}
            <div className="p-6">
              {loadingDoctors ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="py-12 text-center">
                  <IoPeopleOutline className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-sm text-slate-500">No doctors found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filteredDoctors.map((doctor) => {
                    const isSelected = selectedDoctors.includes(doctor._id || doctor.id)
                    const doctorName = doctor.firstName && doctor.lastName
                      ? `Dr. ${doctor.firstName} ${doctor.lastName}`
                      : doctor.name || 'Doctor'

                    return (
                      <button
                        key={doctor._id || doctor.id}
                        type="button"
                        onClick={() => {
                          const id = doctor._id || doctor.id
                          setSelectedDoctors((prev) =>
                            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                          )
                        }}
                        className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${isSelected
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        <img
                          src={doctor.profileImage ? getFileUrl(doctor.profileImage) : `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0077C2&color=fff&size=128&bold=true`}
                          alt={doctorName}
                          className="h-12 w-12 rounded-full object-cover border border-slate-100"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{doctorName}</p>
                          <p className="truncate text-xs text-slate-500">{doctor.specialization || doctor.specialty || 'General Physician'}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-slate-200 bg-white p-6">
              <button
                type="button"
                disabled={selectedDoctors.length === 0 || isSharing}
                onClick={handleShare}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSharing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <IoShareSocialOutline className="h-5 w-5" />
                    <span>Share with {selectedDoctors.length} {selectedDoctors.length === 1 ? 'Doctor' : 'Doctors'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default PatientPrescriptions
