import { useEffect, useState } from 'react'
import { Trash2, Star, CheckCircle, Search, Loader2, MessageSquare, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'
import { fmtDate } from '../../utils/format'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
]

const PAGE_SIZE = 10

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-forest-200'} />
      ))}
    </div>
  )
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [actioning, setActioning] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/reviews/admin/all')
      .then(({ data }) => setReviews(data.reviews || []))
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  useEffect(() => { setPage(1) }, [tab, search])

  const pendingCount = reviews.filter(r => !r.isApproved).length
  const approvedCount = reviews.filter(r => r.isApproved).length
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const tabFiltered = reviews.filter(r => tab === 'all' ? true : tab === 'pending' ? !r.isApproved : r.isApproved)
  const filtered = tabFiltered.filter(r => {
    const q = search.toLowerCase()
    if (!q) return true
    return r.name?.toLowerCase().includes(q) ||
      r.title?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q) ||
      r.product?.name?.toLowerCase().includes(q)
  })

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleApprove = async (r) => {
    setActioning(r._id)
    try {
      await api.put(`/reviews/admin/${r._id}/approve`)
      setReviews(prev => prev.map(x => x._id === r._id ? { ...x, isApproved: true } : x))
      toast.success('Review approved')
    } catch {
      toast.error('Failed to approve review')
    } finally {
      setActioning(null)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/reviews/admin/${deleteTarget._id}`)
      setReviews(prev => prev.filter(r => r._id !== deleteTarget._id))
      toast.success('Review deleted')
    } catch {
      toast.error('Failed to delete review')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-forest-900 font-serif">Reviews</h1>
        <p className="text-sm text-forest-500 mt-0.5">{reviews.length} total reviews</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-forest-900 mt-1">{reviews.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider">Approved</p>
          <p className="text-2xl font-bold text-forest-700 mt-1">{approvedCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider">Avg Rating</p>
          <p className="text-2xl font-bold text-forest-900 mt-1 flex items-center gap-1">
            {avgRating.toFixed(1)} <Star size={18} className="fill-amber-400 text-amber-400" />
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t.key ? 'bg-forest-800 text-white' : 'bg-white border border-forest-100 text-forest-600 hover:bg-forest-50'}`}>
              {t.label} {t.key === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9" placeholder="Search reviews..." />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['Product', 'Reviewer', 'Review', 'Rating', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-forest-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-forest-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-forest-100 rounded animate-pulse" style={{ width: `${50 + j * 5}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-forest-400">
                    <MessageSquare size={28} className="mx-auto mb-2 opacity-50" />
                    No reviews found
                  </td>
                </tr>
              ) : paged.map(r => (
                <tr key={r._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                  <td className="px-4 py-3 text-forest-900 font-medium max-w-[140px] truncate">{r.product?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-forest-900">{r.name}</span>
                      {r.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-forest-700 bg-forest-100 px-1.5 py-0.5 rounded-full">
                          <BadgeCheck size={10} /> Verified
                        </span>
                      )}
                    </div>
                    {r.city && <p className="text-xs text-forest-400">{r.city}</p>}
                  </td>
                  <td className="px-4 py-3 max-w-[260px]">
                    {r.title && <p className="font-medium text-forest-900 truncate">{r.title}</p>}
                    <p className="text-forest-600 text-xs truncate">{r.comment}</p>
                  </td>
                  <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${r.isApproved ? 'badge-green' : 'badge-gold'}`}>
                      {r.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-forest-500 text-xs whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {!r.isApproved && (
                        <button onClick={() => handleApprove(r)} disabled={actioning === r._id}
                          className="p-1.5 rounded-lg hover:bg-green-100 text-forest-400 hover:text-green-600 transition-colors" title="Approve">
                          {actioning === r._id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-100 text-forest-400 hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-forest-100">
            <p className="text-xs text-forest-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-forest-100 text-forest-500 hover:bg-forest-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-2 rounded-lg border border-forest-100 text-forest-500 hover:bg-forest-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1">Delete review?</h2>
            <p className="text-sm text-forest-500 mb-5">
              The review by <span className="font-semibold">{deleteTarget.name}</span> will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-outline-gold flex-1 justify-center text-sm">Cancel</button>
              <button onClick={handleDelete} className="flex-1 justify-center text-sm bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 flex items-center gap-2">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
