import { useNavigate } from 'react-router-dom'
import { IoCloseOutline, IoSearchOutline, IoChevronForwardOutline } from 'react-icons/io5'

const topLocalities = [
  'Vijay Nagar',
  'Old Palasia',
  'New Palasia',
  'Sapna Sangeeta',
  'AB Road',
  'South Tukoganj',
  'LIG Colony',
  'Sudama Nagar',
  'Indore Kanadia Road',
  'Pipliyahana',
]

export default function PatientLocations() {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate(-1)
  }

  return (
    <section className="min-h-screen bg-white pb-24 text-slate-800">
      <header className="px-4 pb-6 pt-6 shadow-sm">
        <div className="flex items-center justify-between text-slate-900">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="Close"
          >
            <IoCloseOutline aria-hidden="true" />
          </button>
          <h1 className="text-base font-semibold">Enter your city or locality</h1>
          <span className="h-10 w-10" aria-hidden="true" />
        </div>
        <div className="mt-5 flex items-center rounded-full border border-slate-200 bg-white px-4 py-3 text-slate-600 shadow-inner">
          <IoSearchOutline className="text-lg text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search your location here"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-base text-slate-600 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </header>

      <main className="divide-y divide-slate-100">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-base font-semibold text-primary transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:underline"
        >
          <span>Use current location</span>
          <IoChevronForwardOutline aria-hidden="true" className="text-lg text-slate-300" />
        </button>
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left text-base font-semibold text-primary transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:underline"
        >
          <span>Search in entire Indore</span>
          <IoChevronForwardOutline aria-hidden="true" className="text-lg text-slate-300" />
        </button>

        <section aria-labelledby="top-localities" className="mt-3">
          <h2
            id="top-localities"
            className="bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Top Localities in Indore
          </h2>
          <ul>
            {topLocalities.map((location) => (
              <li key={location} className="border-b border-slate-100 last:border-none">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-base font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:bg-slate-200"
                >
                  <span>{location}</span>
                  <IoChevronForwardOutline aria-hidden="true" className="text-lg text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </section>
  )
}
