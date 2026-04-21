export const getDoctorAccessMode = (doctor) => {
  const mode = doctor?.accessMode

  if (mode === 'visible_unbookable' || mode === 'hidden' || mode === 'active') {
    return mode
  }

  return doctor?.isActive === false ? 'hidden' : 'active'
}

export const canBookDoctor = (doctor) => getDoctorAccessMode(doctor) === 'active'

export const canShowDoctorProfile = (doctor) => getDoctorAccessMode(doctor) !== 'hidden'

export const getDoctorBookingStatusText = (doctor) => (
  canBookDoctor(doctor)
    ? ''
    : 'Booking disabled by admin'
)
