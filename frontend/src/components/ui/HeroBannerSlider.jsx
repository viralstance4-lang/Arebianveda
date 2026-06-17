import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../../api'

const AUTOPLAY_MS = 5000
const SWIPE_THRESHOLD = 50

const isExternalUrl = (url) => /^https?:\/\//i.test(url || '')

// Default static hero — shown when no active banners exist so the homepage
// never breaks/looks empty even before the admin configures any slides.
function StaticHero() {
  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFDF5 0%, #EAF5EE 50%, #D2EADD 100%)' }}>
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%231C5C37\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
      />
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center relative">
        <div>
          <span className="badge-gold mb-4 inline-block">🌿 Rooted in Tradition, Trusted Today</span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-forest-900 leading-tight mb-6">
            Premium <span className="gold-text">Ayurvedic</span><br />Wellness Products
          </h1>
          <p className="text-forest-700 text-lg leading-relaxed mb-8 max-w-lg">
            Authentic Himalayan Shilajit & classical Ayurvedic formulas — crafted for modern health, rooted in 5000-year-old wisdom. FSSAI & GMP certified.
          </p>
          <div className="flex flex-wrap gap-4 mb-10">
            <Link to="/shop" className="btn-gold text-base px-8 py-4">
              Shop Now <ArrowRight size={18} />
            </Link>
            <Link to="/about" className="btn-outline-gold text-base px-8 py-4">
              Our Story
            </Link>
          </div>
          <div className="flex flex-wrap gap-4">
            {['FSSAI Certified', 'GMP Approved', 'Lab Tested', '100% Natural'].map(tag => (
              <span key={tag} className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
                <CheckCircle size={15} className="text-green-500" /> {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center">
          <div className="relative w-80 h-80 md:w-96 md:h-96">
            <div className="absolute inset-0 rounded-full opacity-20 blur-3xl"
              style={{ background: 'radial-gradient(circle, #4DAB76 0%, #0A2D19 100%)' }} />
            <img
              src="https://images.unsplash.com/photo-1611241893603-3c359704e0ee?w=700"
              alt="Shilajit Resin"
              className="relative w-full h-full object-cover rounded-3xl shadow-2xl border-4 border-forest-200"
            />
            {/* Floating badges */}
            <div className="absolute -top-4 -left-4 bg-white rounded-2xl shadow-lg p-3 border border-forest-200">
              <p className="text-xs text-forest-600 font-medium">Best Seller</p>
              <p className="text-lg font-bold text-forest-900">Shilajit Resin</p>
              <div className="flex text-gold-accent text-xs">★★★★★</div>
            </div>
            <div className="absolute -bottom-4 -right-4 bg-forest-900 rounded-2xl shadow-lg p-3 text-white">
              <p className="text-xs opacity-80">Starting at</p>
              <p className="text-2xl font-bold">₹750</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HeroBannerSlider() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const navigate = useNavigate()
  const touchStartX = useRef(null)

  useEffect(() => {
    api.get('/banners/active')
      .then(({ data }) => setBanners(data.banners || []))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false))
  }, [])

  const total = banners.length

  const goTo = useCallback((index) => {
    setCurrent(((index % total) + total) % total)
  }, [total])

  // Autoplay — paused on hover and when there's only one slide
  useEffect(() => {
    if (total <= 1 || paused) return
    const timer = setInterval(() => setCurrent(c => (c + 1) % total), AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [total, paused])

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      goTo(current + (delta > 0 ? -1 : 1))
    }
    touchStartX.current = null
  }

  const handleNavigate = (url, e) => {
    e?.stopPropagation()
    if (!url) return
    if (isExternalUrl(url)) window.location.href = url
    else navigate(url)
  }

  if (loading) {
    return <div className="h-[420px] md:h-[560px] bg-forest-50 animate-pulse" />
  }

  if (total === 0) {
    return <StaticHero />
  }

  const banner = banners[current]

  return (
    <section
      className="relative overflow-hidden bg-forest-900 group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`relative ${banner.clickUrl ? 'cursor-pointer' : ''}`}
        onClick={() => banner.clickUrl && handleNavigate(banner.clickUrl)}
      >
        <picture>
          {banner.mobileImage && (
            <source media="(max-width: 767px)" srcSet={banner.mobileImage} />
          )}
          <img
            src={banner.desktopImage}
            alt={banner.altText || banner.title}
            title={banner.title}
            className="w-full h-auto block"
            loading={current === 0 ? 'eager' : 'lazy'}
          />
        </picture>

        <div className="absolute inset-0 max-w-7xl mx-auto px-4 flex flex-col justify-center items-start z-10">
          <div className="max-w-lg text-white">
            {banner.subtitle && (
              <span className="badge-gold mb-4 inline-block">{banner.subtitle}</span>
            )}
            {banner.title && (
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 drop-shadow-md">
                {banner.title}
              </h1>
            )}
            <div className="flex flex-wrap gap-4">
              {banner.buttonText && (
                <button onClick={(e) => handleNavigate(banner.buttonUrl, e)} className="btn-gold text-base px-8 py-4">
                  {banner.buttonText} <ArrowRight size={18} />
                </button>
              )}
              {banner.secondaryButtonText && (
                <button onClick={(e) => handleNavigate(banner.secondaryButtonUrl, e)} className="btn-outline-gold !text-white !border-white text-base px-8 py-4">
                  {banner.secondaryButtonText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(current - 1) }}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-forest-900 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(current + 1) }}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-forest-900 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={22} />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i) }}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
