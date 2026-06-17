import { useEffect, useState } from 'react'
import { Plus, Trash2, Check, X, Edit2 } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

export default function AdminBlogCategories() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  const load = () => api.get('/blog-categories')
    .then(r => setItems(r.data.categories || []))
    .catch(() => toast.error('Failed to load categories'))

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!name.trim()) return
    try {
      const r = await api.post('/blog-categories', { name: name.trim() })
      setItems(prev => [r.data.category, ...prev])
      setName('')
      toast.success('Added')
    } catch {
      toast.error('Failed to add category')
    }
  }

  const handleEditStart = (item) => {
    setEditId(item._id)
    setEditName(item.name)
  }

  const handleEditSave = async (id) => {
    if (!editName.trim()) return
    try {
      const r = await api.put(`/blog-categories/${id}`, { name: editName.trim() })
      setItems(prev => prev.map(i => i._id === id ? r.data.category : i))
      setEditId(null)
      toast.success('Updated')
    } catch {
      toast.error('Failed to update category')
    }
  }

  const handleEditCancel = () => setEditId(null)

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return
    try {
      await api.delete(`/blog-categories/${id}`)
      setItems(prev => prev.filter(i => i._id !== id))
      toast.success('Removed')
    } catch {
      toast.error('Failed to delete category')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-forest-900">Blog Categories</h1>
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="New category"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn-gold" onClick={handleAdd}><Plus size={14} /></button>
        </div>
      </div>

      <div className="card">
        <ul>
          {items.map(i => (
            <li key={i._id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
              {editId === i._id ? (
                <input
                  className="input flex-1 mr-3"
                  value={editName}
                  autoFocus
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleEditSave(i._id); if (e.key === 'Escape') handleEditCancel() }}
                />
              ) : (
                <div>
                  <div className="font-medium">{i.name}</div>
                  <div className="text-xs text-forest-400">{i.slug}</div>
                </div>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                {editId === i._id ? (
                  <>
                    <button onClick={() => handleEditSave(i._id)} className="p-1 text-green-600"><Check size={14} /></button>
                    <button onClick={handleEditCancel} className="p-1 text-forest-400"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditStart(i)} className="p-1 text-forest-400 hover:text-forest-700"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(i._id)} className="p-1 text-red-500"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-forest-400">No categories yet.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
