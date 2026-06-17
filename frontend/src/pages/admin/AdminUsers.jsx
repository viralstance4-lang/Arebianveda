import { useEffect, useState } from 'react'
import { Search, Users, X, Eye, Loader2, MapPin, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'
import { fmtINR, fmtDate } from '../../utils/format'

const TYPE_TABS = [
  { key: '', label: 'All' },
  { key: 'registered', label: 'Registered' },
  { key: 'guest', label: 'Guest Buyers' },
  { key: 'subscriber', label: 'Subscribers' },
]

const TYPE_BADGES = {
  registered: 'bg-green-100 text-green-700',
  guest: 'bg-blue-100 text-blue-700',
  subscriber: 'bg-purple-100 text-purple-700',
}

function CustomerDrawer({ id, onClose }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/admin/customers/${id}`)
      .then(({ data }) => setUser(data.user))
      .catch(() => toast.error('Failed to load customer'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative w-full sm:w-[420px] max-w-full bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-forest-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-forest-900 font-serif text-lg">Customer Details</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400">
            <X size={20} />
          </button>
        </div>

        {loading || !user ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-forest-800" size={28} /></div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-forest-800 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-forest-900 truncate">{user.name}</p>
                <p className="text-xs text-forest-400">Joined {fmtDate(user.createdAt)}</p>
              </div>
            </div>

            <div className="card p-4 space-y-2 text-sm">
              <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-2">Contact</h3>
              <p className="flex items-center gap-2 text-forest-700"><Mail size={14} className="text-forest-400" /> {user.email}</p>
              {user.phone && <p className="flex items-center gap-2 text-forest-700"><Phone size={14} className="text-forest-400" /> {user.phone}</p>}
              <p className="text-xs text-forest-400 mt-1">
                {user.isVerified ? 'Verified' : 'Not verified'} · {user.phoneVerified ? 'Phone verified' : 'Phone not verified'}
              </p>
            </div>

            {user.addresses?.length > 0 && (
              <div className="card p-4">
                <h3 className="text-xs font-semibold text-forest-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin size={13} /> Saved Addresses ({user.addresses.length})
                </h3>
                <div className="space-y-3">
                  {user.addresses.map((a, i) => (
                    <div key={i} className="text-sm border-t border-forest-50 pt-2 first:border-t-0 first:pt-0">
                      <p className="font-medium text-forest-900">{a.name} {a.isDefault && <span className="badge-gold ml-1">Default</span>}</p>
                      <p className="text-xs text-forest-600">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                      <p className="text-xs text-forest-600">{a.city}, {a.state} - {a.pincode}</p>
                      <p className="text-xs text-forest-400">{a.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-4 text-sm flex items-center justify-between">
              <span className="text-forest-600">Wishlist items</span>
              <span className="font-semibold text-forest-900">{user.wishlist?.length || 0}</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

export default function AdminUsers() {
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 20 })
    if (type) params.set('type', type)
    if (search) params.set('search', search)
    api.get(`/admin/customers?${params}`)
      .then(({ data }) => {
        setCustomers(data.customers || [])
        setTotal(data.total || 0)
        setPages(data.pages || 1)
      })
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(load, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [page, type, search])

  useEffect(() => { setPage(1) }, [type, search])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-forest-900 font-serif">Customers</h1>
        <p className="text-sm text-forest-500 mt-0.5">{total} total</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          {TYPE_TABS.map(t => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${type === t.key ? 'bg-forest-800 text-white' : 'bg-forest-50 text-forest-600 hover:bg-forest-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9" placeholder="Search name or email..." />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['Name', 'Email', 'Phone', 'Type', 'Orders', 'Total Spent', 'Joined', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-forest-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-forest-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-forest-100 rounded animate-pulse" style={{ width: `${50 + j * 5}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-forest-400">
                    <Users size={28} className="mx-auto mb-2 opacity-50" />
                    No customers found
                  </td>
                </tr>
              ) : customers.map(c => (
                <tr key={c._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-forest-900">{c.name || '—'}</td>
                  <td className="px-4 py-3 text-forest-600">{c.email}</td>
                  <td className="px-4 py-3 text-forest-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${TYPE_BADGES[c.type] || 'bg-gray-100 text-gray-700'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-forest-600">{c.orderCount}</td>
                  <td className="px-4 py-3 font-semibold text-forest-900">{fmtINR(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-forest-600 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    {c.type === 'registered' && (
                      <button onClick={() => setSelectedId(c._id)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors">
                        <Eye size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-forest-100">
            <p className="text-xs text-forest-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg border border-forest-200 text-forest-500 disabled:opacity-30 hover:bg-forest-50">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
                className="p-1.5 rounded-lg border border-forest-200 text-forest-500 disabled:opacity-30 hover:bg-forest-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && <CustomerDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
