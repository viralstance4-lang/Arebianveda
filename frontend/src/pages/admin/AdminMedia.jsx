import { useEffect, useRef, useState } from 'react'
import { Upload, Image as ImageIcon, Film, FileText, Copy, Trash2, X, Search, Loader2, ChevronLeft, ChevronRight, Check, HardDrive } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'

const PAGE_SIZE = 24

const TYPE_TABS = [
  { key: '', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Videos' },
  { key: 'pdf', label: 'PDFs' },
]

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let val = bytes
  let i = 0
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++ }
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export default function AdminMedia() {
  const [media, setMedia] = useState([])
  const [stats, setStats] = useState({ totalSize: 0, images: 0, videos: 0, pdfs: 0 })
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const fileInputRef = useRef(null)

  const load = () => {
    setLoading(true)
    const params = { page, limit: PAGE_SIZE }
    if (type) params.type = type
    if (search) params.search = search
    api.get('/media', { params })
      .then(({ data }) => {
        setMedia(data.media || [])
        setTotal(data.total || 0)
        setPages(data.pages || 1)
        setStats(data.stats || { totalSize: 0, images: 0, videos: 0, pdfs: 0 })
      })
      .catch(() => toast.error('Failed to load media'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, type])

  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1)
      else load()
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    const formData = new FormData()
    Array.from(files).forEach(f => formData.append('files', f))
    setUploading(true)
    try {
      const { data } = await api.post('/media/upload', formData)
      toast.success(`Uploaded ${data.count} file${data.count === 1 ? '' : 's'}`)
      if (page !== 1) setPage(1)
      else load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const copyUrl = async (m) => {
    try {
      await navigator.clipboard.writeText(m.url)
      setCopiedId(m._id)
      toast.success('URL copied')
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      toast.error('Failed to copy URL')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/media/${deleteTarget._id}`)
      toast.success('Media deleted')
      if (media.length === 1 && page > 1) setPage(p => p - 1)
      else load()
    } catch {
      toast.error('Failed to delete media')
    } finally {
      setDeleteTarget(null)
      setPreview(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-forest-900 font-serif">Media Library</h1>
        <p className="text-sm text-forest-500 mt-0.5">{stats.images + stats.videos + stats.pdfs} files stored on Cloudinary</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider">Total Files</p>
          <p className="text-2xl font-bold text-forest-900 mt-1">{stats.images + stats.videos + stats.pdfs}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider">Images</p>
          <p className="text-2xl font-bold text-forest-900 mt-1">{stats.images}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider">Videos</p>
          <p className="text-2xl font-bold text-forest-900 mt-1">{stats.videos}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider">PDFs</p>
          <p className="text-2xl font-bold text-forest-900 mt-1">{stats.pdfs}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-forest-500 uppercase tracking-wider flex items-center gap-1"><HardDrive size={12} /> Storage</p>
          <p className="text-2xl font-bold text-forest-900 mt-1">{formatBytes(stats.totalSize)}</p>
        </div>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-forest-800 bg-forest-50' : 'border-forest-200 hover:border-forest-400 bg-white'}`}
      >
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={e => handleFiles(e.target.files)} />
        {uploading ? (
          <Loader2 className="mx-auto animate-spin text-forest-800" size={28} />
        ) : (
          <>
            <Upload className="mx-auto text-forest-400 mb-2" size={28} />
            <p className="text-sm text-forest-600 font-medium">Drag & drop files here, or click to browse</p>
            <p className="text-xs text-forest-400 mt-1">Images, videos and PDFs, up to 20 files at once</p>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-2">
          {TYPE_TABS.map(t => (
            <button key={t.key} onClick={() => { setType(t.key); setPage(1) }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${type === t.key ? 'bg-forest-800 text-white' : 'bg-white border border-forest-100 text-forest-600 hover:bg-forest-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-300" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9" placeholder="Search by filename..." />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-square bg-forest-100 animate-pulse" />
              <div className="p-2 space-y-1">
                <div className="h-3 bg-forest-100 rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-forest-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="card py-16 text-center text-forest-400">
          <ImageIcon size={28} className="mx-auto mb-2 opacity-50" />
          No media found
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {media.map(m => (
            <div key={m._id} className="card overflow-hidden group relative">
              <div className="aspect-square bg-forest-50 flex items-center justify-center cursor-pointer" onClick={() => setPreview(m)}>
                {m.type === 'image' ? (
                  <img src={m.url} alt={m.filename} className="w-full h-full object-cover" />
                ) : m.type === 'pdf' ? (
                  <FileText size={32} className="text-forest-300" />
                ) : (
                  <Film size={32} className="text-forest-300" />
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-forest-900 truncate" title={m.filename}>{m.filename}</p>
                <p className="text-[10px] text-forest-400">{m.format?.toUpperCase()} · {formatBytes(m.size)}</p>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => copyUrl(m)} className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-forest-700 shadow" title="Copy URL">
                  {copiedId === m._id ? <Check size={13} /> : <Copy size={13} />}
                </button>
                <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-lg bg-white/95 hover:bg-white text-red-500 shadow" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && total > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-forest-500">Page {page} of {pages} · {total} items</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg border border-forest-100 text-forest-500 hover:bg-forest-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-2 rounded-lg border border-forest-100 text-forest-500 hover:bg-forest-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPreview(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-forest-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-forest-900 font-serif text-lg truncate pr-4">{preview.filename}</h2>
              <button onClick={() => setPreview(null)} className="p-2 rounded-lg hover:bg-forest-50 text-forest-400 flex-shrink-0"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-forest-50 rounded-xl overflow-hidden flex items-center justify-center max-h-[50vh] min-h-[160px]">
                {preview.type === 'image' ? (
                  <img src={preview.url} alt={preview.filename} className="max-h-[50vh] object-contain" />
                ) : preview.type === 'pdf' ? (
                  <a href={preview.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 py-10 text-forest-500 hover:text-forest-800">
                    <FileText size={40} />
                    <span className="text-sm font-medium">Open PDF in new tab</span>
                  </a>
                ) : (
                  <video src={preview.url} controls className="max-h-[50vh] w-full" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input readOnly value={preview.url} className="input flex-1 text-xs font-mono" onClick={e => e.target.select()} />
                <button onClick={() => copyUrl(preview)} className="btn-outline-gold text-sm">
                  {copiedId === preview._id ? <Check size={16} /> : <Copy size={16} />} Copy
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div><p className="font-semibold text-forest-800 mb-0.5">Type</p><p className="text-forest-500 capitalize">{preview.type}</p></div>
                <div><p className="font-semibold text-forest-800 mb-0.5">Format</p><p className="text-forest-500">{preview.format?.toUpperCase() || '—'}</p></div>
                <div><p className="font-semibold text-forest-800 mb-0.5">Size</p><p className="text-forest-500">{formatBytes(preview.size)}</p></div>
              </div>
              <button onClick={() => setDeleteTarget(preview)} className="w-full justify-center text-sm bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl py-2.5 flex items-center gap-2">
                <Trash2 size={16} /> Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-bold text-forest-900 font-serif text-lg mb-1">Delete file?</h2>
            <p className="text-sm text-forest-500 mb-5">
              <span className="font-semibold">{deleteTarget.filename}</span> will be permanently removed from Cloudinary.
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
