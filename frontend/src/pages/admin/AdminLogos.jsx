import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Image as ImageIcon, X, Search, Loader2, ToggleLeft, ToggleRight, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'

const emptyLogo = { name: '', altText: '', width: '120px', height: 'auto', status: 'active', order: '0' }

function LogoModal({ logo, onClose, onSaved }) {
  const isEdit = !!logo
  const [form, setForm] = useState(() => logo ? {
    name: logo.name || '',
    altText: logo.altText || '',
    width: logo.width || '120px',
    height: logo.height || 'auto',
    status: logo.status || 'active',
    order: String(logo.order ?? 0),
  } : emptyLogo)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(logo?.imageUrl || null)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Logo name is required')
    if (!isEdit && !file) return toast.error('Logo image is required')
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name.trim())
      formData.append('altText', form.altText || form.name.trim())
      formData.append('width', form.width || '120px')
      formData.append('height', form.height || 'auto')
      formData.append('status', form.status)
      formData.append('order', form.order || 0)
      if (file) formData.append('image', file)

      if (isEdit) {
        await api.put(`/logos/${logo._id}`, formData)
        toast.success('Logo updated')
      } else {
        await api.post('/logos', formData)
        toast.success('Logo created')
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
          <h2 className="font-bold text-forest-900 font-serif text-lg">{isEdit ? 'Edit Logo' : 'Add Logo'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Logo Image {!isEdit && '*'}</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl bg-forest-50 border border-forest-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {preview ? (
                  <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <ImageIcon size={24} className="text-forest-300" />
                )}
              </div>
              <label className="btn-outline-gold text-sm cursor-pointer">
                <Upload size={14} /> {file ? 'Change file' : 'Choose file'}
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Logo Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Header Logo, Footer Logo, Favicon..." required />
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Alt Text</label>
            <input name="altText" value={form.altText} onChange={handleChange} className="input" placeholder="Arebianveda" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Width</label>
              <input name="width" value={form.width} onChange={handleChange} className="input" placeholder="120px" />
            </div>
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Height</label>
              <input name="height" value={form.height} onChange={handleChange} className="input" placeholder="auto" />
            </div>
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Order</label>
              <input name="order" type="number" value={form.order} onChange={handleChange} className="input" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button type="submit" disabled={saving} className="btn-gold w-full justify-center text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} {isEdit ? 'Update Logo' : 'Create Logo'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminLogos() {
  const [logos, setLogos] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/logos')
      .then(({ data }) => setLogos(data.logos || []))
      .catch(() => toast.error('Failed to load logos'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = logos.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.altText?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleStatus = async (l) => {
    const next = l.status === 'active' ? 'inactive' : 'active'
    try {
      const formData = new FormData()
      formData.append('status', next)
      await api.put(`/logos/${l._id}`, formData)
      setLogos(prev => prev.map(x => x._id === l._id ? { ...x, status: next } : x))
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/logos/${deleteTarget._id}`)
      setLogos(prev => prev.filter(l => l._id !== deleteTarget._id))
      toast.success('Logo deleted')
    } catch {
      toast.error('Failed to delete logo')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">Logos</h1>
          <p className="text-sm text-forest-500 mt-0.5">{logos.length} total logos</p>
        </div>
        <button onClick={() => setModalState({})} className="btn-gold text-sm">
          <Plus size={16} /> Add Logo
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input pl-9" placeholder="Search logos..." />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['Logo', 'Name', 'Alt Text', 'Dimensions', 'Order', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-forest-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-forest-50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-forest-100 rounded animate-pulse" style={{ width: `${50 + j * 4}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-forest-400">
                    <ImageIcon size={28} className="mx-auto mb-2 opacity-50" />
                    No logos found
                  </td>
                </tr>
              ) : filtered.map(l => (
                <tr key={l._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-14 h-14 rounded-lg bg-forest-50 border border-forest-100 flex items-center justify-center overflow-hidden">
                      <img src={l.imageUrl} alt={l.altText || l.name} className="max-w-full max-h-full object-contain" />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-forest-900">{l.name}</td>
                  <td className="px-4 py-3 text-forest-600 max-w-[180px] truncate">{l.altText || '—'}</td>
                  <td className="px-4 py-3 text-forest-500 font-mono text-xs">{l.width} × {l.height}</td>
                  <td className="px-4 py-3 text-forest-600">{l.order}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(l)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${l.status === 'active' ? 'badge-green' : 'bg-gray-200 text-gray-700'}`}>
                      {l.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {l.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModalState(l)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(l)} className="p-1.5 rounded-lg hover:bg-red-100 text-forest-400 hover:text-red-500 transition-colors">
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

      {modalState !== null && (
        <LogoModal
          logo={modalState._id ? modalState : null}
          onClose={() => setModalState(null)}
          onSaved={() => { setModalState(null); load() }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1">Delete logo?</h2>
            <p className="text-sm text-forest-500 mb-5">
              <span className="font-semibold">{deleteTarget.name}</span> will be permanently removed.
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
