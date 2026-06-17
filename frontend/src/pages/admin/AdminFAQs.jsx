import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, HelpCircle, X, Search, Loader2, ArrowUp, ArrowDown, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'

const emptyFaq = { question: '', answer: '', order: '0', isActive: true }

function FaqModal({ faq, onClose, onSaved }) {
  const isEdit = !!faq
  const [form, setForm] = useState(() => faq ? { ...emptyFaq, ...faq, order: String(faq.order ?? 0) } : emptyFaq)
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.question.trim() || !form.answer.trim()) return toast.error('Question and answer are required')
    setSaving(true)
    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        order: Number(form.order) || 0,
        isActive: form.isActive,
      }
      if (isEdit) {
        await api.put(`/faqs/${faq._id}`, payload)
        toast.success('FAQ updated')
      } else {
        await api.post('/faqs', payload)
        toast.success('FAQ created')
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
          <h2 className="font-bold text-forest-900 font-serif text-lg">{isEdit ? 'Edit FAQ' : 'Add FAQ'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Question *</label>
            <input name="question" value={form.question} onChange={handleChange} className="input" placeholder="Is Shilajit safe to take daily?" required />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Answer *</label>
            <textarea name="answer" value={form.answer} onChange={handleChange} className="input min-h-[120px] resize-y" placeholder="Yes, when taken in the recommended dosage..." required />
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Display Order</label>
              <input name="order" type="number" value={form.order} onChange={handleChange} className="input" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pb-3">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="accent-forest-800 w-4 h-4" />
              <span className="text-sm text-forest-700">Active</span>
            </label>
          </div>

          <button type="submit" disabled={saving} className="btn-gold w-full justify-center text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : null} {isEdit ? 'Update FAQ' : 'Create FAQ'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminFAQs() {
  const [faqs, setFaqs] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalState, setModalState] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [reordering, setReordering] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/faqs/admin')
      .then(({ data }) => setFaqs(data.faqs || []))
      .catch(() => toast.error('Failed to load FAQs'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = faqs.filter(f =>
    f.question.toLowerCase().includes(search.toLowerCase()) ||
    f.answer.toLowerCase().includes(search.toLowerCase())
  )

  const toggleActive = async (f) => {
    try {
      await api.put(`/faqs/${f._id}`, { question: f.question, answer: f.answer, order: f.order, isActive: !f.isActive })
      setFaqs(prev => prev.map(x => x._id === f._id ? { ...x, isActive: !x.isActive } : x))
    } catch {
      toast.error('Failed to update FAQ')
    }
  }

  const move = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= filtered.length) return
    const reordered = [...filtered]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setReordering(reordered[target]._id)
    try {
      // Reassign sequential order values for the whole list — swapping the raw
      // `order` fields is a no-op when adjacent items share the same value
      // (e.g. every new FAQ defaults to order 0).
      await Promise.all(
        reordered.map((f, i) =>
          api.put(`/faqs/${f._id}`, { question: f.question, answer: f.answer, order: i, isActive: f.isActive })
        )
      )
      load()
    } catch {
      toast.error('Failed to reorder')
    } finally {
      setReordering(null)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/faqs/${deleteTarget._id}`)
      setFaqs(prev => prev.filter(f => f._id !== deleteTarget._id))
      toast.success('FAQ deleted')
    } catch {
      toast.error('Failed to delete FAQ')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">FAQs</h1>
          <p className="text-sm text-forest-500 mt-0.5">{faqs.length} total questions</p>
        </div>
        <button onClick={() => setModalState({})} className="btn-gold text-sm">
          <Plus size={16} /> Add FAQ
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input pl-9" placeholder="Search FAQs..." />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['#', 'Question', 'Answer', 'Status', ''].map(h => (
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
                    <HelpCircle size={28} className="mx-auto mb-2 opacity-50" />
                    No FAQs found
                  </td>
                </tr>
              ) : filtered.map((f, i) => (
                <tr key={f._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => move(i, -1)} disabled={i === 0 || reordering} className="text-forest-300 hover:text-forest-800 disabled:opacity-20">
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={() => move(i, 1)} disabled={i === filtered.length - 1 || reordering} className="text-forest-300 hover:text-forest-800 disabled:opacity-20">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-forest-900 max-w-[260px]">{f.question}</td>
                  <td className="px-4 py-3 text-forest-600 max-w-[320px] truncate">{f.answer}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(f)} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${f.isActive ? 'badge-green' : 'bg-gray-200 text-gray-700'}`}>
                      {f.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {f.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModalState(f)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900 transition-colors">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(f)} className="p-1.5 rounded-lg hover:bg-red-100 text-forest-400 hover:text-red-500 transition-colors">
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
        <FaqModal
          faq={modalState._id ? modalState : null}
          onClose={() => setModalState(null)}
          onSaved={() => { setModalState(null); load() }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1">Delete FAQ?</h2>
            <p className="text-sm text-forest-500 mb-5">
              <span className="font-semibold">{deleteTarget.question}</span> will be permanently removed.
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
