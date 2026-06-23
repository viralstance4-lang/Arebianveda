import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react'
import ProductCard from '../components/ui/ProductCard'
import api from '../api'

// Concerns are loaded from the API (same active concerns as homepage)
const FORMS    = ['All', 'resin', 'capsule', 'lump', 'liquid']
const SORTS    = [
  { label: 'Popularity',      value: 'popular' },
  { label: 'Price: Low–High', value: 'price_asc' },
  { label: 'Price: High–Low', value: 'price_desc' },
  { label: 'Top Rated',       value: 'rating' },
]

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  const [mobileFilter, setMobileFilter] = useState(false)
  const [search, setSearch]     = useState(searchParams.get('search') || '')
  const [sort, setSort]         = useState('popular')
  const [concern, setConcern]   = useState(searchParams.get('concern') || 'All')
  const [form, setForm]         = useState('All')
  const [maxPrice, setMaxPrice] = useState(2000)
  const [products, setProducts] = useState([])
  const [concerns, setConcerns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/products?limit=200')
      .then(({ data }) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api.get('/concerns/active')
      .then(({ data }) => setConcerns(data.concerns || []))
      .catch(() => setConcerns([]))
  }, [])

  const filtered = useMemo(() => {
    let list = products.filter(p => p.isActive)
    if (search)            list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    if (concern !== 'All') list = list.filter(p => p.concerns?.includes(concern))
    if (form !== 'All')    list = list.filter(p => p.forms?.includes(form))
    list = list.filter(p => p.price <= maxPrice)
    if (sort === 'price_asc')  return [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') return [...list].sort((a, b) => b.price - a.price)
    if (sort === 'rating')     return [...list].sort((a, b) => b.ratings.average - a.ratings.average)
    return [...list].sort((a, b) => b.ratings.count - a.ratings.count)
  }, [products, search, concern, form, maxPrice, sort])

  const resetFilters = () => { setConcern('All'); setForm('All'); setSearch(''); setMaxPrice(2000) }
  const hasFilters = concern !== 'All' || form !== 'All' || search || maxPrice < 2000

  const FilterPanel = () => (
    <div className="space-y-6">
      <div className="relative">
        <input type="text" placeholder="Search products..." className="input pr-10 text-sm"
          value={search} onChange={e => setSearch(e.target.value)} />
        <Search size={16} className="absolute right-3 top-3.5 text-forest-600" />
      </div>
      <div>
        <p className="text-forest-800 font-semibold text-sm mb-3">Health Concern</p>
        <div className="space-y-1">
          {['All', ...concerns.map(c => c.label)].map(c => (
            <button key={c} onClick={() => setConcern(c)}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-colors ${concern === c ? 'bg-forest-100 text-forest-900 font-semibold' : 'text-forest-700 hover:bg-forest-100'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-forest-800 font-semibold text-sm mb-3">Product Form</p>
        <div className="space-y-1">
          {FORMS.map(f => (
            <button key={f} onClick={() => setForm(f)}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-colors capitalize ${form === f ? 'bg-forest-100 text-forest-900 font-semibold' : 'text-forest-700 hover:bg-forest-100'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-forest-800 font-semibold text-sm mb-3">Max Price: <span className="text-forest-800 font-bold">₹{maxPrice}</span></p>
        <input type="range" min={300} max={2000} step={100} value={maxPrice}
          onChange={e => setMaxPrice(Number(e.target.value))}
          className="w-full accent-forest-800" />
        <div className="flex justify-between text-xs text-forest-400 mt-1"><span>₹300</span><span>₹2000</span></div>
      </div>
      {hasFilters && (
        <button onClick={resetFilters} className="w-full btn-outline-gold text-sm py-2">Reset Filters</button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen">
      <div className="bg-forest-900 py-12 px-4 text-center">
        <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display',serif" }}>Our Products</h1>
        <p className="text-forest-300 text-sm">Premium Ayurvedic Wellness — FSSAI & GMP Certified</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="card p-5 sticky top-24">
              <p className="font-serif text-lg font-bold text-forest-900 mb-5">Filter Products</p>
              <FilterPanel />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <p className="text-forest-600 text-sm">
                <span className="font-bold text-forest-900">{filtered.length}</span> products found
              </p>
              <div className="flex gap-3 items-center">
                <button onClick={() => setMobileFilter(true)}
                  className="lg:hidden flex items-center gap-2 border border-forest-600 text-forest-900 rounded-full px-4 py-2 text-sm">
                  <SlidersHorizontal size={15} /> Filters
                </button>
                <div className="relative">
                  <select value={sort} onChange={e => setSort(e.target.value)}
                    className="appearance-none border border-forest-200 rounded-xl px-4 py-2 pr-8 text-sm bg-white text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-300 cursor-pointer">
                    {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3 text-forest-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-5">
                {concern !== 'All' && <span className="badge-gold flex items-center gap-1">{concern}<button onClick={() => setConcern('All')}><X size={11} /></button></span>}
                {form !== 'All' && <span className="badge-green flex items-center gap-1 capitalize">{form}<button onClick={() => setForm('All')}><X size={11} /></button></span>}
                {maxPrice < 2000 && <span className="badge-gold flex items-center gap-1">Under ₹{maxPrice}<button onClick={() => setMaxPrice(2000)}><X size={11} /></button></span>}
              </div>
            )}

            {loading ? (
              <div className="text-center py-24">Loading products…</div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map(p => <ProductCard key={p._id} product={p} />)}
              </div>
            ) : (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">🌿</div>
                <h3 className="text-xl font-semibold text-forest-800 mb-2">No products found</h3>
                <p className="text-forest-500 text-sm mb-5">Try adjusting your filters</p>
                <button onClick={resetFilters} className="btn-gold">Show All Products</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileFilter && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFilter(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-forest-50 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <p className="font-serif text-lg font-bold text-forest-900">Filters</p>
              <button onClick={() => setMobileFilter(false)}><X size={20} className="text-forest-600" /></button>
            </div>
            <FilterPanel />
          </div>
        </div>
      )}
    </div>
  )
}
