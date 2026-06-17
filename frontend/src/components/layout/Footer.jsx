import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin } from 'lucide-react'
import api from '../../api'
import { VisaIcon, MastercardIcon, UpiIcon, RazorpayIcon, CodIcon } from '../ui/PaymentIcons'

const InstagramIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
const FacebookIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>

export default function Footer() {
  const [policies, setPolicies] = useState([])

  useEffect(() => {
    api.get('/policies')
      .then(({ data }) => setPolicies(data.policies || []))
      .catch(() => setPolicies([]))
  }, [])

  return (
    <footer className="bg-forest-900 text-white/80">
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Brand */}
        <div>
          <div className="mb-4">
            <img src="/logo-white.png" alt="Arebianveda" className="h-20 w-20 object-contain" />
          </div>
          <p className="text-sm leading-relaxed text-white/70 mb-5">
            Premium Ayurvedic wellness products crafted from authentic Himalayan ingredients. FSSAI & GMP certified, lab-tested for purity.
          </p>
          <div className="flex gap-3">
            {[
              { icon: <InstagramIcon />, href: 'https://www.instagram.com/arebianveda?igsh=MXJpNGV5dTliNjFoMA%3D%3D&utm_source=qr' },
              { icon: <FacebookIcon />, href: 'https://www.facebook.com/people/Arebian-Veda/61582917054036/?mibextid=wwXIfr&rdid=rsu5rwRr6M5hIuJQ&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1CBdrRm4Xg%2F%3Fmibextid%3DwwXIfr' },
            ].map((s, i) => (
              <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center hover:border-gold-accent hover:text-gold-accent transition-colors">
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-semibold mb-5 font-serif text-lg">Quick Links</h4>
          <ul className="space-y-3">
            {[
              { to: '/shop', label: 'Shop All Products' },
              { to: '/about', label: 'About Us' },
              { to: '/blog', label: 'Ayurvedic Blog' },
              { to: '/contact', label: 'Contact Us' },
            ].map(l => (
              <li key={l.to}>
                <Link to={l.to} className="text-sm hover:text-gold-accent transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Policies */}
        <div>
          <h4 className="text-white font-semibold mb-5 font-serif text-lg">Policies</h4>
          <ul className="space-y-3">
            {policies.map(p => (
              <li key={p.slug}>
                <Link to={`/policy/${p.slug}`} className="text-sm hover:text-gold-accent transition-colors">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white font-semibold mb-5 font-serif text-lg">Get in Touch</h4>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone size={16} className="text-gold-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-white/50 mb-0.5">Call / WhatsApp</p>
                <a href="tel:+919911100480" className="text-sm hover:text-gold-accent">+91 991 110 0480</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail size={16} className="text-gold-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-white/50 mb-0.5">Email</p>
                <a href="mailto:arebianveda@gmail.com" className="text-sm hover:text-gold-accent">arebianveda@gmail.com</a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-gold-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-white/50 mb-0.5">Delivery</p>
                <p className="text-sm">Pan India — 3 to 5 Business Days</p>
              </div>
            </div>
          </div>

          {/* Payment icons */}
          <div className="mt-6">
            <p className="text-xs text-white/50 mb-3">Secure Payment</p>
            <div className="flex flex-wrap gap-2">
              {[<UpiIcon key="upi" />, <VisaIcon key="visa" />, <MastercardIcon key="mc" />, <RazorpayIcon key="rzp" />, <CodIcon key="cod" />].map((icon, i) => (
                <div key={i} className="rounded-md overflow-hidden border border-white/15 leading-none">
                  {icon}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 px-4 text-center">
        <p className="text-white/50 text-xs">
          © {new Date().getFullYear()} Arebianveda. All rights reserved. | FSSAI Lic. No. XXXXXXXXXXXXXXX
        </p>
        <p className="text-white/35 text-xs mt-1">
          *These statements have not been evaluated by the Food and Drug Administration. Not intended to diagnose, treat, cure, or prevent any disease.
        </p>
      </div>
    </footer>
  )
}
