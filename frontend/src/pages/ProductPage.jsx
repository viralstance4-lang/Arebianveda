import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Heart, Star, CheckCircle, Truck, Shield, Award, Minus, Plus, Package, ChevronDown } from 'lucide-react'
import useCartStore from '../store/cartStore'
import useWishlist from '../hooks/useWishlist'
import toast from 'react-hot-toast'
import api from '../api'
import ProductCard from '../components/ui/ProductCard'

const TABS = [
  { id: 'benefits',    label: 'Benefits' },
  { id: 'ingredients', label: 'Ingredients' },
  { id: 'how-to-use',  label: 'How To Use' },
  { id: 'reviews',     label: 'Reviews' },
  { id: 'faqs',        label: 'FAQs' },
]

export default function ProductPage() {
  const { slug } = useParams()
  const addItem = useCartStore(s => s.addItem)
  const { user, isWishlisted, toggleWishlist } = useWishlist()

  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [selectedPackage, setSelectedPackage] = useState(null)
  const [qty, setQty]               = useState(1)
  const [activeImg, setActiveImg]   = useState(0)
  const [activeTab, setActiveTab]   = useState('benefits')

  const [showReviewForm, setShowReviewForm] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: '', comment: '', name: '', email: '', city: '' })

  const [faqs, setFaqs] = useState([])
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    api.get('/faqs').then(({ data }) => setFaqs(data.faqs || [])).catch(() => setFaqs([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    setProduct(null)
    setSelectedPackage(null)
    setQty(1)
    setActiveImg(0)
    setActiveTab('benefits')

    api.get(`/products/${slug}`)
      .then(({ data }) => {
        setProduct(data.product)
        setReviews(data.reviews || [])
        const pkgs = data.product.packageVariants || []
        if (pkgs.length) {
          const def = pkgs.findIndex(pv => pv.isDefault)
          setSelectedPackage(def > -1 ? def : 0)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!product?._id) { setRelated([]); return }
    api.get(`/products/${product._id}/related`)
      .then(({ data }) => setRelated(data.products || []))
      .catch(() => setRelated([]))
  }, [product?._id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-forest-200 border-t-forest-800 rounded-full animate-spin" />
    </div>
  )

  if (notFound || !product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-2xl text-forest-800 font-serif">Product not found</p>
      <Link to="/shop" className="btn-gold">Browse All Products</Link>
    </div>
  )

  const hasPackages = product.packageVariants?.length > 0
  const pkg = hasPackages ? product.packageVariants[selectedPackage ?? 0] : null
  const activePrice = pkg ? pkg.price : product.price
  const activeComparePrice = pkg ? pkg.comparePrice : product.comparePrice
  const activeDiscount = activeComparePrice > activePrice
    ? Math.round(((activeComparePrice - activePrice) / activeComparePrice) * 100) : 0
  const unitsPerPurchase = pkg ? pkg.quantity : 1
  const outOfStock = (product.stock || 0) < unitsPerPurchase

  const images = product.images?.length > 0 ? product.images : []
  const herbs = product.keyHerbs?.length > 0 ? product.keyHerbs : (product.ingredients || [])

  const handleAddToCart = () => {
    addItem(product, qty, null, pkg)
    toast.success(`${product.name}${pkg ? ` — ${pkg.label}` : ''} added to cart!`)
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!reviewForm.rating) return toast.error('Please select a rating')
    if (!reviewForm.comment.trim()) return toast.error('Please write your review')
    if (!user && (!reviewForm.name.trim() || !reviewForm.email.trim())) return toast.error('Please enter your name and email')

    setSubmittingReview(true)
    try {
      await api.post('/reviews', { product: product._id, ...reviewForm })
      toast.success('Review submitted! It will appear after approval.')
      setReviewForm({ rating: 0, title: '', comment: '', name: '', email: '', city: '' })
      setShowReviewForm(false)
    } catch {
      toast.error('Could not submit review. Please try again.')
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-forest-50 border-b border-forest-100 px-4 py-3">
        <div className="max-w-7xl mx-auto text-sm text-forest-500">
          <Link to="/" className="hover:text-forest-800">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/shop" className="hover:text-forest-800">Shop</Link>
          <span className="mx-2">/</span>
          <span className="text-forest-800 font-medium">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-12">

          {/* Images */}
          <div>
            <div className="rounded-3xl overflow-hidden bg-forest-50 aspect-square mb-4 border border-forest-100 flex items-center justify-center">
              {images.length > 0 ? (
                <img src={images[activeImg]?.url} alt={images[activeImg]?.alt || product.name}
                  onError={e => { e.target.onerror = null; e.target.src = '/logo.png' }}
                  className="w-full h-full object-cover" />
              ) : (
                <Package size={64} className="text-forest-200" />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${activeImg === i ? 'border-forest-800' : 'border-forest-100 opacity-60 hover:opacity-100'}`}>
                    <img src={img.url} alt={img.alt} onError={e => { e.target.onerror = null; e.target.src = '/logo.png' }} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {product.isBestseller && <span className="bg-forest-900 text-forest-300 text-xs font-bold px-3 py-1 rounded-full">BESTSELLER</span>}
              {product.concerns?.map(concern => (
                <span key={concern} className="badge-green">{concern}</span>
              ))}
              {product.forms?.map(form => (
                <span key={form} className="badge-gold capitalize">{form}</span>
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-forest-900 mb-2">{product.name}</h1>
            <p className="text-forest-500 text-lg mb-4">{product.tagline}</p>

            {/* Ratings */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex text-gold-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill={i < Math.round(product.ratings?.average || 0) ? 'currentColor' : 'none'} />
                ))}
              </div>
              <span className="text-forest-700 font-semibold">{product.ratings?.average || 0}</span>
              <span className="text-forest-400 text-sm">({(product.ratings?.count || 0).toLocaleString()} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-end gap-4 mb-6">
              <span className="text-4xl font-bold text-forest-900">₹{activePrice}</span>
              {activeComparePrice > activePrice && (
                <>
                  <span className="text-lg text-forest-400 line-through">₹{activeComparePrice}</span>
                  <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-1 rounded-full">{activeDiscount}% OFF</span>
                </>
              )}
            </div>

            {/* Package selector */}
            {hasPackages && (
              <div className="mb-6">
                <p className="text-forest-800 font-semibold mb-3 text-sm">Choose Package</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {product.packageVariants.map((pv, i) => {
                    const save = pv.comparePrice > pv.price ? pv.comparePrice - pv.price : 0
                    return (
                      <button key={i} onClick={() => setSelectedPackage(i)}
                        className={`flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border-2 text-left transition-all ${selectedPackage === i ? 'border-forest-800 bg-forest-50' : 'border-forest-200 hover:border-forest-300'}`}>
                        <span className="font-semibold text-forest-900 text-sm">{pv.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-forest-900">₹{pv.price}</span>
                          {save > 0 && <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Save ₹{save}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Qty + Add to cart */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border-2 border-forest-200 rounded-full overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-4 py-3 hover:bg-forest-50 text-forest-700">
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center font-semibold text-forest-900">{qty}</span>
                <button onClick={() => setQty(q => Math.min(Math.max(1, Math.floor((product.stock || 0) / unitsPerPurchase)), q + 1))} className="px-4 py-3 hover:bg-forest-50 text-forest-700">
                  <Plus size={16} />
                </button>
              </div>
              <button onClick={handleAddToCart} disabled={outOfStock}
                className="btn-gold flex-1 justify-center py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed">
                <ShoppingCart size={20} /> {!outOfStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button
                onClick={() => toggleWishlist(product._id)}
                aria-label={isWishlisted(product._id) ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`p-4 rounded-full border-2 transition-colors ${
                  isWishlisted(product._id)
                    ? 'border-red-300 text-red-500'
                    : 'border-forest-200 hover:border-red-300 hover:text-red-400 text-forest-400'
                }`}
              >
                <Heart size={20} fill={isWishlisted(product._id) ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Buy now */}
            {!outOfStock && (
              <Link to="/checkout" onClick={handleAddToCart}
                className="btn-green w-full justify-center py-4 text-base mb-6">
                Buy Now — ₹{activePrice * qty}
              </Link>
            )}

            {/* Delivery info */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-forest-50 rounded-2xl border border-forest-100 mb-6">
              {[
                { icon: <Award size={18} />,      text: 'Premium Quality Guaranteed' },
                { icon: <Shield size={18} />,     text: 'Secure & Encrypted Payment' },
                { icon: <Truck size={18} />,      text: 'Fast Dispatch Within 24 Hours' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1 text-center">
                  <div className="text-forest-800">{item.icon}</div>
                  <p className="text-xs text-forest-600 leading-tight">{item.text}</p>
                </div>
              ))}
            </div>

            {/* Certifications */}
            {product.certifications?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.certifications.map(c => (
                  <span key={c} className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 text-xs font-medium px-3 py-1 rounded-full">
                    <CheckCircle size={12} /> {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-14">
          <div className="flex gap-1 border-b border-forest-200 mb-8 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-6 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === t.id ? 'border-forest-800 text-forest-800' : 'border-transparent text-forest-500 hover:text-forest-800'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'benefits' && (
            product.benefits?.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {product.benefits.map((b, i) => (
                  <div key={i} className="card p-5 flex gap-4">
                    <div className="text-3xl flex-shrink-0">{b.icon}</div>
                    <div>
                      <h4 className="font-semibold text-forest-900 mb-1">{b.title}</h4>
                      <p className="text-forest-500 text-sm leading-relaxed">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-forest-400">No benefits listed for this product yet.</p>
            )
          )}

          {activeTab === 'ingredients' && (
            <div className="max-w-2xl">
              <div className="policy-content mb-5" dangerouslySetInnerHTML={{ __html: product.description }} />
              {herbs.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {herbs.map(h => (
                    <span key={h} className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                      🌿 {h}
                    </span>
                  ))}
                </div>
              )}
              {product.dosage && (
                <div className="mt-6 p-5 bg-forest-50 rounded-2xl border border-forest-100">
                  <p className="font-semibold text-forest-800 mb-2">Dosage</p>
                  <p className="text-forest-600 text-sm">{product.dosage}</p>
                </div>
              )}
              {product.suitableFor?.length > 0 && (
                <div className="mt-4 p-4 bg-forest-50 rounded-2xl border border-forest-100">
                  <p className="text-xs text-forest-400">Suitable for: {product.suitableFor.join(', ')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'how-to-use' && (
            <div className="max-w-2xl">
              <div className="card p-6">
                <h3 className="font-serif text-xl font-bold text-forest-900 mb-4">How to Use</h3>
                {product.howToUse ? (
                  <p className="text-forest-600 leading-relaxed">{product.howToUse}</p>
                ) : (
                  <p className="text-forest-400">No usage instructions provided.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="max-w-2xl space-y-3">
              {/* Write a review */}
              <div className="card border border-forest-100 p-5">
                {!showReviewForm ? (
                  <button onClick={() => setShowReviewForm(true)} className="btn-outline-gold text-sm">
                    Write a Review
                  </button>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <h3 className="font-serif text-lg font-bold text-forest-900">Write a Review</h3>

                    <div>
                      <p className="text-sm font-semibold text-forest-800 mb-2">Your Rating</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button type="button" key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))} aria-label={`${n} star`}>
                            <Star size={26} className="text-gold-accent" fill={n <= reviewForm.rating ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <input type="text" placeholder="Review title (optional)" className="input"
                      value={reviewForm.title} onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))} />

                    <textarea rows={4} placeholder="Share your experience with this product..." className="input"
                      value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} />

                    {!user && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <input type="text" placeholder="Your name" className="input"
                          value={reviewForm.name} onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))} />
                        <input type="email" placeholder="Your email" className="input"
                          value={reviewForm.email} onChange={e => setReviewForm(f => ({ ...f, email: e.target.value }))} />
                      </div>
                    )}

                    <input type="text" placeholder="Your city (optional)" className="input"
                      value={reviewForm.city} onChange={e => setReviewForm(f => ({ ...f, city: e.target.value }))} />

                    <div className="flex gap-3">
                      <button type="submit" disabled={submittingReview} className="btn-gold text-sm disabled:opacity-50">
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button type="button" onClick={() => setShowReviewForm(false)} className="btn-outline-gold text-sm">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {reviews.length === 0 ? (
                <p className="text-forest-400">No reviews yet. Be the first to review this product!</p>
              ) : reviews.map(r => (
                <div key={r._id} className="card border border-forest-100 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex text-gold-accent">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < r.rating ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                      {r.isVerifiedPurchase && <span className="text-xs text-green-600 font-medium">Verified Purchase</span>}
                    </div>
                    <span className="text-xs text-forest-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.title && <p className="font-semibold text-forest-900 text-sm mb-1">{r.title}</p>}
                  <p className="text-forest-600 text-sm leading-relaxed">{r.comment}</p>
                  <p className="text-xs text-forest-400 mt-2">— {r.name}{r.city ? `, ${r.city}` : ''}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'faqs' && (
            <div className="max-w-2xl space-y-3">
              {faqs.length === 0 ? (
                <p className="text-forest-400">No FAQs available yet.</p>
              ) : faqs.map(f => (
                <div key={f._id} className="card border border-forest-100 overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === f._id ? null : f._id)}
                    className="w-full flex items-center justify-between gap-3 p-5 text-left">
                    <span className="font-semibold text-forest-900 text-sm">{f.question}</span>
                    <ChevronDown size={18} className={`text-forest-500 flex-shrink-0 transition-transform ${openFaq === f._id ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === f._id && (
                    <p className="px-5 pb-5 text-forest-600 text-sm leading-relaxed">{f.answer}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="section-title mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map(p => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
