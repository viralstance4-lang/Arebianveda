import { useEffect, useRef, useState } from 'react'
import { Plus, Edit2, Trash2, Image as ImageIcon, X, Search, Loader2, ToggleLeft, ToggleRight, Upload, Copy, GripVertical, Monitor, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'

const emptyForm = {
  title: '', altText: '',
  clickUrl: '', displayOrder: '0', isActive: true,
}

function BannerModal({ banner, onClose, onSaved }) {
  const isEdit = !!banner
  const [form, setForm] = useState(() => banner ? {
    title: banner.title || '',
    altText: banner.altText || '',
    clickUrl: banner.clickUrl || '',
    displayOrder: String(banner.displayOrder ?? 0),
    isActive: banner.isActive !== false,
  } : emptyForm)
  const [desktopFile, setDesktopFile] = useState(null)
  const [mobileFile, setMobileFile] = useState(null)
  const [desktopPreview, setDesktopPreview] = useState(banner?.desktopImage || null)
  const [mobilePreview, setMobilePreview] = useState(banner?.mobileImage || null)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleDesktopFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setDesktopFile(f)
    setDesktopPreview(URL.createObjectURL(f))
  }

  const handleMobileFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setMobileFile(f)
    setMobilePreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isEdit && !desktopFile) return toast.error('Desktop banner image is required')
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', form.title.trim())
      formData.append('altText', form.altText || form.title.trim())
      formData.append('clickUrl', form.clickUrl)
      formData.append('displayOrder', form.displayOrder || 0)
      formData.append('isActive', form.isActive ? 'true' : 'false')
      if (desktopFile) formData.append('desktopImage', desktopFile)
      if (mobileFile) formData.append('mobileImage', mobileFile)

      if (isEdit) {
        await api.put(`/banners/${banner._id}`, formData)
        toast.success('Banner updated')
      } else {
        await api.post('/banners', formData)
        toast.success('Banner created')
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-forest-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-forest-900 font-serif text-lg">{isEdit ? 'Edit Banner' : 'Add Banner'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-forest-500 mb-1.5 flex items-center gap-1.5">
                <Monitor size={13} /> Desktop Banner Image {!isEdit && '*'} <span className="text-forest-400">(1920×700)</span>
              </label>
              <div className="border border-forest-200 rounded-xl bg-forest-50 aspect-[1920/700] flex items-center justify-center overflow-hidden mb-2">
                {desktopPreview ? <img src={desktopPreview} alt="Desktop preview" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-forest-300" />}
              </div>
              <label className="btn-outline-gold text-sm cursor-pointer w-full justify-center">
                <Upload size={14} /> {desktopFile ? 'Change file' : 'Choose file'}
                <input type="file" accept="image/*" onChange={handleDesktopFile} className="hidden" />
              </label>
            </div>
            <div>
              <label className="block text-xs text-forest-500 mb-1.5 flex items-center gap-1.5">
                <Smartphone size={13} /> Mobile Banner Image <span className="text-forest-400">(800×1200)</span>
              </label>
              <div className="border border-forest-200 rounded-xl bg-forest-50 max-h-40 mx-auto aspect-[800/1200] flex items-center justify-center overflow-hidden mb-2">
                {mobilePreview ? <img src={mobilePreview} alt="Mobile preview" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-forest-300" />}
              </div>
              <label className="btn-outline-gold text-sm cursor-pointer w-full justify-center">
                <Upload size={14} /> {mobileFile ? 'Change file' : 'Choose file'}
                <input type="file" accept="image/*" onChange={handleMobileFile} className="hidden" />
              </label>
              <p className="text-xs text-forest-400 mt-1">Optional — falls back to desktop image on mobile if not set.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Banner Title</label>
            <input name="title" value={form.title} onChange={handleChange} className="input" placeholder="Pure Himalayan Shilajit" />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Image Alt Text</label>
            <input name="altText" value={form.altText} onChange={handleChange} className="input" placeholder="Shilajit Resin banner" />
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Banner Click URL <span className="text-forest-400">(entire banner navigates here)</span></label>
            <input name="clickUrl" value={form.clickUrl} onChange={handleChange} className="input" placeholder="/shop/shilajit-resin or https://..." />
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
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} {isEdit ? 'Update Banner' : 'Create Banner'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminBanners() {
  const [banners, setBanners] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  const load = () => {
    setLoading(true)
    api.get('/banners')
      .then(({ data }) => setBanners(data.banners || []))
      .catch(() => toast.error('Failed to load banners'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = banners.filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
  const reorderable = !search

  const toggleActive = async (b) => {
    try {
      const formData = new FormData()
      formData.append('isActive', (!b.isActive).toString())
      await api.put(`/banners/${b._id}`, formData)
      setBanners(prev => prev.map(x => x._id === b._id ? { ...x, isActive: !b.isActive } : x))
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDuplicate = async (b) => {
    try {
      await api.post(`/banners/${b._id}/duplicate`)
      toast.success('Banner duplicated')
      load()
    } catch {
      toast.error('Failed to duplicate banner')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/banners/${deleteTarget._id}`)
      setBanners(prev => prev.filter(b => b._id !== deleteTarget._id))
      toast.success('Banner deleted')
    } catch {
      toast.error('Failed to delete banner')
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

    const reordered = [...banners]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const withOrder = reordered.map((b, i) => ({ ...b, displayOrder: i }))
    setBanners(withOrder)

    try {
      await api.put('/banners/reorder', {
        order: withOrder.map(b => ({ _id: b._id, displayOrder: b.displayOrder })),
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
          <h1 className="text-2xl font-bold text-forest-900 font-serif">Homepage Banners</h1>
          <p className="text-sm text-forest-500 mt-0.5">{banners.length} total banners · drag rows to reorder</p>
        </div>
        <button onClick={() => setModalState({})} className="btn-gold text-sm">
          <Plus size={16} /> Add Banner
        </button>
      </div>

      <div className="card p-4 text-sm text-forest-600 bg-forest-50/50 border border-forest-100">
        Banners marked <span className="font-semibold">Active</span> appear on the homepage hero slider, sorted by Display Order, until you hide or delete them. If no active banners exist, the homepage falls back to the default static hero section.
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input pl-9" placeholder="Search banners..." />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['', 'Image Preview', 'Title', 'Status', 'Order', 'Created', ''].map((h, i) => (
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
                    No banners found. Click "Add Banner" to create your first homepage slide.
                  </td>
                </tr>
              ) : filtered.map((b, index) => (
                <tr
                  key={b._id}
                  draggable={reorderable}
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className={`border-b border-forest-50 hover:bg-forest-50/50 transition-colors ${reorderable ? 'cursor-move' : ''}`}
                >
                  <td className="px-2 py-3 text-forest-300"><GripVertical size={16} /></td>
                  <td className="px-4 py-3">
                    <div className="w-20 h-12 rounded-lg bg-forest-50 border border-forest-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img src={b.desktopImage} alt={b.altText || b.title} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-forest-900">{b.title || <span className="text-forest-400 italic">Untitled banner</span>}</p>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(b)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${b.isActive ? 'badge-green' : 'bg-gray-200 text-gray-700'}`}>
                      {b.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {b.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-forest-600">{b.displayOrder}</td>
                  <td className="px-4 py-3 text-forest-500 text-xs whitespace-nowrap">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModalState(b)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors" title="Edit">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDuplicate(b)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors" title="Duplicate">
                        <Copy size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg hover:bg-red-100 text-forest-400 hover:text-red-500 transition-colors" title="Delete">
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
        <BannerModal
          banner={modalState._id ? modalState : null}
          onClose={() => setModalState(null)}
          onSaved={() => { setModalState(null); load() }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1">Delete banner?</h2>
            <p className="text-sm text-forest-500 mb-5">
              <span className="font-semibold">{deleteTarget.title}</span> will be permanently removed from the homepage slider.
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
