import React, { useState, useEffect } from 'react'
import {
    IoAddOutline,
    IoSearchOutline,
    IoTrashOutline,
    IoLocationOutline,
    IoBusinessOutline,
} from 'react-icons/io5'
import { useToast } from '../../../contexts/ToastContext'
import adminService from '../admin-services/adminService'
import PageLoader from '../../../components/PageLoader'

const AdminLocationManagement = () => {
    const [states, setStates] = useState([])
    const [cities, setCities] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('states') // 'states' or 'cities'
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    
    const toast = useToast()

    const [stateFormData, setStateFormData] = useState({ name: '' })
    const [cityFormData, setCityFormData] = useState({ name: '', stateId: '' })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const statesRes = await adminService.getStates()
            if (statesRes && statesRes.success) {
                setStates(statesRes.data || [])
            } else {
                setStates([])
            }
            
            // Note: We don't have a global "get all cities" API in the requirements, 
            // but we might want to list cities for the active state or just have a way to view them.
            // The requirement says GET /api/v1/admin/city/:stateId.
            // For management, maybe we just list states and have a "view cities" button.
        } catch (error) {
            toast.error('Failed to fetch location data')
        } finally {
            setLoading(false)
        }
    }

    const handleStateSubmit = async (e) => {
        e.preventDefault()
        try {
            setSubmitting(true)
            await adminService.createState(stateFormData)
            toast.success('State added successfully')
            setStateFormData({ name: '' })
            setShowModal(false)
            fetchData()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add state')
        } finally {
            setSubmitting(false)
        }
    }

    const handleCitySubmit = async (e) => {
        e.preventDefault()
        try {
            setSubmitting(true)
            await adminService.createCity(cityFormData)
            toast.success('City added successfully')
            setCityFormData({ name: '', stateId: '' })
            setShowModal(false)
            // If we are on cities tab and have a state selected, we might want to refresh cities
            if (cityFormData.stateId) {
                fetchCities(cityFormData.stateId)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add city')
        } finally {
            setSubmitting(false)
        }
    }

    const fetchCities = async (stateId) => {
        try {
            const res = await adminService.getCitiesByState(stateId)
            if (res && res.success) {
                setCities(res.data || [])
            } else {
                setCities([])
            }
        } catch (error) {
            toast.error('Failed to fetch cities')
        }
    }

    const handleDeleteState = async (stateId, stateName) => {
        try {
            setLoading(true)
            await adminService.deleteState(stateId)
            toast.success('State deleted successfully')
            fetchData()
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete state')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteCity = async (cityId, cityName) => {
        try {
            setLoading(true)
            await adminService.deleteCity(cityId)
            toast.success('City deleted successfully')
            if (cityFormData.stateId) {
                fetchCities(cityFormData.stateId)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete city')
        } finally {
            setLoading(false)
        }
    }

    const filteredStates = states.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading && states.length === 0) return <PageLoader />

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Location Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage states and cities for doctor registration</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-all shadow-md active:scale-95"
                >
                    <IoAddOutline className="text-xl" />
                    <span>Add New {activeTab === 'states' ? 'State' : 'City'}</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
                <button
                    onClick={() => { setActiveTab('states'); setSearchQuery(''); }}
                    className={`px-6 py-3 font-medium transition-all border-b-2 ${activeTab === 'states' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    States
                </button>
                <button
                    onClick={() => { setActiveTab('cities'); setSearchQuery(''); }}
                    className={`px-6 py-3 font-medium transition-all border-b-2 ${activeTab === 'cities' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Cities
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-md">
                    <div className="relative">
                        <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl border-none focus:ring-0 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'states' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStates.map((state) => (
                        <div key={state._id} className="relative group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteState(state._id, state.name); }}
                                className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete State"
                            >
                                <IoTrashOutline className="text-lg" />
                            </button>
                            <div className="flex items-center gap-3 mb-4 pr-8">
                                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                    <IoLocationOutline className="text-xl" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 truncate">{state.name}</h3>
                            </div>
                            <div className="flex justify-between items-center">
                                <button 
                                    onClick={() => {
                                        setCityFormData({ ...cityFormData, stateId: state._id });
                                        setActiveTab('cities');
                                        fetchCities(state._id);
                                    }}
                                    className="text-primary text-sm font-medium hover:underline"
                                >
                                    View Cities
                                </button>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${state.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {state.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {filteredStates.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-500">No states found.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4">
                        <label className="text-sm font-medium text-slate-700">Filter by State:</label>
                        <select 
                            value={cityFormData.stateId} 
                            onChange={(e) => {
                                setCityFormData({ ...cityFormData, stateId: e.target.value });
                                if (e.target.value) fetchCities(e.target.value);
                                else setCities([]);
                            }}
                            className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="">Select a State</option>
                            {states.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">City Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((city) => (
                                    <tr key={city._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <IoBusinessOutline className="text-slate-400" />
                                                <span className="text-sm font-bold text-slate-900">{city.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${city.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {city.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDeleteCity(city._id, city.name)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete City"
                                            >
                                                <IoTrashOutline className="text-lg" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {cities.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-slate-500 italic">
                                            {cityFormData.stateId ? 'No cities found for this state.' : 'Please select a state to view cities.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !submitting && setShowModal(false)}></div>
                    <div className="bg-white rounded-3xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-900">Add New {activeTab === 'states' ? 'State' : 'City'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-500">
                                <IoAddOutline className="text-2xl rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={activeTab === 'states' ? handleStateSubmit : handleCitySubmit} className="p-6 space-y-4">
                            {activeTab === 'cities' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select State</label>
                                    <select
                                        required
                                        value={cityFormData.stateId}
                                        onChange={(e) => setCityFormData({ ...cityFormData, stateId: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    >
                                        <option value="">Select a State</option>
                                        {states.map(s => (
                                            <option key={s._id} value={s._id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{activeTab === 'states' ? 'State' : 'City'} Name</label>
                                <input
                                    type="text"
                                    required
                                    value={activeTab === 'states' ? stateFormData.name : cityFormData.name}
                                    onChange={(e) => activeTab === 'states' 
                                        ? setStateFormData({ name: e.target.value }) 
                                        : setCityFormData({ ...cityFormData, name: e.target.value })
                                    }
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    placeholder={`e.g. ${activeTab === 'states' ? 'California' : 'Los Angeles'}`}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-6 py-2.5 rounded-xl font-medium text-white bg-primary hover:bg-primary-dark transition-colors shadow-lg disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminLocationManagement
