import { useState, useEffect } from 'react'
import {
  IoSearchOutline,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import Pagination from '../../../components/Pagination'

const AdminRequests = () => {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    // Currently no other active request types
    setRequests([])
    setLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Service Requests</h1>
          <p className="text-sm text-slate-600">View and manage patient service requests</p>
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
            <IoSearchOutline className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No requests found</h2>
          <p className="text-slate-500 max-w-xs mx-auto">
            There are currently no active service requests to manage.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminRequests
