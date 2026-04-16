export const openDoctorBooking = (navigate, doctorId) => {
  const normalizedDoctorId = String(doctorId || '').trim()

  if (!normalizedDoctorId) {
    return false
  }

  navigate(`/patient/doctors/${normalizedDoctorId}?book=true`, {
    state: {
      autoOpenBooking: true,
      bookingMode: 'book',
    },
  })

  return true
}
