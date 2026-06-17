import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '../../api'
import toast from 'react-hot-toast'

export default function AdminBlogTags() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')

  const load = () => api.get('/blog-tags').then(r => setItems(r.data.tags || [])).catch(() => toast.error('Failed to load tags'))
  useEffect(load, [])

  const handleAdd = async () => {
    try { const r = await api.post('/blog-tags', { name }); setItems(prev => [r.data.tag, ...prev]); setName(''); toast.success('Added') } catch { toast.error('Failed') }
  }

  const handleDelete = async (id) => { if (!confirm('Delete?')) return; try { await api.delete(`/blog-tags/${id}`); setItems(prev => prev.filter(i => i._id !== id)); toast.success('Removed') } catch { toast.error('Failed') } }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-forest-900">Blog Tags</h1>
        <div className="flex items-center gap-2">
          <input className="input" placeholder="New tag" value={name} onChange={e => setName(e.target.value)} />
          <button className="btn-gold" onClick={handleAdd}><Plus size={14} /></button>
        </div>
      </div>

      <div className="card">
        <ul>
          {items.map(i => (
            <li key={i._id} className="flex items-center justify-between px-4 py-3 border-b"> 
              <div><div className="font-medium">{i.name}</div><div className="text-xs text-forest-400">{i.slug}</div></div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(i._id)} className="p-1 text-red-500"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
