import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Leaf, Award, Truck, Star, ArrowRight, CheckCircle } from 'lucide-react'
import ProductCard from '../components/ui/ProductCard'
import HeroBannerSlider from '../components/ui/HeroBannerSlider'
import api from '../api'
import { getConcernTheme } from '../constants/concernThemes'

const FEATURED = []

const isExternalUrl = (url) => /^https?:\/\//i.test(url || '')

// Default cards — shown when no active concerns are configured in the admin panel.
const DEFAULT_CONCERNS = [
  { label: 'Energy & Stamina',  icon: '⚡', colorTheme: 'green' },
  { label: 'Sugar Management',  icon: '🩸', colorTheme: 'red' },
  { label: 'Gym & Fitness',     icon: '💪', colorTheme: 'emerald' },
  { label: 'Immunity',          icon: '🛡️', colorTheme: 'blue' },
  { label: 'Skin & Hair',       icon: '✨', colorTheme: 'pink' },
  { label: 'Women\'s Health',   icon: '🌸', colorTheme: 'purple' },
]

const TRUST = [
  { icon: <ShieldCheck size={28} />, title: '100% Authentic', desc: 'Lab-tested, FSSAI & GMP certified products' },
  { icon: <Leaf size={28} />,        title: 'Pure & Natural',  desc: 'No synthetic additives, no heavy metals' },
  { icon: <Award size={28} />,       title: 'ISO Certified',   desc: 'International quality standards maintained' },
  { icon: <Truck size={28} />,       title: 'Fast Delivery',   desc: 'Pan India delivery in 3-5 business days' },
]

const TESTIMONIALS = [
  { name: 'Rajesh Kumar', city: 'Delhi', rating: 5, text: 'Shilajit Resin ne meri energy completely badal di. 3 mahine use karne ke baad gym performance 40% better ho gayi!', product: 'Shilajit Resin' },
  { name: 'Priya Sharma', city: 'Mumbai', rating: 5, text: 'D99 Kwath mera blood sugar naturally manage kar raha hai. Doctor bhi surprised hain results dekh ke.', product: 'D99 Kwath' },
  { name: 'Amit Singh', city: 'Bangalore', rating: 5, text: 'Black Tower capsules — best Shilajit product I have ever used. Genuine, potent, and results within 30 days.', product: 'Black Tower Capsules' },
]

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [concerns, setConcerns] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get('/products?sort=popular&limit=8')
      .then(({ data }) => setFeatured(data.products || []))
      .catch(() => setFeatured([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api.get('/concerns/active')
      .then(({ data }) => setConcerns(data.concerns || []))
      .catch(() => setConcerns([]))
  }, [])

  const concernCards = concerns && concerns.length > 0 ? concerns : DEFAULT_CONCERNS

  return (
    <div className="min-h-screen">

      {/* ── HERO ── */}
      <HeroBannerSlider />

      {/* ── TRUST BADGES ── */}
      <section className="bg-forest-900 py-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST.map(t => (
            <div key={t.title} className="flex flex-col items-center text-center gap-2">
              <div className="text-white">{t.icon}</div>
              <h3 className="text-white font-semibold text-sm">{t.title}</h3>
              <p className="text-forest-300 text-xs leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SHOP BY CONCERN ── */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="badge-green mb-3 inline-block">Personalized Wellness</span>
          <h2 className="section-title">Shop by Health Concern</h2>
          <p className="text-forest-600 mt-3 max-w-xl mx-auto">Find the right Ayurvedic solution for your specific health goal</p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {concernCards.map((c, i) => {
            const theme = getConcernTheme(c.colorTheme)
            const target = c.link || `/shop?concern=${encodeURIComponent(c.label)}`
            const cardClass = `bg-gradient-to-b ${theme.gradient} border ${theme.border} rounded-2xl p-4 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md w-[calc((100%_-_1rem)/2)] sm:w-[calc((100%_-_2rem)/3)] md:w-[calc((100%_-_5rem)/6)]`
            const content = (
              <>
                {c.image ? (
                  <img src={c.image} alt={c.label} className="w-20 h-20 mx-auto mb-2 object-contain rounded-lg" />
                ) : (
                  <div className="text-3xl mb-2">{c.icon}</div>
                )}
                <p className="text-forest-900 text-xs font-semibold leading-tight">{c.label}</p>
              </>
            )
            return isExternalUrl(target) ? (
              <a key={c._id || i} href={target} target="_blank" rel="noopener noreferrer" className={cardClass}>
                {content}
              </a>
            ) : (
              <Link key={c._id || i} to={target} className={cardClass}>
                {content}
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="py-16 px-4 bg-gradient-to-b from-forest-50 to-forest-100/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="badge-gold mb-3 inline-block">Our Products</span>
              <h2 className="section-title">Best Selling Products</h2>
            </div>
            <Link to="/shop" className="text-forest-800 hover:text-forest-900 font-medium flex items-center gap-1 text-sm">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-10 text-forest-500">Loading products…</div>
            ) : featured.length > 0 ? (
              featured.map(p => <ProductCard key={p._id} product={p} />)
            ) : (
              <div className="col-span-full text-center py-10 text-forest-500">No featured products available.</div>
            )}
          </div>
        </div>
      </section>

      {/* ── WHY AREBIANVEDA ── */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <img
              src="https://res.cloudinary.com/drqutfwoe/image/upload/v1781353440/arebianveda/media/zcdkxufg2v8brxqsrs2x.png"
              alt="Himalayas"
              className="rounded-3xl shadow-xl w-full object-cover h-80"
            />
          </div>
          <div>
            <span className="badge-green mb-4 inline-block">Why Choose Us</span>
            <h2 className="section-title mb-6">Sourced from the Heart of Himalayas</h2>
            <div className="space-y-5">
              {[
                { title: 'Altitude 16,000+ Feet', desc: 'Our Shilajit is collected from pristine Himalayan rocks where purity is at its peak.' },
                { title: 'Triple Purification Process', desc: 'Traditional Ayurvedic Shodhana (purification) followed by modern lab testing for heavy metals.' },
                { title: 'No Fillers, No Additives', desc: 'What you see on the label is exactly what you get — nothing more, nothing less.' },
                { title: 'Expert Ayurvedic Formulation', desc: 'Each product is developed in consultation with certified Ayurvedic practitioners.' },
              ].map(item => (
                <div key={item.title} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#1C5C37,#0A2D19)' }}>
                    <CheckCircle size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-forest-900 mb-1">{item.title}</h4>
                    <p className="text-forest-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/about" className="btn-gold mt-8 inline-flex">
              Learn Our Story <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-16 px-4 bg-forest-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <span className="badge-gold mb-3 inline-block">Customer Love</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              10,000+ Customers Trust Arebianveda
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-forest-800/50 border border-forest-700 rounded-2xl p-6">
                <div className="flex text-gold-accent text-lg mb-3">
                  {'★'.repeat(t.rating)}
                </div>
                <p className="text-forest-100 leading-relaxed mb-4 text-sm">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-forest-400 text-xs">{t.city}</p>
                  </div>
                  <span className="badge-gold text-xs">{t.product}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CERTIFICATIONS ── */}
      <section className="py-12 px-4 bg-forest-50 border-y border-forest-200">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-forest-600 text-sm font-semibold tracking-widest uppercase mb-6">Certified & Trusted</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {[
              { label: 'FSSAI Certified', logo: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781353803/arebianveda/media/xt7ezcmr3bkbvzhjben0.png' },
              { label: 'GMP Approved',    logo: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781353803/arebianveda/media/ecpcahbprkvpaxizjnps.png' },
              { label: 'ISO 9001:2015',   logo: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781353803/arebianveda/media/dijjdprsbmei5mggem2g.png' },
              { label: 'Lab Tested',      logo: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781353803/arebianveda/media/xmcpzegzrsrsk7x9oafg.png' },
              { label: '100% Vegan',      logo: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781353803/arebianveda/media/txv9cvr5slew41vqkqjf.png' },
              { label: 'Cruelty Free',    logo: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781353804/arebianveda/media/zrebspce22j5mgcjbwgj.png' },
            ].map(cert => (
              <img key={cert.label} src={cert.logo} alt={cert.label} title={cert.label} className="w-20 h-20 object-contain" />
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWSLETTER ── */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #FFFDF5, #D2EADD)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <span className="badge-green mb-4 inline-block">Stay Updated</span>
          <h2 className="section-title mb-3">Get Ayurvedic Wisdom in Your Inbox</h2>
          <p className="text-forest-600 mb-8">Subscribe for wellness tips, product launches & exclusive Ayurvedic insights</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={e => e.preventDefault()}>
            <input type="email" placeholder="Enter your email" className="input flex-1" required />
            <button type="submit" className="btn-gold whitespace-nowrap">Subscribe</button>
          </form>
          <p className="text-forest-500 text-xs mt-3">No spam. Unsubscribe anytime. 🌿</p>
        </div>
      </section>

    </div>
  )
}
