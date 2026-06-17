import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, FileText, X, Search, Loader2, Eye, EyeOff, Bold, Italic, Underline, List, ListOrdered } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'

const emptyPolicy = { title: '', content: '', isActive: true, order: '0' }

function RichEditor({ value, onChange }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1 p-2 bg-forest-50 border border-forest-200 rounded-t-xl">
        {[
          { cmd: 'bold', label: <Bold size={14} /> },
          { cmd: 'italic', label: <Italic size={14} /> },
          { cmd: 'underline', label: <Underline size={14} /> },
        ].map(({ cmd, label }) => (
          <button key={cmd} type="button"
            onMouseDown={e => { e.preventDefault(); document.execCommand(cmd) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-forest-600 hover:bg-forest-100 hover:text-forest-900 transition-colors">
            {label}
          </button>
        ))}
        <div className="w-px h-6 bg-forest-200 mx-1 self-center" />
        {[
          { cmd: 'insertUnorderedList', label: <List size={14} /> },
          { cmd: 'insertOrderedList', label: <ListOrdered size={14} /> },
        ].map(({ cmd, label }) => (
          <button key={cmd} type="button"
            onMouseDown={e => { e.preventDefault(); document.execCommand(cmd) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-forest-600 hover:bg-forest-100 hover:text-forest-900 transition-colors">
            {label}
          </button>
        ))}
        <div className="w-px h-6 bg-forest-200 mx-1 self-center" />
        {['h2', 'h3', 'p'].map(tag => (
          <button key={tag} type="button"
            onMouseDown={e => { e.preventDefault(); document.execCommand('formatBlock', false, tag) }}
            className="px-2.5 h-8 rounded-lg text-xs font-semibold uppercase text-forest-600 hover:bg-forest-100 hover:text-forest-900 transition-colors">
            {tag}
          </button>
        ))}
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={e => onChange(e.currentTarget.innerHTML)}
        className="policy-content min-h-[260px] p-4 bg-white border border-forest-200 border-t-0 rounded-b-xl outline-none focus:ring-2 focus:ring-forest-800 cursor-text"
      />
    </div>
  )
}

function PolicyModal({ policy, onClose, onSaved }) {
  const isEdit = !!policy
  const [form, setForm] = useState(() => policy ? { ...emptyPolicy, ...policy, order: String(policy.order ?? 0) } : emptyPolicy)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content,
        isActive: form.isActive,
        order: Number(form.order) || 0,
      }
      if (isEdit) {
        await api.put(`/policies/${policy._id}`, payload)
        toast.success('Policy updated')
      } else {
        await api.post('/policies', payload)
        toast.success('Policy created')
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-forest-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-forest-900 font-serif text-lg">{isEdit ? 'Edit Policy' : 'Add Policy'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-forest-500 mb-1.5">Title *</label>
              <input name="title" value={form.title} onChange={handleChange} className="input" placeholder="Privacy Policy, Terms & Conditions, Refund Policy..." required />
              {isEdit && <p className="text-xs text-forest-400 mt-1">Slug: /{policy.slug}</p>}
            </div>
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Display Order</label>
              <input name="order" type="number" value={form.order} onChange={handleChange} className="input" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Content</label>
            <RichEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="accent-forest-800 w-4 h-4" />
            <span className="text-sm text-forest-700">Show in footer</span>
          </label>

          <button type="submit" disabled={saving} className="btn-gold w-full justify-center text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} {isEdit ? 'Update Policy' : 'Create Policy'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/policies/admin/all')
      .then(({ data }) => setPolicies(data.policies || []))
      .catch(() => toast.error('Failed to load policies'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = policies.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleActive = async (p) => {
    try {
      await api.put(`/policies/${p._id}`, { isActive: !p.isActive })
      setPolicies(prev => prev.map(x => x._id === p._id ? { ...x, isActive: !x.isActive } : x))
    } catch {
      toast.error('Failed to update policy')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/policies/${deleteTarget._id}`)
      setPolicies(prev => prev.filter(p => p._id !== deleteTarget._id))
      toast.success('Policy deleted')
    } catch {
      toast.error('Failed to delete policy')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">Policies</h1>
          <p className="text-sm text-forest-500 mt-0.5">Manage footer policies — Privacy, Terms, Refund, etc.</p>
        </div>
        <button onClick={() => setModalState({})} className="btn-gold text-sm">
          <Plus size={16} /> Add Policy
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input pl-9" placeholder="Search policies..." />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['Title', 'Slug', 'Visible', 'Order', ''].map(h => (
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
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-forest-100 rounded animate-pulse" style={{ width: `${50 + j * 6}%` }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-forest-400">
                    <FileText size={28} className="mx-auto mb-2 opacity-50" />
                    No policies found
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-forest-100 flex items-center justify-center flex-shrink-0">
                        <FileText size={15} className="text-forest-700" />
                      </span>
                      <span className="font-medium text-forest-900">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-forest-500 font-mono text-xs">/policy/{p.slug}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(p)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${p.isActive ? 'badge-green' : 'bg-gray-200 text-gray-700'}`}>
                      {p.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                      {p.isActive ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-forest-600">{p.order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModalState(p)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-100 text-forest-400 hover:text-red-500 transition-colors">
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
        <PolicyModal
          policy={modalState._id ? modalState : null}
          onClose={() => setModalState(null)}
          onSaved={() => { setModalState(null); load() }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1">Delete policy?</h2>
            <p className="text-sm text-forest-500 mb-5">
              <span className="font-semibold">{deleteTarget.title}</span> will be permanently removed.
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
