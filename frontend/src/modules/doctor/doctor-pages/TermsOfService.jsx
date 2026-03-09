import LegalContentPage from '../../shared/LegalContentPage'

const TermsOfService = ({ role = 'doctor' }) => {
  return <LegalContentPage type="terms" role={role} />
}

export default TermsOfService
