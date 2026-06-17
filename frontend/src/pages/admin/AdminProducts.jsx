import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'
import { fmtINR } from '../../utils/format'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/products?limit=100')
      .then(({ data }) => setProducts(data.products || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.categories?.some(c => c.toLowerCase().includes(search.toLowerCase()))
  )

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this product? It will be hidden from the store.')) return
    try {
      await api.delete(`/products/${id}`)
      setProducts(prev => prev.filter(p => p._id !== id))
      toast.success('Product deactivated')
    } catch {
      toast.error('Failed to deactivate product')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">Products</h1>
          <p className="text-sm text-forest-500 mt-0.5">{products.length} active products</p>
        </div>
        <Link to="/admin/products/new" className="btn-gold text-sm">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input pl-9" placeholder="Search products..." />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['Product', 'Category', 'Price', 'Stock', 'Sold', 'Rating', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-forest-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-forest-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-forest-100 rounded animate-pulse" style={{ width: `${60 + j * 5}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-forest-400">
                    <Package size={28} className="mx-auto mb-2 opacity-50" />
                    No products found
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.images?.[0]?.url} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-forest-100 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-forest-900 text-sm truncate max-w-[180px]">{p.name}</p>
                        <p className="text-xs text-forest-400 truncate max-w-[180px]">{p.tagline}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.categories?.map(c => (
                        <span key={c} className="badge-gold capitalize">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-forest-900">{fmtINR(p.price)}</p>
                    {p.comparePrice > p.price && <p className="text-xs text-forest-300 line-through">{fmtINR(p.comparePrice)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${p.stock <= 5 ? 'text-red-500' : p.stock <= 15 ? 'text-forest-800' : 'text-green-600'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-forest-600">{p.sold || 0}</td>
                  <td className="px-4 py-3 text-forest-600">{p.ratings?.average || 0} ⭐ ({p.ratings?.count || 0})</td>
                  <td className="px-4 py-3">
                    <span className={p.isActive !== false ? 'badge-green' : 'bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full'}>
                      {p.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link to={`/admin/products/${p._id}/edit`} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors">
                        <Edit2 size={15} />
                      </Link>
                      <button onClick={() => handleDeactivate(p._id)} className="p-1.5 rounded-lg hover:bg-red-100 text-forest-400 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
