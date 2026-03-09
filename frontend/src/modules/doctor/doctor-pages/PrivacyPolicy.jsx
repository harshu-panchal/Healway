import LegalContentPage from '../../shared/LegalContentPage'

const PrivacyPolicy = ({ role = 'doctor' }) => {
  return <LegalContentPage type="privacy" role={role} />
}

export default PrivacyPolicy
