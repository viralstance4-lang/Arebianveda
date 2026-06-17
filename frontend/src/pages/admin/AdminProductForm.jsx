import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Editor } from '@tinymce/tinymce-react'
import { ArrowLeft, Save, Upload, X, Star, GripVertical, Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'
import MultiSelect from '../../components/ui/MultiSelect'

const FORM_TYPES = ['resin', 'capsule', 'powder', 'liquid', 'lump', 'tablet', 'oil', 'other']

const slugify = str =>
  (str || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const emptyProduct = {
  name: '', tagline: '', description: '', categories: [], categoryIds: [],
  concerns: [], ayurvedicType: '', forms: [], dosage: '',
  keyHerbs: '', suitableFor: '', certifications: '', tags: '',
  price: '', comparePrice: '', costPrice: '',
  discountType: 'none', discountValue: '0',
  stock: '50', weight: '', dimensions: '',
  howToUse: '',
  beforeAfter: { before: '', after: '' },
  benefits: [{ title: '', description: '', icon: '✨' }],
  ingredients: [''],
  packageVariants: [],
  isFeatured: false, isBestseller: false, isActive: true,
  seoTitle: '', seoDescription: '',
}

function computeDiscountedPrice(comparePrice, discountType, discountValue) {
  const cp = Number(comparePrice)
  const dv = Number(discountValue)
  if (!cp || discountType === 'none' || !dv) return null
  if (discountType === 'percentage') return Math.round(cp * (1 - Math.min(dv, 99) / 100))
  if (discountType === 'fixed') return Math.max(1, cp - Math.min(dv, cp - 1))
  return null
}

function ImageManager({ images, setImages, uploading, onUpload }) {
  const dragIndex = useRef(null)

  const setCover = (idx) => setImages(prev => {
    const next = [...prev]
    const [picked] = next.splice(idx, 1)
    return [picked, ...next]
  })

  const remove = (idx) => setImages(prev => prev.filter((_, i) => i !== idx))

  const onDragStart = (e, idx) => { dragIndex.current = idx; e.dataTransfer.effectAllowed = 'move' }
  const onDragOver = (e, idx) => {
    e.preventDefault()
    if (dragIndex.current === null || dragIndex.current === idx) return
    setImages(prev => {
      const next = [...prev]
      const [dragged] = next.splice(dragIndex.current, 1)
      next.splice(idx, 0, dragged)
      dragIndex.current = idx
      return next
    })
  }
  const onDragEnd = () => { dragIndex.current = null }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wider">Product Images</h2>
        <span className="text-xs text-forest-400">{images.length}/5 · drag to reorder · first = cover</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <div key={img.url + i} draggable
            onDragStart={e => onDragStart(e, i)} onDragOver={e => onDragOver(e, i)} onDragEnd={onDragEnd}
            className={`relative w-24 h-24 rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${i === 0 ? 'border-forest-800 ring-2 ring-forest-300' : 'border-forest-100 hover:border-forest-300'}`}>
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            {i === 0 && (
              <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-forest-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                <Star size={9} /> Cover
              </div>
            )}
            <div className="absolute bottom-1 left-1 text-white/70"><GripVertical size={14} /></div>
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
              {i !== 0 && (
                <button type="button" onClick={() => setCover(i)} className="text-[9px] bg-forest-800 text-white font-bold px-2 py-0.5 rounded-md hover:bg-forest-600">
                  Set Cover
                </button>
              )}
              <button type="button" onClick={() => remove(i)} className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600">
                <X size={12} className="text-white" />
              </button>
            </div>
          </div>
        ))}
        {images.length < 5 && (
          <label className={`w-24 h-24 rounded-xl border-2 border-dashed border-forest-200 flex flex-col items-center justify-center cursor-pointer hover:border-forest-600 hover:bg-forest-50 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {uploading ? <Loader2 size={22} className="text-forest-800 animate-spin" /> : <>
              <Upload size={18} className="text-forest-300 mb-1" />
              <span className="text-[10px] text-forest-400">Upload</span>
            </>}
            <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} disabled={uploading || images.length >= 5} />
          </label>
        )}
      </div>
      <p className="text-xs text-forest-400">Max 5 images · JPG/PNG/WebP · 5 MB each</p>
    </div>
  )
}

export default function AdminProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [form, setForm] = useState(emptyProduct)
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [concerns, setConcerns] = useState([])

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories || [])).catch(() => {})
    api.get('/concerns').then(({ data }) => setConcerns(data.concerns || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    api.get(`/products/${id}`)
      .then(({ data }) => {
        const p = data.product
        setForm({
          ...emptyProduct, ...p,
          price: String(p.price ?? ''),
          comparePrice: String(p.comparePrice || ''),
          costPrice: String(p.costPrice || ''),
          stock: String(p.stock ?? '50'),
          weight: String(p.weight || ''),
          discountType: p.discountType || 'none',
          discountValue: String(p.discountValue ?? 0),
          categories: p.categories || [],
          categoryIds: (p.categoryIds || []).map(c => c?._id || c),
          concerns: p.concerns || [],
          forms: p.forms || [],
          keyHerbs: (p.keyHerbs || []).join(', '),
          suitableFor: (p.suitableFor || []).join(', '),
          certifications: (p.certifications || []).join(', '),
          tags: (p.tags || []).join(', '),
          beforeAfter: p.beforeAfter || { before: '', after: '' },
          benefits: p.benefits?.length ? p.benefits : [{ title: '', description: '', icon: '✨' }],
          ingredients: p.ingredients?.length ? p.ingredients : [''],
          packageVariants: (p.packageVariants || []).map(pv => ({
            label: pv.label || '', quantity: String(pv.quantity ?? ''), price: String(pv.price ?? ''),
            comparePrice: String(pv.comparePrice ?? ''), sku: pv.sku || '', isDefault: !!pv.isDefault,
          })),
        })
        setImages(p.images || [])
      })
      .catch(() => toast.error('Failed to load product'))
  }, [id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleBenefitChange = (i, field, value) => setForm(f => {
    const benefits = [...f.benefits]
    benefits[i] = { ...benefits[i], [field]: value }
    return { ...f, benefits }
  })

  const handlePackageVariantChange = (i, field, value) => setForm(f => {
    const packageVariants = [...f.packageVariants]
    packageVariants[i] = { ...packageVariants[i], [field]: value }
    if (field === 'isDefault' && value) {
      packageVariants.forEach((pv, j) => { if (j !== i) pv.isDefault = false })
    }
    return { ...f, packageVariants }
  })

  const handleIngredientChange = (i, value) => setForm(f => {
    const ingredients = [...f.ingredients]
    ingredients[i] = value
    return { ...f, ingredients }
  })

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('images', f))
      const { data } = await api.post('/products/upload/images', formData)
      setImages(prev => [...prev, ...data.images])
      toast.success(`${files.length} image(s) uploaded`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.tagline || !form.description) return toast.error('Name, tagline & description are required')
    if (!form.categories?.length) return toast.error('Please select at least one category')
    if (form.discountType === 'none' && !form.price) return toast.error('Selling price is required')
    for (const pv of form.packageVariants) {
      if (!pv.label?.trim()) continue
      if (!(Number(pv.quantity) > 0)) return toast.error(`Package "${pv.label}": Quantity must be greater than 0`)
      if (!(Number(pv.price) > 0)) return toast.error(`Package "${pv.label}": Price must be greater than 0`)
    }
    setSaving(true)
    try {
      const computedPrice = computeDiscountedPrice(form.comparePrice, form.discountType, form.discountValue)
      const payload = {
        ...form,
        price: computedPrice ?? Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        discountValue: Number(form.discountValue),
        stock: Number(form.stock),
        weight: form.weight ? Number(form.weight) : undefined,
        images,
        keyHerbs: form.keyHerbs.split(',').map(s => s.trim()).filter(Boolean),
        suitableFor: form.suitableFor.split(',').map(s => s.trim()).filter(Boolean),
        certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        ingredients: form.ingredients.map(s => s.trim()).filter(Boolean),
        benefits: form.benefits.filter(b => b.title?.trim()),
        packageVariants: form.packageVariants
          .filter(pv => pv.label?.trim())
          .map(pv => ({
            label: pv.label.trim(), quantity: Number(pv.quantity), price: Number(pv.price),
            comparePrice: pv.comparePrice ? Number(pv.comparePrice) : undefined,
            sku: pv.sku?.trim() || undefined, isDefault: !!pv.isDefault,
          })),
      }
      if (isEdit) {
        await api.put(`/products/${id}`, payload)
        toast.success('Product updated!')
      } else {
        await api.post('/products', payload)
        toast.success('Product created!')
      }
      navigate('/admin/products')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const computed = computeDiscountedPrice(form.comparePrice, form.discountType, form.discountValue)

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/admin/products')} className="btn-outline-gold py-2 px-3">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-forest-900 font-serif">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
            <p className="text-sm text-forest-500">{isEdit ? 'Update product details' : 'Create a new Ayurvedic product'}</p>
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-gold text-sm">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isEdit ? 'Update' : 'Create'}
        </button>
      </div>

      {/* Basic Info */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wider">Basic Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-forest-500 mb-1.5">Product Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className="input" placeholder="Himalayan Shilajit Resin" required />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-forest-500 mb-1.5">Tagline *</label>
            <input name="tagline" value={form.tagline} onChange={handleChange} className="input" placeholder="Pure energy, vitality & strength" required />
          </div>
          <div>
            <MultiSelect
              label="Category *"
              options={categories.map(c => ({ value: c._id, label: `${c.emoji} ${c.name}` }))}
              selected={form.categoryIds || []}
              onChange={ids => setForm(f => ({
                ...f,
                categoryIds: ids,
                categories: ids
                  .map(id => {
                    const cat = categories.find(c => c._id === id)
                    return cat?.slug || slugify(cat?.name || '')
                  })
                  .filter(Boolean),
              }))}
              placeholder="— Select categories —"
            />
          </div>
          <div>
            <MultiSelect
              label="Concern"
              options={concerns.map(c => ({ value: c.label, label: c.label }))}
              selected={form.concerns || []}
              onChange={vals => setForm(f => ({ ...f, concerns: vals }))}
              placeholder="— Select concerns —"
            />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Ayurvedic Type</label>
            <input name="ayurvedicType" value={form.ayurvedicType} onChange={handleChange} className="input" placeholder="Rasayana, Kwath, Churna" />
          </div>
          <div>
            <MultiSelect
              label="Form"
              options={FORM_TYPES.map(f => ({ value: f, label: f }))}
              selected={form.forms || []}
              onChange={vals => setForm(f => ({ ...f, forms: vals }))}
              placeholder="— Select forms —"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-forest-500 mb-1.5">Description *</label>
            <Editor
              apiKey={import.meta.env.VITE_TINY_API_KEY || '8qdazr6gjorhzmzpwvrrk3kzudb6ymms8vmhlikdznhcj20o'}
              value={form.description}
              onEditorChange={value => setForm(f => ({ ...f, description: value }))}
              init={{
                height: 260,
                menubar: false,
                plugins: 'lists link autolink wordcount',
                toolbar: 'undo redo | bold italic underline | bullist numlist | alignleft aligncenter alignright | link | removeformat',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-forest-500 mb-1.5">Dosage</label>
            <input name="dosage" value={form.dosage} onChange={handleChange} className="input" placeholder="Take a pea-sized portion twice daily with warm milk" />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Key Herbs (comma separated)</label>
            <input value={form.keyHerbs} onChange={e => setForm(f => ({ ...f, keyHerbs: e.target.value }))} className="input" placeholder="Shilajit, Ashwagandha, Triphala" />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Suitable For (comma separated)</label>
            <input value={form.suitableFor} onChange={e => setForm(f => ({ ...f, suitableFor: e.target.value }))} className="input" placeholder="Men, Women, Elderly" />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Certifications (comma separated)</label>
            <input value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} className="input" placeholder="FSSAI, GMP, ISO, Organic" />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Tags (comma separated)</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="input" placeholder="bestseller, ayurvedic, immunity" />
          </div>
        </div>
      </div>

      {/* Pricing & Inventory */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wider">Pricing & Inventory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">MRP / Compare Price (₹)</label>
            <input name="comparePrice" type="number" min="0" value={form.comparePrice} onChange={handleChange} className="input" placeholder="1999" />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Discount Type</label>
            <select name="discountType" value={form.discountType} onChange={handleChange} className="input">
              <option value="none">No discount</option>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount (₹)</option>
            </select>
          </div>
          {form.discountType !== 'none' ? (
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Discount Value ({form.discountType === 'percentage' ? '%' : '₹'})</label>
              <input name="discountValue" type="number" min="0" value={form.discountValue} onChange={handleChange} className="input" placeholder={form.discountType === 'percentage' ? '10' : '200'} />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-forest-500 mb-1.5">Selling Price (₹) *</label>
              <input name="price" type="number" min="0" value={form.price} onChange={handleChange} className="input" placeholder="999" required={form.discountType === 'none'} />
            </div>
          )}
        </div>

        {form.discountType !== 'none' && computed !== null && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-forest-50 border border-forest-200 rounded-xl">
            <span className="text-xs text-forest-600">Computed selling price:</span>
            <span className="text-lg font-bold text-forest-900">₹{computed.toLocaleString('en-IN')}</span>
            {form.comparePrice && <span className="text-xs text-forest-300 line-through">₹{Number(form.comparePrice).toLocaleString('en-IN')}</span>}
            {form.discountType === 'percentage' && <span className="text-xs text-green-600 ml-auto">{form.discountValue}% off</span>}
            {form.discountType === 'fixed' && <span className="text-xs text-green-600 ml-auto">₹{form.discountValue} off</span>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Stock</label>
            <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} className="input" placeholder="50" />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Cost Price (₹)</label>
            <input name="costPrice" type="number" min="0" value={form.costPrice} onChange={handleChange} className="input" placeholder="For profit analytics" />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Weight (grams)</label>
            <input name="weight" type="number" min="0" value={form.weight} onChange={handleChange} className="input" placeholder="50" />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-2">
          {[
            { key: 'isFeatured', label: 'Featured on Homepage' },
            { key: 'isBestseller', label: 'Mark as Bestseller' },
            { key: 'isActive', label: 'Active (visible)' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name={key} checked={form[key]} onChange={handleChange} className="accent-forest-800 w-4 h-4" />
              <span className="text-sm text-forest-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Package Variants */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wider">Package Variants</h2>
            <p className="text-xs text-forest-400 mt-1">Optional multi-pack pricing (e.g. Pack of 1 / 2 / 3). Leave empty for single-unit pricing.</p>
          </div>
          <button type="button" onClick={() => setForm(f => ({ ...f, packageVariants: [...f.packageVariants, { label: '', quantity: '', price: '', comparePrice: '', sku: '', isDefault: false }] }))}
            className="text-xs text-forest-800 hover:text-forest-900 flex items-center gap-1 font-medium">
            <Plus size={12} /> Add Variant
          </button>
        </div>
        {form.packageVariants.map((pv, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-12 gap-2 items-start pb-3 border-b border-forest-100 last:border-b-0 last:pb-0">
            <input value={pv.label} onChange={e => handlePackageVariantChange(i, 'label', e.target.value)} className="input col-span-2 sm:col-span-2 lg:col-span-3" placeholder="Pack of 1" />
            <input value={pv.quantity} onChange={e => handlePackageVariantChange(i, 'quantity', e.target.value)} type="number" min="1" className="input col-span-1 sm:col-span-1 lg:col-span-2" placeholder="Qty" />
            <input value={pv.price} onChange={e => handlePackageVariantChange(i, 'price', e.target.value)} type="number" min="0" step="0.01" className="input col-span-1 sm:col-span-1 lg:col-span-2" placeholder="Price ₹" />
            <input value={pv.comparePrice} onChange={e => handlePackageVariantChange(i, 'comparePrice', e.target.value)} type="number" min="0" step="0.01" className="input col-span-1 sm:col-span-1 lg:col-span-2" placeholder="Compare ₹" />
            <input value={pv.sku} onChange={e => handlePackageVariantChange(i, 'sku', e.target.value)} className="input col-span-1 sm:col-span-1 lg:col-span-2" placeholder="SKU" />
            <label className="col-span-1 flex items-center justify-center gap-1.5 cursor-pointer text-xs text-forest-600">
              <input type="radio" name="pkgDefault" checked={!!pv.isDefault} onChange={() => handlePackageVariantChange(i, 'isDefault', true)} className="accent-forest-800 w-4 h-4" />
              Default
            </label>
            <button type="button" onClick={() => setForm(f => ({ ...f, packageVariants: f.packageVariants.filter((_, j) => j !== i) }))}
              className="col-span-1 flex items-center justify-center py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Images */}
      <ImageManager images={images} setImages={setImages} uploading={uploading} onUpload={handleImageUpload} />

      {/* Benefits */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wider">Benefits</h2>
          <button type="button" onClick={() => setForm(f => ({ ...f, benefits: [...f.benefits, { title: '', description: '', icon: '✨' }] }))}
            className="text-xs text-forest-800 hover:text-forest-900 flex items-center gap-1 font-medium">
            <Plus size={12} /> Add
          </button>
        </div>
        {form.benefits.map((b, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 items-start pb-3 border-b border-forest-100 last:border-b-0 last:pb-0 sm:border-0 sm:pb-0">
            <input value={b.icon} onChange={e => handleBenefitChange(i, 'icon', e.target.value)} className="input col-span-1 text-center text-lg" placeholder="✨" />
            <input value={b.title} onChange={e => handleBenefitChange(i, 'title', e.target.value)} className="input col-span-1 lg:col-span-2" placeholder="Benefit title" />
            <input value={b.description} onChange={e => handleBenefitChange(i, 'description', e.target.value)} className="input col-span-1 lg:col-span-2" placeholder="Short description" />
            <button type="button" onClick={() => setForm(f => ({ ...f, benefits: f.benefits.filter((_, j) => j !== i) }))}
              className="col-span-1 flex items-center justify-center py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Ingredients */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wider">Ingredients</h2>
          <button type="button" onClick={() => setForm(f => ({ ...f, ingredients: [...f.ingredients, ''] }))}
            className="text-xs text-forest-800 hover:text-forest-900 flex items-center gap-1 font-medium">
            <Plus size={12} /> Add
          </button>
        </div>
        {form.ingredients.map((ing, i) => (
          <div key={i} className="flex gap-2">
            <input value={ing} onChange={e => handleIngredientChange(i, e.target.value)} className="input flex-1" placeholder="e.g. Pure Shilajit Extract" />
            <button type="button" onClick={() => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, j) => j !== i) }))}
              className="px-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Copywriting */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wider">Copywriting</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">Before (Pain state)</label>
            <textarea value={form.beforeAfter.before} onChange={e => setForm(f => ({ ...f, beforeAfter: { ...f.beforeAfter, before: e.target.value } }))} className="input resize-none h-20" placeholder="Struggling with low energy..." />
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1.5">After (Desired state)</label>
            <textarea value={form.beforeAfter.after} onChange={e => setForm(f => ({ ...f, beforeAfter: { ...f.beforeAfter, after: e.target.value } }))} className="input resize-none h-20" placeholder="Renewed strength & vitality..." />
          </div>
        </div>
        <div>
          <label className="block text-xs text-forest-500 mb-1.5">How to Use</label>
          <textarea name="howToUse" value={form.howToUse} onChange={handleChange} className="input resize-none h-20" placeholder="Take with warm milk before bedtime..." />
        </div>
      </div>

      {/* SEO */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wider">SEO</h2>
        <div>
          <label className="block text-xs text-forest-500 mb-1.5">SEO Title</label>
          <input name="seoTitle" value={form.seoTitle} onChange={handleChange} className="input" placeholder="Himalayan Shilajit Resin - Pure & Authentic | Arebianveda" />
        </div>
        <div>
          <label className="block text-xs text-forest-500 mb-1.5">SEO Description</label>
          <textarea name="seoDescription" value={form.seoDescription} onChange={handleChange} className="input resize-none h-16" placeholder="Meta description for search engines..." />
        </div>
      </div>
    </form>
  )
}
