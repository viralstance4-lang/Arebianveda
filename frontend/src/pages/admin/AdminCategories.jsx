import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Layers, X, Search, Loader2, Wand2, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'

const emptyCategory = {
  name: '', description: '', emoji: '✨', color: '#D4AF37',
  imageUrl: '', status: 'published', order: '0',
}

function CategoryModal({ category, onClose, onSaved }) {
  const isEdit = !!category
  const [form, setForm] = useState(() => category ? {
    ...emptyCategory,
    ...category,
    order: String(category.order ?? 0),
  } : emptyCategory)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Category name is required')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        emoji: form.emoji || '✨',
        color: form.color || '#D4AF37',
        imageUrl: form.imageUrl,
        status: form.status,
        order: Number(form.order) || 0,
      }
      if (isEdit) {
        await api.put(`/categories/${category._id}`, payload)
        toast.success('Category updated')
      } else {
        await api.post('/categories', payload)
        toast.success('Category created')
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
          <h2 className="font-bold text-forest-900 font-serif text-lg">{isEdit ? 'Edit Category' : 'Create Category'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Category Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Shilajit" required />
            {isEdit && <p className="text-xs text-forest-400 mt-1">Slug: /{category.slug}</p>}
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="input min-h-[80px] resize-y" placeholder="Short description shown on the shop page" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Emoji</label>
              <input name="emoji" value={form.emoji} onChange={handleChange} className="input" placeholder="✨" maxLength={4} />
            </div>
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" name="color" value={form.color} onChange={handleChange} className="h-[44px] w-14 rounded-xl border border-forest-200 cursor-pointer p-1 bg-white" />
                <input name="color" value={form.color} onChange={handleChange} className="input" placeholder="#D4AF37" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Image URL</label>
            <input name="imageUrl" value={form.imageUrl} onChange={handleChange} className="input" placeholder="https://..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input">
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Display Order</label>
              <input name="order" type="number" value={form.order} onChange={handleChange} className="input" />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-gold w-full justify-center text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} {isEdit ? 'Update Category' : 'Create Category'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [modalState, setModalState] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [reassignTo, setReassignTo] = useState('')
  const [resolving, setResolving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/categories/admin')
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleStatus = async (c) => {
    const next = c.status === 'published' ? 'draft' : 'published'
    try {
      await api.put(`/categories/${c._id}`, { status: next })
      setCategories(prev => prev.map(x => x._id === c._id ? { ...x, status: next } : x))
      toast.success(`Category ${next === 'published' ? 'published' : 'set to draft'}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteTarget._id}`)
      setCategories(prev => prev.filter(c => c._id !== deleteTarget._id))
      toast.success('Category deleted')
      setDeleteTarget(null)
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 409 && data?.requiresAction) {
        setReassignTo('')
        setConflict({ categoryId: deleteTarget._id, ...data })
      } else {
        toast.error(data?.message || 'Failed to delete category')
        setDeleteTarget(null)
      }
    }
  }

  const closeConflict = () => {
    setConflict(null)
    setDeleteTarget(null)
  }

  const resolveConflict = async (action) => {
    if (action === 'reassign' && !reassignTo) {
      return toast.error('Select a category to reassign products to')
    }
    setResolving(true)
    try {
      const payload = action === 'reassign' ? { action, targetSlug: reassignTo } : { action }
      await api.delete(`/categories/${conflict.categoryId}`, { data: payload })
      setCategories(prev => prev.filter(c => c._id !== conflict.categoryId))
      toast.success(action === 'reassign' ? 'Products reassigned and category deleted' : 'Category deleted and products marked uncategorized')
      closeConflict()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category')
    } finally {
      setResolving(false)
    }
  }

  const handleMigrate = async () => {
    setMigrating(true)
    try {
      const { data } = await api.post('/categories/migrate')
      const fixed = data.results?.length || 0
      toast.success(fixed > 0 ? `Fixed ${fixed} categor${fixed === 1 ? 'y' : 'ies'}` : 'All slugs already correct')
      load()
    } catch {
      toast.error('Migration failed')
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">Categories</h1>
          <p className="text-sm text-forest-500 mt-0.5">{categories.length} total categories</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleMigrate} disabled={migrating} className="btn-outline-gold text-sm">
            {migrating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} Fix Slugs
          </button>
          <button onClick={() => setModalState({})} className="btn-gold text-sm">
            <Plus size={16} /> Add Category
          </button>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input pl-9" placeholder="Search categories..." />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['Category', 'Slug', 'Description', 'Order', 'Status', ''].map(h => (
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
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-forest-100 rounded animate-pulse" style={{ width: `${50 + j * 4}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-forest-400">
                    <Layers size={28} className="mx-auto mb-2 opacity-50" />
                    No categories found
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ backgroundColor: `${c.color}22` }}>
                        {c.emoji}
                      </span>
                      <span className="font-medium text-forest-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-forest-500 font-mono text-xs">/{c.slug}</td>
                  <td className="px-4 py-3 text-forest-600 max-w-[220px] truncate">{c.description || '—'}</td>
                  <td className="px-4 py-3 text-forest-600">{c.order}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(c)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${c.status === 'published' ? 'badge-green' : 'bg-gray-200 text-gray-700'}`}>
                      {c.status === 'published' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {c.status === 'published' ? 'Published' : 'Draft'}
                    </button>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalState !== null && (
        <CategoryModal
          category={modalState._id ? modalState : null}
          onClose={() => setModalState(null)}
          onSaved={() => { setModalState(null); load() }}
        />
      )}

      {deleteTarget && !conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1">Delete category?</h2>
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

      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeConflict} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1 text-center">Category in use</h2>
            <p className="text-sm text-forest-500 mb-5 text-center">
              <span className="font-semibold">{conflict.categoryName}</span> is assigned to{' '}
              <span className="font-semibold">{conflict.productCount}</span> product{conflict.productCount === 1 ? '' : 's'}.
              Choose what to do with {conflict.productCount === 1 ? 'it' : 'them'} before deleting.
            </p>

            <div className="space-y-3">
              <div className="border border-forest-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-forest-700 mb-2">Reassign products to another category</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select value={reassignTo} onChange={e => setReassignTo(e.target.value)} className="input flex-1 text-sm">
                    <option value="">Select category...</option>
                    {categories.filter(c => c._id !== conflict.categoryId).map(c => (
                      <option key={c._id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                  <button disabled={resolving} onClick={() => resolveConflict('reassign')} className="btn-gold text-sm justify-center whitespace-nowrap">
                    {resolving ? <Loader2 size={14} className="animate-spin" /> : 'Reassign & Delete'}
                  </button>
                </div>
              </div>

              <button disabled={resolving} onClick={() => resolveConflict('unassign')} className="w-full justify-center text-sm bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 flex items-center gap-2">
                {resolving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete Category &amp; Remove From Products
              </button>

              <button onClick={closeConflict} className="btn-outline-gold w-full justify-center text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
