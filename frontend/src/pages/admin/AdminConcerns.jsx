import { useEffect, useRef, useState } from 'react'
import { Plus, Edit2, Trash2, Image as ImageIcon, X, Search, Loader2, ToggleLeft, ToggleRight, Upload, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'
import { CONCERN_THEMES, getConcernTheme } from '../../constants/concernThemes'

const emptyForm = {
  label: '', icon: '', colorTheme: 'green', link: '', displayOrder: '0', isActive: true,
}

function ConcernModal({ concern, onClose, onSaved }) {
  const isEdit = !!concern
  const [form, setForm] = useState(() => concern ? {
    label: concern.label || '',
    icon: concern.icon || '',
    colorTheme: concern.colorTheme || 'green',
    link: concern.link || '',
    displayOrder: String(concern.displayOrder ?? 0),
    isActive: concern.isActive !== false,
  } : emptyForm)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(concern?.image || null)
  const [removeImageFlag, setRemoveImageFlag] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImageFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
    setRemoveImageFlag(false)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setRemoveImageFlag(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('label', form.label.trim())
      formData.append('icon', form.icon)
      formData.append('colorTheme', form.colorTheme)
      formData.append('link', form.link)
      formData.append('displayOrder', form.displayOrder || 0)
      formData.append('isActive', form.isActive ? 'true' : 'false')
      if (imageFile) formData.append('image', imageFile)
      if (removeImageFlag) formData.append('removeImage', 'true')

      if (isEdit) {
        await api.put(`/concerns/${concern._id}`, formData)
        toast.success('Concern updated')
      } else {
        await api.post('/concerns', formData)
        toast.success('Concern created')
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
          <h2 className="font-bold text-forest-900 font-serif text-lg">{isEdit ? 'Edit Concern' : 'Add Concern'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Label</label>
            <input name="label" value={form.label} onChange={handleChange} className="input" placeholder="Energy & Stamina" />
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5 flex items-center gap-1.5">
              <ImageIcon size={13} /> Card Image <span className="text-forest-400">(optional — used instead of the icon below)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="border border-forest-200 rounded-xl bg-forest-50 w-16 h-16 flex items-center justify-center overflow-hidden flex-shrink-0">
                {imagePreview ? <img src={imagePreview} alt="Card preview" className="w-full h-full object-cover" /> : <ImageIcon size={22} className="text-forest-300" />}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="btn-outline-gold text-sm cursor-pointer">
                  <Upload size={14} /> {imageFile ? 'Change file' : 'Choose file'}
                  <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                </label>
                {imagePreview && (
                  <button type="button" onClick={handleRemoveImage} className="text-xs text-red-500 hover:underline text-left">
                    Remove image (use icon instead)
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Icon <span className="text-forest-400">(emoji — shown if no image is set)</span></label>
            <input name="icon" value={form.icon} onChange={handleChange} className="input" placeholder="⚡" maxLength={8} />
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Card Color Theme</label>
            <select name="colorTheme" value={form.colorTheme} onChange={handleChange} className="input">
              {CONCERN_THEMES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Link <span className="text-forest-400">(optional — defaults to /shop?concern=label)</span></label>
            <input name="link" value={form.link} onChange={handleChange} className="input" placeholder="/shop?concern=Energy%20%26%20Stamina or https://..." />
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Display Order</label>
            <input name="displayOrder" type="number" value={form.displayOrder} onChange={handleChange} className="input" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="w-4 h-4 accent-forest-800" />
            <span className="text-sm text-forest-800 font-medium">Active (visible on homepage)</span>
          </label>

          <button type="submit" disabled={saving} className="btn-gold w-full justify-center text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} {isEdit ? 'Update Concern' : 'Create Concern'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminConcerns() {
  const [concerns, setConcerns] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  const load = () => {
    setLoading(true)
    api.get('/concerns')
      .then(({ data }) => setConcerns(data.concerns || []))
      .catch(() => toast.error('Failed to load concerns'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = concerns.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))
  const reorderable = !search

  const toggleActive = async (c) => {
    try {
      const formData = new FormData()
      formData.append('isActive', (!c.isActive).toString())
      await api.put(`/concerns/${c._id}`, formData)
      setConcerns(prev => prev.map(x => x._id === c._id ? { ...x, isActive: !c.isActive } : x))
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/concerns/${deleteTarget._id}`)
      setConcerns(prev => prev.filter(c => c._id !== deleteTarget._id))
      toast.success('Concern deleted')
    } catch {
      toast.error('Failed to delete concern')
    } finally {
      setDeleteTarget(null)
    }
  }

  // ── Drag & drop reorder (native HTML5 DnD, no extra dependency) ─────────────
  const handleDragStart = (index) => { dragItem.current = index }
  const handleDragEnter = (index) => { dragOverItem.current = index }

  const handleDragEnd = async () => {
    const from = dragItem.current
    const to = dragOverItem.current
    dragItem.current = null
    dragOverItem.current = null
    if (from === null || to === null || from === to || !reorderable) return

    const reordered = [...concerns]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const withOrder = reordered.map((c, i) => ({ ...c, displayOrder: i }))
    setConcerns(withOrder)

    try {
      await api.put('/concerns/reorder', {
        order: withOrder.map(c => ({ _id: c._id, displayOrder: c.displayOrder })),
      })
    } catch {
      toast.error('Failed to save new order')
      load()
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">Shop by Health Concern</h1>
          <p className="text-sm text-forest-500 mt-0.5">{concerns.length} total concerns · drag rows to reorder</p>
        </div>
        <button onClick={() => setModalState({})} className="btn-gold text-sm">
          <Plus size={16} /> Add Concern
        </button>
      </div>

      <div className="card p-4 text-sm text-forest-600 bg-forest-50/50 border border-forest-100">
        Concerns marked <span className="font-semibold">Active</span> appear in the "Shop by Health Concern" grid on the homepage, sorted by Display Order. Each card shows its uploaded image, or falls back to the emoji icon if no image is set. If no active concerns exist, the homepage falls back to the default set.
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input pl-9" placeholder="Search concerns..." />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['', 'Preview', 'Label', 'Theme', 'Status', 'Order', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-forest-500 uppercase tracking-wider whitespace-nowrap">
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
                    No concerns found. Click "Add Concern" to create your first card.
                  </td>
                </tr>
              ) : filtered.map((c, index) => {
                const theme = getConcernTheme(c.colorTheme)
                return (
                  <tr
                    key={c._id}
                    draggable={reorderable}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className={`border-b border-forest-50 hover:bg-forest-50/50 transition-colors ${reorderable ? 'cursor-move' : ''}`}
                  >
                    <td className="px-2 py-3 text-forest-300"><GripVertical size={16} /></td>
                    <td className="px-4 py-3">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-b ${theme.gradient} border ${theme.border} overflow-hidden flex items-center justify-center flex-shrink-0`}>
                        {c.image ? <img src={c.image} alt={c.label} className="w-full h-full object-cover" /> : <span className="text-2xl">{c.icon || '—'}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-forest-900">{c.label || <span className="text-forest-400 italic">Untitled concern</span>}</p>
                    </td>
                    <td className="px-4 py-3 text-forest-600 text-xs">{theme.label}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(c)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${c.isActive ? 'badge-green' : 'bg-gray-200 text-gray-700'}`}>
                        {c.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {c.isActive ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-forest-600">{c.displayOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModalState(c)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors" title="Edit">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-100 text-forest-400 hover:text-red-500 transition-colors" title="Delete">
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
        <ConcernModal
          concern={modalState._id ? modalState : null}
          onClose={() => setModalState(null)}
          onSaved={() => { setModalState(null); load() }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1">Delete concern?</h2>
            <p className="text-sm text-forest-500 mb-5">
              <span className="font-semibold">{deleteTarget.label || 'This concern'}</span> will be permanently removed from the homepage.
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
