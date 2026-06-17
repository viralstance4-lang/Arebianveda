import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search, Eye, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const query = new URLSearchParams({ admin: 'true', limit: '200' })
    if (status) query.set('status', status)
    try {
      const { data } = await api.get(`/blogs?${query.toString()}`)
      setBlogs(data.blogs || [])
    } catch {
      toast.error('Failed to load blogs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [status])

  const filtered = blogs.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) || (b.excerpt || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id) => {
    if (!confirm('Delete this blog?')) return
    try {
      await api.delete(`/blogs/${id}`)
      setBlogs(prev => prev.filter(b => b._id !== id))
      toast.success('Blog removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const handleDuplicate = async (id) => {
    try {
      const { data } = await api.post(`/blogs/${id}/duplicate`)
      setBlogs(prev => [data.blog, ...prev])
      toast.success('Blog duplicated')
    } catch {
      toast.error('Failed to duplicate')
    }
  }

  const handlePreview = (slug) => {
    if (!slug) return toast.error('Save the blog first to preview')
    window.open(`/blog/${slug}?preview=true`, '_blank')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">Blogs</h1>
          <p className="text-sm text-forest-500 mt-0.5">{blogs.length} posts · Filter drafts, scheduled and published articles.</p>
        </div>
        <Link to="/admin/blogs/new" className="btn-gold text-sm flex items-center gap-2"><Plus size={14} /> Add Blog</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] items-end">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search blogs..." />
        </div>
        <select className="input w-full max-w-xs" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-forest-100">
                {['Title', 'Category', 'Status', 'Publish', 'Views', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-forest-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center">No blogs found</td></tr>
              ) : filtered.map(b => (
                <tr key={b._id} className="border-b border-forest-50 hover:bg-forest-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-[280px] truncate">{b.title}</td>
                  <td className="px-4 py-3"><span className="badge-gold">{b.category?.name || '—'}</span></td>
                  <td className="px-4 py-3 capitalize">{b.status}</td>
                  <td className="px-4 py-3">{b.publishDate ? new Date(b.publishDate).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">{b.views ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Link to={`/admin/blogs/${b._id}/edit`} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900"><Edit2 size={15} /></Link>
                      <button type="button" onClick={() => handlePreview(b.slug)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900"><Eye size={15} /></button>
                      <button type="button" onClick={() => handleDuplicate(b._id)} className="p-1.5 rounded-lg hover:bg-forest-100 text-forest-400 hover:text-forest-900"><Copy size={15} /></button>
                      <button type="button" onClick={() => handleDelete(b._id)} className="p-1.5 rounded-lg hover:bg-red-100 text-forest-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
