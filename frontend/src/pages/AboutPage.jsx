import { Link } from 'react-router-dom'
import { Award, Leaf, Heart, ArrowRight } from 'lucide-react'

const VALUES = [
  { image: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781354866/arebianveda/media/l4wyicvqdfhrb0poc7yl.png', title: 'Purity First',      desc: 'Every product starts with the purest ingredients — no fillers, no synthetics, no compromise.' },
  { image: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781354866/arebianveda/media/svh7vorvsziabcpegzwk.png', title: 'Ancient Wisdom',    desc: 'Our formulas are rooted in 5000-year-old Ayurvedic texts, validated by modern science.' },
  { image: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781354866/arebianveda/media/jzwgnwdmpgavxsjbsmyp.png', title: 'Lab Verified',      desc: 'Every batch is independently tested for potency, purity, and heavy metal safety.' },
  { image: 'https://res.cloudinary.com/drqutfwoe/image/upload/v1781354866/arebianveda/media/xj69flwwfmikajv4exgm.png', title: 'Customer First',    desc: 'Your wellness is our mission. Real results, transparent ingredients, genuine care.' },
]

const TEAM = [
  { name: 'Dr. Sunil Sharma', role: 'Ayurvedic Consultant', img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400' },
  { name: 'Priya Nair', role: 'Head of Quality Control', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative bg-forest-900 py-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200')] bg-cover bg-center" />
        <div className="relative">
          <span className="badge-gold mb-4 inline-block">Our Story</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display',serif" }}>
            Rooted in Tradition,<br />Trusted Today
          </h1>
          <p className="text-forest-300 max-w-2xl mx-auto text-lg">
            Arebianveda was founded with one mission — to make authentic, lab-verified Ayurvedic wellness accessible to every Indian household.
          </p>
        </div>
      </div>

      {/* Our story */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="badge-green mb-4 inline-block">The Beginning</span>
            <h2 className="section-title mb-5">From the Himalayas to Your Home</h2>
            <div className="space-y-4 text-forest-600 leading-relaxed">
              <p>Arebianveda was born out of a personal journey. Our founder, after witnessing the life-changing effects of authentic Himalayan Shilajit on his own health, became determined to bring this ancient medicine to modern consumers — without compromise.</p>
              <p>The problem? Most Shilajit available in the market is adulterated, diluted, or improperly processed. We set out to change that by building direct sourcing relationships with harvesters in the Himalayan region of Uttarakhand and Himachal Pradesh.</p>
              <p>Today, Arebianveda is trusted by 10,000+ customers across India — not because of marketing, but because our products deliver real, measurable results.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="https://res.cloudinary.com/drqutfwoe/image/upload/v1781505906/arebianveda/media/f5djryow6q4ju8d5q14e.webp" alt="Himalayas" className="rounded-2xl w-full h-80 object-cover" />
            <img src="https://res.cloudinary.com/drqutfwoe/image/upload/v1781505907/arebianveda/media/topzsdj8eqnjhofxpcfr.webp" alt="Shilajit" className="rounded-2xl w-full h-80 object-cover mt-6" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-forest-900 py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: '10,000+', label: 'Happy Customers' },
            { num: '4.8★',    label: 'Average Rating' },
            { num: '100%',    label: 'Natural Ingredients' },
            { num: '3+',      label: 'Years of Trust' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-gold-accent mb-1" style={{ fontFamily: "'Playfair Display',serif" }}>{s.num}</p>
              <p className="text-forest-300 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge-gold mb-3 inline-block">Our Values</span>
          <h2 className="section-title">What We Stand For</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map(v => (
            <div key={v.title} className="card p-6 text-center">
              <img src={v.image} alt={v.title} className="w-16 h-16 mx-auto mb-4 object-contain" />
              <h3 className="font-semibold text-forest-900 mb-2">{v.title}</h3>
              <p className="text-forest-500 text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quality process */}
      <section className="py-16 px-4 bg-forest-50">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <span className="badge-green mb-3 inline-block">Our Process</span>
          <h2 className="section-title">From Source to Your Doorstep</h2>
        </div>
        <div className="max-w-4xl mx-auto grid md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Himalayan Sourcing', desc: 'Collected at 16,000+ ft altitude from trusted Uttarakhand harvesters' },
            { step: '02', title: 'Ayurvedic Purification', desc: 'Traditional Shodhana process removes impurities' },
            { step: '03', title: 'Lab Testing', desc: 'Every batch tested for potency, heavy metals, and purity' },
            { step: '04', title: 'Certified & Shipped', desc: 'FSSAI & GMP certified before reaching your home' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-white font-bold"
                style={{ background: 'linear-gradient(135deg,#1C5C37,#0A2D19)' }}>
                {s.step}
              </div>
              <h4 className="font-semibold text-forest-900 mb-2 text-sm">{s.title}</h4>
              <p className="text-forest-500 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Certifications */}
      <section className="py-14 px-4 max-w-4xl mx-auto text-center">
        <h2 className="section-title mb-8">Certified & Verified</h2>
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
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-forest-900 text-center">
        <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display',serif" }}>
          Ready to Experience the Arebianveda Difference?
        </h2>
        <p className="text-forest-300 mb-8 max-w-lg mx-auto">Join 10,000+ customers who have transformed their health with authentic Ayurveda</p>
        <Link to="/shop" className="btn-gold text-base px-8 py-4">
          Shop Now <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  )
}
