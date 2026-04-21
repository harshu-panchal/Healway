const { APPROVAL_STATUS, DOCTOR_ACCESS_MODES } = require('./constants');

const getDoctorAccessMode = (doctor) => {
  if (doctor?.accessMode === DOCTOR_ACCESS_MODES.VISIBLE_UNBOOKABLE) {
    return DOCTOR_ACCESS_MODES.VISIBLE_UNBOOKABLE;
  }

  if (doctor?.accessMode === DOCTOR_ACCESS_MODES.HIDDEN) {
    return DOCTOR_ACCESS_MODES.HIDDEN;
  }

  if (doctor?.accessMode === DOCTOR_ACCESS_MODES.ACTIVE) {
    return DOCTOR_ACCESS_MODES.ACTIVE;
  }

  return doctor?.isActive === false
    ? DOCTOR_ACCESS_MODES.HIDDEN
    : DOCTOR_ACCESS_MODES.ACTIVE;
};

const canDoctorLogin = (doctor) => getDoctorAccessMode(doctor) === DOCTOR_ACCESS_MODES.ACTIVE;

const isDoctorVisibleToPatients = (doctor) =>
  doctor &&
  doctor.status === APPROVAL_STATUS.APPROVED &&
  getDoctorAccessMode(doctor) !== DOCTOR_ACCESS_MODES.HIDDEN;

const isDoctorBookableByPatients = (doctor) =>
  isDoctorVisibleToPatients(doctor) &&
  getDoctorAccessMode(doctor) === DOCTOR_ACCESS_MODES.ACTIVE;

const isTokenRevokedForDoctor = (doctor, decodedToken) => {
  if (!doctor?.authRevokedAt || !decodedToken?.iat) {
    return false;
  }

  return (decodedToken.iat * 1000) <= new Date(doctor.authRevokedAt).getTime();
};

module.exports = {
  getDoctorAccessMode,
  canDoctorLogin,
  isDoctorVisibleToPatients,
  isDoctorBookableByPatients,
  isTokenRevokedForDoctor,
};
