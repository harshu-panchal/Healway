// Comprehensive Dummy Data for Healway Application
// This file contains all mock data used across different modules

// ============================================
// PATIENT MODULE DATA
// ============================================

export const mockPatients = [
  {
    id: 'pat-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 98765 12345',
    age: 32,
    gender: 'Male',
    address: '123 Main Street, Pune, Maharashtra 411001',
    image: 'https://ui-avatars.com/api/?name=John+Doe&background=0077C2&color=fff&size=128&bold=true',
    bloodGroup: 'O+',
    emergencyContact: {
      name: 'Jane Doe',
      phone: '+91 98765 12346',
      relation: 'Wife',
    },
  },
  {
    id: 'pat-2',
    name: 'Sarah Smith',
    email: 'sarah.smith@example.com',
    phone: '+91 98765 23456',
    age: 28,
    gender: 'Female',
    address: '456 Oak Avenue, Mumbai, Maharashtra 400001',
    image: 'https://ui-avatars.com/api/?name=Sarah+Smith&background=ec4899&color=fff&size=128&bold=true',
    bloodGroup: 'A+',
    emergencyContact: {
      name: 'Mike Smith',
      phone: '+91 98765 23457',
      relation: 'Husband',
    },
  },
  {
    id: 'pat-3',
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
    phone: '+91 98765 34567',
    age: 45,
    gender: 'Male',
    address: '789 Pine Road, Delhi, Delhi 110001',
    image: 'https://ui-avatars.com/api/?name=Mike+Johnson&background=10b981&color=fff&size=128&bold=true',
    bloodGroup: 'B+',
    emergencyContact: {
      name: 'Lisa Johnson',
      phone: '+91 98765 34568',
      relation: 'Wife',
    },
  },
  {
    id: 'pat-4',
    name: 'Emily Brown',
    email: 'emily.brown@example.com',
    phone: '+91 98765 45678',
    age: 35,
    gender: 'Female',
    address: '321 Elm Street, Bangalore, Karnataka 560001',
    image: 'https://ui-avatars.com/api/?name=Emily+Brown&background=8b5cf6&color=fff&size=128&bold=true',
    bloodGroup: 'AB+',
    emergencyContact: {
      name: 'Robert Brown',
      phone: '+91 98765 45679',
      relation: 'Husband',
    },
  },
  {
    id: 'pat-5',
    name: 'David Wilson',
    email: 'david.wilson@example.com',
    phone: '+91 98765 56789',
    age: 50,
    gender: 'Male',
    address: '654 Maple Drive, Chennai, Tamil Nadu 600001',
    image: 'https://ui-avatars.com/api/?name=David+Wilson&background=f59e0b&color=fff&size=128&bold=true',
    bloodGroup: 'O-',
    emergencyContact: {
      name: 'Mary Wilson',
      phone: '+91 98765 56790',
      relation: 'Wife',
    },
  },
]

export const mockDoctors = [
  {
    id: 'doc-1',
    name: 'Dr. Sarah Mitchell',
    specialty: 'Cardiology',
    distance: '1.2 km',
    location: 'Heart Care Center, New York',
    consultationFee: 800,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    experience: '12 years',
    education: 'MBBS, MD Cardiology',
    languages: ['English', 'Hindi'],
    availability: 'Mon-Fri, 9 AM - 6 PM',
    totalConsultations: 342,
    totalPatients: 156,
  },
  {
    id: 'doc-2',
    name: 'Dr. Alana Rueter',
    specialty: 'Dentist',
    distance: '0.9 km',
    location: 'Sunrise Dental Care, New York',
    consultationFee: 500,
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
    experience: '8 years',
    education: 'BDS, MDS',
    languages: ['English', 'Spanish'],
    availability: 'Mon-Sat, 10 AM - 7 PM',
    totalConsultations: 245,
    totalPatients: 98,
  },
  {
    id: 'doc-3',
    name: 'Dr. James Wilson',
    specialty: 'Orthopedic',
    distance: '3.1 km',
    location: 'Bone & Joint Clinic, New York',
    consultationFee: 750,
    image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=400&q=80',
    experience: '15 years',
    education: 'MBBS, MS Orthopedics',
    languages: ['English'],
    availability: 'Mon-Fri, 8 AM - 5 PM',
    totalConsultations: 456,
    totalPatients: 203,
  },
  {
    id: 'doc-4',
    name: 'Dr. Michael Brown',
    specialty: 'General Medicine',
    distance: '0.9 km',
    location: 'Family Health Clinic, New York',
    consultationFee: 600,
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031a?auto=format&fit=crop&w=400&q=80',
    experience: '10 years',
    education: 'MBBS, MD General Medicine',
    languages: ['English', 'Hindi', 'Marathi'],
    availability: 'Mon-Sat, 9 AM - 6 PM',
    totalConsultations: 512,
    totalPatients: 234,
  },
  {
    id: 'doc-5',
    name: 'Dr. Emily Chen',
    specialty: 'Neurology',
    distance: '1.8 km',
    location: 'Neuro Care Institute, New York',
    consultationFee: 900,
    image: 'https://images.unsplash.com/photo-1594824476968-48fd8d2d7dc2?auto=format&fit=crop&w=400&q=80',
    experience: '14 years',
    education: 'MBBS, MD Neurology',
    languages: ['English', 'Mandarin'],
    availability: 'Mon-Fri, 10 AM - 6 PM',
    totalConsultations: 298,
    totalPatients: 145,
  },
  {
    id: 'doc-6',
    name: 'Dr. Priya Sharma',
    specialty: 'Pediatrician',
    distance: '2.5 km',
    location: 'Kids Care Hospital, New York',
    consultationFee: 650,
    image: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=400&q=80',
    experience: '11 years',
    education: 'MBBS, MD Pediatrics',
    languages: ['English', 'Hindi'],
    availability: 'Mon-Sat, 9 AM - 7 PM',
    totalConsultations: 387,
    totalPatients: 178,
  },
]

export const mockPrescriptions = [
  {
    id: 'presc-1',
    doctor: {
      name: 'Dr. Sarah Mitchell',
      specialty: 'Cardiology',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    },
    issuedAt: '2025-01-10',
    status: 'active',
    diagnosis: 'Hypertension',
    symptoms: 'High blood pressure\nHeadaches\nChest discomfort',
    investigations: [
      { name: 'ECG', notes: 'Routine checkup' },
      { name: 'Blood Pressure Monitoring', notes: 'Daily' },
    ],
    advice: 'Maintain a low-sodium diet and regular exercise. Monitor blood pressure daily.',
    followUpAt: '2025-02-10',
    pdfUrl: '#',
  },
  {
    id: 'presc-2',
    doctor: {
      name: 'Dr. Alana Rueter',
      specialty: 'Dentist',
      image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
    },
    issuedAt: '2025-01-08',
    status: 'active',
    diagnosis: 'Dental Caries',
    symptoms: 'Tooth pain\nSensitivity to hot and cold',
    investigations: [],
    advice: 'Maintain good oral hygiene. Avoid hard foods for the next few days.',
    followUpAt: '2025-01-22',
    pdfUrl: '#',
  },
  {
    id: 'presc-3',
    doctor: {
      name: 'Dr. Michael Brown',
      specialty: 'General Medicine',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031a?auto=format&fit=crop&w=400&q=80',
    },
    issuedAt: '2025-01-05',
    status: 'completed',
    diagnosis: 'Common Cold',
    investigations: [],
    advice: 'Rest and stay hydrated. If symptoms persist, consult again.',
    followUpAt: null,
    pdfUrl: '#',
  },
]

export const mockAppointments = [
  {
    id: 'apt-1',
    doctorName: 'Dr. Sarah Mitchell',
    doctorImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
    specialty: 'Cardiology',
    clinic: 'Heart Care Center',
    date: '2025-01-15',
    time: '10:00 AM',
    status: 'confirmed',
    type: 'In-person',
    duration: '30 min',
    reason: 'Follow-up consultation',
  },
  {
    id: 'apt-2',
    doctorName: 'Dr. Priya Sharma',
    doctorImage: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=400&q=80',
    specialty: 'Pediatrician',
    clinic: 'Kids Care Hospital',
    date: '2025-01-16',
    time: '02:30 PM',
    status: 'confirmed',
    type: 'Video',
    duration: '45 min',
    reason: 'Initial consultation',
  },
  {
    id: 'apt-3',
    doctorName: 'Dr. Michael Brown',
    doctorImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031a?auto=format&fit=crop&w=400&q=80',
    specialty: 'General Medicine',
    clinic: 'Family Health Clinic',
    date: '2025-01-17',
    time: '11:00 AM',
    status: 'pending',
    type: 'In-person',
    duration: '20 min',
    reason: 'Quick check-up',
  },
]

// ============================================
// DOCTOR MODULE DATA
// ============================================

export const mockDoctorConsultations = [
  {
    id: 'cons-1',
    patientName: 'David Wilson',
    patientImage: 'https://ui-avatars.com/api/?name=David+Wilson&background=6366f1&color=fff&size=128&bold=true',
    date: '2025-01-15',
    time: '10:00 AM',
    type: 'In-person',
    status: 'completed',
    diagnosis: 'Hypertension',
    prescriptionId: 'presc-1',
  },
  {
    id: 'cons-2',
    patientName: 'Lisa Anderson',
    patientImage: 'https://ui-avatars.com/api/?name=Lisa+Anderson&background=8b5cf6&color=fff&size=128&bold=true',
    date: '2025-01-14',
    time: '02:30 PM',
    type: 'Video',
    status: 'completed',
    diagnosis: 'Common Cold',
    prescriptionId: 'presc-2',
  },
  {
    id: 'cons-3',
    patientName: 'Robert Taylor',
    patientImage: 'https://ui-avatars.com/api/?name=Robert+Taylor&background=ef4444&color=fff&size=128&bold=true',
    date: '2025-01-13',
    time: '11:00 AM',
    type: 'In-person',
    status: 'completed',
    diagnosis: 'Diabetes Type 2',
    prescriptionId: 'presc-3',
  },
]

// ============================================
// ADMIN MODULE DATA
// ============================================

export const mockAdminUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 98765 12345',
    role: 'patient',
    status: 'active',
    registeredAt: '2024-01-15',
    lastActive: '2025-01-15',
  },
  {
    id: 'user-2',
    name: 'Dr. Sarah Mitchell',
    email: 'sarah.mitchell@example.com',
    phone: '+91 98765 23456',
    role: 'doctor',
    status: 'active',
    registeredAt: '2024-02-20',
    lastActive: '2025-01-15',
  },
]

export const mockAdminVerifications = [
  {
    id: 'ver-1',
    type: 'doctor',
    name: 'Dr. Amit Patel',
    image: 'https://ui-avatars.com/api/?name=Dr+Amit+Patel&background=10b981&color=fff&size=128&bold=true',
    specialty: 'Cardiologist',
    submittedAt: '2025-01-15',
    time: '09:00 AM',
    status: 'pending',
    email: 'amit.patel@example.com',
    documents: {
      license: 'license.pdf',
      degree: 'degree.pdf',
      idProof: 'id.pdf',
    },
  },
]

// ============================================
// COMMON UTILITY FUNCTIONS
// ============================================

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export const formatDateTime = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
    case 'delivered':
    case 'ready':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'pending':
    case 'preparing':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'confirmed':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}
