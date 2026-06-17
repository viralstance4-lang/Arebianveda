import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Editor } from '@tinymce/tinymce-react'
import toast from 'react-hot-toast'
import api from '../../api'

const emptyMeta = { title: '', description: '', focusKeyword: '', canonicalUrl: '', robots: 'index, follow' }
const emptyOg = { title: '', description: '', image: '' }

function normalizeBlog(blog) {
  return {
    title: blog.title || '',
    excerpt: blog.excerpt || '',
    content: blog.content || '',
    category: blog.category?._id || blog.category || '',
    tags: (blog.tags || []).map(tag => (typeof tag === 'string' ? tag : tag._id)).filter(Boolean),
    featuredImage: blog.featuredImage || '',
    publishDate: blog.publishDate ? new Date(blog.publishDate).toISOString().slice(0, 16) : '',
    status: blog.status || 'draft',
    meta: { ...emptyMeta, ...(blog.meta || {}) },
    og: { ...emptyOg, ...(blog.og || {}) },
    slug: blog.slug || '',
  }
}

export default function AdminBlogForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState({ title: '', excerpt: '', content: '', category: '', tags: [], featuredImage: '', gallery: [], publishDate: '', status: 'draft', meta: emptyMeta, og: emptyOg, slug: '' })
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)

  const loadMeta = async () => {
    try {
      const [catRes, tagRes] = await Promise.all([
        api.get('/blog-categories'),
        api.get('/blog-tags'),
      ])
      setCategories(catRes.data.categories || [])
      setTags(tagRes.data.tags || [])
    } catch (err) {
      console.warn('Failed to load categories or tags', err)
    }
  }

  useEffect(() => {
    loadMeta()
    if (id) {
      api.get(`/blogs/preview/${id}`)
        .then(({ data }) => setData(normalizeBlog(data.blog || {})))
        .catch(() => toast.error('Failed to load blog'))
    }
  }, [id])

  const saveBlog = async (overrideStatus) => {
    setSaving(true)
    try {
      const payload = {
        ...data,
        status: overrideStatus || data.status,
        publishDate: data.publishDate ? new Date(data.publishDate) : undefined,
        category: data.category || undefined,
        tags: data.tags,
      }
      if (!payload.publishDate) delete payload.publishDate

      let response
      if (id) response = await api.put(`/blogs/${id}`, payload)
      else response = await api.post('/blogs', payload)

      const message = id ? 'Blog updated' : 'Blog created'
      toast.success(message)
      if (!id) navigate(`/admin/blogs/${response.data.blog._id}/edit`)
      else setData(normalizeBlog(response.data.blog))
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save blog')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => saveBlog()
  const handleSaveDraft = () => saveBlog('draft')
  const handlePublish = () => saveBlog('published')

  const uploadFiles = async (e, field) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    try {
      const res = await api.post('/blogs/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const urls = res.data.files.map(f => f.url)
      if (field === 'featuredImage' && urls[0]) setData(prev => ({ ...prev, featuredImage: urls[0] }))
      else if (field === 'gallery') setData(prev => ({ ...prev, gallery: [...prev.gallery, ...urls] }))
      toast.success('Uploaded')
    } catch {
      toast.error('Upload failed')
    }
  }

  const createCategory = async () => {
    if (!newCategory.trim()) return toast.error('Enter category name')
    try {
      const res = await api.post('/blog-categories', { name: newCategory.trim() })
      setCategories(prev => [res.data.category, ...prev])
      setData(prev => ({ ...prev, category: res.data.category._id }))
      setNewCategory('')
      toast.success('Category created')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create category')
    }
  }

  const createTag = async () => {
    if (!newTag.trim()) return toast.error('Enter tag name')
    try {
      const res = await api.post('/blog-tags', { name: newTag.trim() })
      setTags(prev => [res.data.tag, ...prev])
      setData(prev => ({ ...prev, tags: [...prev.tags, res.data.tag._id] }))
      setNewTag('')
      toast.success('Tag created')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create tag')
    }
  }

  const handleImageUpload = async (blobInfo) => {
    const fd = new FormData()
    fd.append('files', blobInfo.blob(), blobInfo.filename())
    const res = await api.post('/blogs/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return res.data.files?.[0]?.url ?? ''
  }

  const handlePreview = () => {
    if (!data.slug) return toast.error('Save the blog first to preview')
    window.open(`/blog/${data.slug}?preview=true`, '_blank')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-forest-900 font-serif">{id ? 'Edit Blog' : 'Add Blog'}</h1>
          <p className="text-sm text-forest-500 mt-1">Create SEO-friendly posts with scheduling, featured images, and preview.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleSaveDraft} className="btn-secondary">Save Draft</button>
          <button type="button" onClick={handlePublish} className="btn-gold">Publish Now</button>
          <button type="button" onClick={handlePreview} className="btn-outline">Preview</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">Save</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <div className="grid gap-4">
            <input className="input" placeholder="Title" value={data.title} onChange={e => setData(prev => ({ ...prev, title: e.target.value }))} />
            <textarea className="input min-h-[120px]" placeholder="Excerpt" value={data.excerpt} onChange={e => setData(prev => ({ ...prev, excerpt: e.target.value }))} />
          </div>

          <div className="card p-4 space-y-4">
            <label className="block text-sm font-semibold">Content</label>
            <Editor
              apiKey={import.meta.env.VITE_TINY_API_KEY || '8qdazr6gjorhzmzpwvrrk3kzudb6ymms8vmhlikdznhcj20o'}
              value={data.content}
              onEditorChange={value => setData(prev => ({ ...prev, content: value }))}
              init={{
                height: 520,
                menubar: true,
                plugins: [
                  'preview paste importcss searchreplace autolink autosave save directionality code visualblocks visualchars fullscreen image link media template codesample table charmap hr pagebreak nonbreaking anchor toc insertdatetime advlist lists wordcount help emoticons',
                ].join(' '),
                toolbar: 'undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | charmap emoticons | fullscreen preview save | insertfile image media template link codesample | ltr rtl',
                automatic_uploads: true,
                images_upload_handler: handleImageUpload,
                file_picker_types: 'image media',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4 space-y-4">
              <h2 className="text-lg font-semibold">SEO Settings</h2>
              <input className="input" placeholder="Meta title" value={data.meta.title} onChange={e => setData(prev => ({ ...prev, meta: { ...prev.meta, title: e.target.value } }))} />
              <textarea className="input min-h-[100px]" placeholder="Meta description" value={data.meta.description} onChange={e => setData(prev => ({ ...prev, meta: { ...prev.meta, description: e.target.value } }))} />
              <input className="input" placeholder="Focus keyword" value={data.meta.focusKeyword} onChange={e => setData(prev => ({ ...prev, meta: { ...prev.meta, focusKeyword: e.target.value } }))} />
              <input className="input" placeholder="Canonical URL" value={data.meta.canonicalUrl} onChange={e => setData(prev => ({ ...prev, meta: { ...prev.meta, canonicalUrl: e.target.value } }))} />
              <input className="input" placeholder="Robots" value={data.meta.robots} onChange={e => setData(prev => ({ ...prev, meta: { ...prev.meta, robots: e.target.value } }))} />
            </div>
            <div className="card p-4 space-y-4">
              <h2 className="text-lg font-semibold">Social Preview</h2>
              <input className="input" placeholder="OG title" value={data.og.title} onChange={e => setData(prev => ({ ...prev, og: { ...prev.og, title: e.target.value } }))} />
              <textarea className="input min-h-[100px]" placeholder="OG description" value={data.og.description} onChange={e => setData(prev => ({ ...prev, og: { ...prev.og, description: e.target.value } }))} />
              <input className="input" placeholder="OG image URL" value={data.og.image} onChange={e => setData(prev => ({ ...prev, og: { ...prev.og, image: e.target.value } }))} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <h2 className="text-lg font-semibold">Publish Settings</h2>
            <label className="block text-sm">Category</label>
            <select value={data.category} onChange={e => setData(prev => ({ ...prev, category: e.target.value }))} className="input">
              <option value="">Choose category</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input className="input flex-1" placeholder="Add new category" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                <button type="button" onClick={createCategory} className="btn-secondary">Create</button>
              </div>
              <p className="text-xs text-forest-400">Creating a category adds it to the list and selects it for this post.</p>
            </div>

            <label className="block text-sm">Tags</label>
            <select multiple value={data.tags} onChange={e => setData(prev => ({ ...prev, tags: Array.from(e.target.selectedOptions).map(opt => opt.value) }))} className="input h-32">
              {tags.map(tag => <option key={tag._id} value={tag._id}>{tag.name}</option>)}
            </select>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input className="input flex-1" placeholder="Add new tag" value={newTag} onChange={e => setNewTag(e.target.value)} />
                <button type="button" onClick={createTag} className="btn-secondary">Create</button>
              </div>
              <p className="text-xs text-forest-400">New tags are saved and added to the selected tags for this post.</p>
            </div>

            <label className="block text-sm">Featured Image</label>
            <input type="file" onChange={(e) => uploadFiles(e, 'featuredImage')} />
            {data.featuredImage && <img src={data.featuredImage} alt="featured" className="w-full h-36 object-cover rounded mt-2" />}

            <label className="block text-sm">Cover gallery</label>
            <input type="file" multiple onChange={(e) => uploadFiles(e, 'gallery')} />

            <label className="block text-sm">Status</label>
            <select className="input" value={data.status} onChange={e => setData(prev => ({ ...prev, status: e.target.value }))}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>

            <label className="block text-sm">Publish Date</label>
            <input type="datetime-local" className="input" value={data.publishDate} onChange={e => setData(prev => ({ ...prev, publishDate: e.target.value }))} />
          </div>
        </div>
      </div>
    </div>
  )
}
