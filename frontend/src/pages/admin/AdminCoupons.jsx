import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Tag, X, Search, Gift, Loader2, Percent, Zap, Users as UsersIcon, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'
import { fmtINR, fmtDate } from '../../utils/format'

const emptyCoupon = {
  code: '', description: '', discountType: 'percentage', discountValue: '',
  giftProduct: null, applicationMode: 'manual',
  minOrderValue: '0', maxDiscountAmount: '', usageLimit: '0', expiresAt: '', isActive: true,
}

function GiftProductPicker({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(() => {
      api.get(`/products?search=${encodeURIComponent(query)}&limit=8`)
        .then(({ data }) => setResults(data.products || []))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  if (value) {
    return (
      <div className="flex items-center gap-3 p-2 border border-forest-200 rounded-xl bg-forest-50">
        <img src={value.images?.[0]?.url} alt={value.name} className="w-10 h-10 rounded-lg object-cover bg-forest-100 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-forest-900 truncate">{value.name}</p>
          <p className="text-xs text-forest-400">{fmtINR(value.price)} · {value.stock ?? 0} in stock</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="p-1 text-forest-400 hover:text-red-500"><X size={16} /></button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
        <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)}
          className="input pl-8" placeholder="Search product to gift..." />
      </div>
      {open && query && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-forest-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {searching ? (
            <div className="p-3 text-center"><Loader2 size={16} className="animate-spin text-forest-800 mx-auto" /></div>
          ) : results.length === 0 ? (
            <p className="p-3 text-xs text-forest-400 text-center">No products found</p>
          ) : results.map(p => (
            <button type="button" key={p._id} onClick={() => { onChange(p); setOpen(false); setQuery('') }}
              className="w-full flex items-center gap-3 p-2 hover:bg-forest-50 text-left">
              <img src={p.images?.[0]?.url} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-forest-100 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-forest-900 truncate">{p.name}</p>
                <p className="text-xs text-forest-400">{fmtINR(p.price)} · {p.stock ?? 0} in stock</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CouponModal({ coupon, onClose, onSaved }) {
  const isEdit = !!coupon
  const [form, setForm] = useState(() => coupon ? {
    ...emptyCoupon,
    ...coupon,
    discountValue: String(coupon.discountValue ?? ''),
    minOrderValue: String(coupon.minOrderValue ?? '0'),
    maxDiscountAmount: coupon.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : '',
    usageLimit: String(coupon.usageLimit ?? '0'),
    expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
    giftProduct: coupon.giftProduct || null,
  } : emptyCoupon)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.code.trim()) return toast.error('Coupon code is required')
    if (form.discountType === 'free_gift') {
      if (!form.giftProduct) return toast.error('Please select a gift product')
      if (!form.minOrderValue || Number(form.minOrderValue) <= 0) return toast.error('Minimum order value is required for free gift coupons')
    } else {
      if (!form.discountValue || Number(form.discountValue) <= 0) return toast.error('Discount value is required')
      if (form.discountType === 'percentage' && Number(form.discountValue) > 100) return toast.error('Percentage discount cannot exceed 100')
    }
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description,
        discountType: form.discountType,
        discountValue: Number(form.discountValue) || 0,
        applicationMode: form.applicationMode,
        minOrderValue: Number(form.minOrderValue) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
        usageLimit: Number(form.usageLimit) || 0,
        expiresAt: form.expiresAt || undefined,
        isActive: form.isActive,
        giftProduct: form.discountType === 'free_gift' ? form.giftProduct?._id : undefined,
      }
      if (isEdit) {
        await api.put(`/coupons/${coupon._id}`, payload)
        toast.success('Coupon updated')
      } else {
        await api.post('/coupons', payload)
        toast.success('Coupon created')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-forest-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-forest-900 font-serif text-lg">{isEdit ? 'Edit Coupon' : 'Create Coupon'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Coupon Code *</label>
              <input name="code" value={form.code} onChange={handleChange} className="input uppercase" placeholder="WELCOME10" required />
            </div>
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Discount Type</label>
              <select name="discountType" value={form.discountType} onChange={handleChange} className="input">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
                <option value="free_gift">Free Gift</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Description</label>
            <input name="description" value={form.description} onChange={handleChange} className="input" placeholder="Get 10% off on your first order" />
          </div>

          {form.discountType === 'free_gift' ? (
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Gift Product *</label>
              <GiftProductPicker value={form.giftProduct} onChange={p => setForm(f => ({ ...f, giftProduct: p }))} />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Discount Value ({form.discountType === 'percentage' ? '%' : '₹'}) *</label>
              <input name="discountValue" type="number" min="0" value={form.discountValue} onChange={handleChange} className="input" placeholder={form.discountType === 'percentage' ? '10' : '100'} />
            </div>
          )}

          <div>
            <label className="block text-xs text-forest-500 mb-2">Application Mode</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="applicationMode" value="manual" checked={form.applicationMode === 'manual'} onChange={handleChange} className="accent-forest-800" />
                <span className="text-sm text-forest-700">Manual (user enters code)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="applicationMode" value="auto" checked={form.applicationMode === 'auto'} onChange={handleChange} className="accent-forest-800" />
                <span className="text-sm text-forest-700">Auto-apply</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Min Order Value (₹) {form.discountType === 'free_gift' && '*'}</label>
              <input name="minOrderValue" type="number" min="0" value={form.minOrderValue} onChange={handleChange} className="input" />
            </div>
            {form.discountType === 'percentage' && (
              <div>
                <label className="block text-xs text-forest-500 mb-1.5">Max Discount Cap (₹)</label>
                <input name="maxDiscountAmount" type="number" min="0" value={form.maxDiscountAmount} onChange={handleChange} className="input" placeholder="No cap" />
              </div>
            )}
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Usage Limit (0 = unlimited)</label>
              <input name="usageLimit" type="number" min="0" value={form.usageLimit} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Expiry Date</label>
              <input name="expiresAt" type="date" value={form.expiresAt} onChange={handleChange} className="input" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="accent-forest-800 w-4 h-4" />
            <span className="text-sm text-forest-700">Active</span>
          </label>

          <button type="submit" disabled={saving} className="btn-gold w-full justify-center text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} {isEdit ? 'Update Coupon' : 'Create Coupon'}
          </button>
        </form>
      </div>
    </div>
  )
}

function discountLabel(c) {
  if (c.discountType === 'free_gift') return `Free Gift${c.giftProduct?.name ? `: ${c.giftProduct.name}` : ''}`
  if (c.discountType === 'percentage') return `${c.discountValue}% off${c.maxDiscountAmount ? ` (max ${fmtINR(c.maxDiscountAmount)})` : ''}`
  return `${fmtINR(c.discountValue)} off`
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState(null) // null=closed, {}=create, coupon=edit
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/coupons')
      .then(({ data }) => setCoupons(data.coupons || []))
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const toggleActive = async (c) => {
    try {
      await api.put(`/coupons/${c._id}`, { isActive: !c.isActive })
      setCoupons(prev => prev.map(x => x._id === c._id ? { ...x, isActive: !x.isActive } : x))
    } catch {
      toast.error('Failed to update coupon')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/coupons/${deleteTarget._id}`)
      setCoupons(prev => prev.filter(c => c._id !== deleteTarget._id))
      toast.success('Coupon deleted')
    } catch {
      toast.error('Failed to delete coupon')
    } finally {
      setDeleteTarget(null)
    }
  }

  const activeCount = coupons.filter(c => c.isActive).length
  const totalUsed = coupons.reduce((a, c) => a + (c.usedCount || 0), 0)
  const giftsDistributed = coupons.filter(c => c.discountType === 'free_gift').reduce((a, c) => a + (c.usedCount || 0), 0)
  const autoUses = coupons.filter(c => c.applicationMode === 'auto').reduce((a, c) => a + (c.usedCount || 0), 0)
  const manualUses = totalUsed - autoUses

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">Coupons</h1>
          <p className="text-sm text-forest-500 mt-0.5">{coupons.length} total coupons</p>
        </div>
        <button onClick={() => setModalState({})} className="btn-gold text-sm">
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider mb-1">Active</p>
          <p className="text-xl font-bold text-forest-900">{activeCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider mb-1">Total Uses</p>
          <p className="text-xl font-bold text-forest-900">{totalUsed}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Gift size={12} /> Gifts Given</p>
          <p className="text-xl font-bold text-forest-900">{giftsDistributed}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Zap size={12} /> Auto Uses</p>
          <p className="text-xl font-bold text-forest-900">{autoUses}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider mb-1 flex items-center gap-1"><UsersIcon size={12} /> Manual Uses</p>
          <p className="text-xl font-bold text-forest-900">{manualUses}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['Code', 'Description', 'Discount', 'Mode', 'Usage', 'Min Order', 'Expiry', 'Status', ''].map(h => (
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
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-forest-100 rounded animate-pulse" style={{ width: `${50 + j * 4}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-forest-400">
                    <Tag size={28} className="mx-auto mb-2 opacity-50" />
                    No coupons yet
                  </td>
                </tr>
              ) : coupons.map(c => {
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date()
                return (
                  <tr key={c._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-forest-900">{c.code}</td>
                    <td className="px-4 py-3 text-forest-600 max-w-[180px] truncate">{c.description || '—'}</td>
                    <td className="px-4 py-3 text-forest-700">
                      <span className="flex items-center gap-1.5">
                        {c.discountType === 'free_gift' ? <Gift size={13} className="text-green-500" /> : <Percent size={13} className="text-forest-800" />}
                        {discountLabel(c)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.applicationMode === 'auto' ? 'bg-blue-100 text-blue-700' : 'bg-forest-100 text-forest-700'}`}>
                        {c.applicationMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-forest-600">{c.usedCount || 0} / {c.usageLimit > 0 ? c.usageLimit : '∞'}</td>
                    <td className="px-4 py-3 text-forest-600">{fmtINR(c.minOrderValue || 0)}</td>
                    <td className="px-4 py-3 text-forest-600 whitespace-nowrap">{c.expiresAt ? fmtDate(c.expiresAt) : '—'}</td>
                    <td className="px-4 py-3">
                      {expired ? (
                        <span className="bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">Expired</span>
                      ) : (
                        <button onClick={() => toggleActive(c)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${c.isActive ? 'badge-green' : 'bg-red-100 text-red-700'}`}>
                          {c.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {c.isActive ? 'Active' : 'Inactive'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModalState(c)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-100 text-forest-400 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalState !== null && (
        <CouponModal
          coupon={modalState._id ? modalState : null}
          onClose={() => setModalState(null)}
          onSaved={() => { setModalState(null); load() }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1">Delete coupon?</h2>
            <p className="text-sm text-forest-500 mb-5">
              <span className="font-mono font-semibold">{deleteTarget.code}</span> will be permanently removed.
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
