import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Search, Menu, X, Phone, Heart, LayoutDashboard, Leaf, Truck, Star } from 'lucide-react'
import useCartStore from '../../store/cartStore'
import useAuthStore from '../../store/authStore'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const cartCount = useCartStore(s => s.items.reduce((a, i) => a + i.qty, 0))
  const user = useAuthStore(s => s.user)
  const wishlistCount = user?.wishlist?.length || 0
  const navigate = useNavigate()

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
    setSearchOpen(false)
    setSearchQuery('')
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearchQuery('')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { to: '/',       label: 'Home' },
    { to: '/shop',   label: 'Shop' },
    { to: '/about',  label: 'About' },
    { to: '/blog',   label: 'Blog' },
    { to: '/contact',label: 'Contact' },
  ]

  const announcements = [
    { icon: Leaf,  text: '100% Authentic Ayurvedic Products' },
    { icon: Truck, text: 'Free Shipping above ₹599' },
    { icon: Star,  text: '4.8/5 — 10,000+ Happy Customers', fill: true },
  ]

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-gradient-to-r from-forest-800 via-forest-900 to-forest-800 text-cream-50 text-xs">
        {/* Desktop / tablet */}
        <div className="hidden md:flex max-w-7xl mx-auto items-center justify-between gap-4 px-6 py-2.5">
          <a href="tel:+919911100480" className="flex items-center gap-1.5 font-medium tracking-wide text-cream-100 hover:text-gold-accent transition-colors duration-200 flex-shrink-0">
            <Phone size={13} />
            +91 991 110 0480
          </a>
          <div className="flex items-center justify-center gap-2 lg:gap-3 font-medium tracking-wide text-cream-100 min-w-0">
            {announcements.slice(0, 2).map(({ icon: Icon, text }, i) => (
              <span key={i} className="flex items-center gap-1.5 truncate">
                <Icon size={13} className="text-gold-accent flex-shrink-0" />
                <span className="truncate">{text}</span>
                {i === 0 && <span className="text-gold-accent/50 mx-1">|</span>}
              </span>
            ))}
          </div>
          <div className="hidden lg:flex items-center gap-1.5 font-semibold tracking-wide text-gold-accent flex-shrink-0">
            <Star size={13} className="fill-gold-accent" />
            4.8/5 — 10,000+ Happy Customers
          </div>
        </div>

        {/* Mobile marquee */}
        <div className="md:hidden overflow-hidden py-2">
          <div className="flex w-max animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
            {[0, 1].map(rep => (
              <div key={rep} className="flex items-center gap-8 pr-8 flex-shrink-0">
                {announcements.map(({ icon: Icon, text, fill }, i) => (
                  <span key={i} className="flex items-center gap-1.5 font-medium tracking-wide">
                    <Icon size={13} className={`text-gold-accent ${fill ? 'fill-gold-accent' : ''}`} />
                    {text}
                  </span>
                ))}
                <a href="tel:+919911100480" className="flex items-center gap-1.5 font-medium tracking-wide">
                  <Phone size={13} className="text-gold-accent" />
                  +91 991 110 0480
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className={`sticky top-0 z-50 bg-cream-50/95 backdrop-blur-md transition-shadow duration-300 ${scrolled ? 'shadow-card border-b border-forest-200/70' : 'border-b border-forest-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-20 gap-3 sm:gap-6">

          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0 group">
            <img src="/logo.png" alt="Arebianveda" className="h-14 w-14 sm:h-16 sm:w-16 object-contain transition-transform duration-300 group-hover:scale-105" />
          </Link>

          {/* Desktop nav links — centered */}
          <div className="hidden lg:flex items-center justify-center flex-1 gap-9">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `relative py-2 text-[13px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 after:content-[''] after:absolute after:left-0 after:-bottom-0.5 after:h-[2px] after:rounded-full after:bg-gold-gradient after:transition-all after:duration-300 ${
                    isActive
                      ? 'text-forest-800 after:w-full'
                      : 'text-forest-900 hover:text-forest-800 after:w-0 hover:after:w-full'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
            {/* Search */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
              className={`p-2.5 rounded-full transition-colors duration-200 ${searchOpen ? 'bg-forest-100 text-forest-800' : 'text-forest-900 hover:text-forest-800 hover:bg-forest-50'}`}
            >
              <Search size={20} />
            </button>

            {/* Wishlist */}
            <Link to={user ? '/profile?tab=wishlist' : '/login'} aria-label="Wishlist" className="hidden sm:block relative p-2.5 rounded-full text-forest-900 hover:text-forest-800 hover:bg-forest-50 transition-colors duration-200">
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full text-white text-[10px] flex items-center justify-center font-bold bg-gold-gradient shadow-gold">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Admin Dashboard link */}
            {user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                className="hidden sm:flex items-center gap-1.5 ml-1 px-3.5 py-2 rounded-full text-white text-xs font-semibold bg-gold-gradient shadow-gold hover:shadow-gold-lg transition-shadow duration-300"
              >
                <LayoutDashboard size={14} /> Admin
              </Link>
            )}

            {/* User */}
            <Link
              to={user ? '/profile' : '/login'}
              aria-label="Account"
              className="p-2.5 rounded-full text-forest-900 hover:text-forest-800 hover:bg-forest-50 transition-colors duration-200"
            >
              <User size={20} />
            </Link>

            {/* Cart */}
            <Link to="/cart" aria-label="Cart" className="relative p-2.5 rounded-full text-forest-900 hover:text-forest-800 hover:bg-forest-50 transition-colors duration-200">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full text-white text-[10px] flex items-center justify-center font-bold bg-gold-gradient shadow-gold">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
              className="lg:hidden p-2.5 rounded-full text-forest-900 hover:text-forest-800 hover:bg-forest-50 transition-colors duration-200"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="border-t border-forest-100 px-4 py-4 bg-white animate-fade-in-down">
            <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto relative">
              <button type="submit" aria-label="Search" className="absolute left-5 top-1/2 -translate-y-1/2 text-forest-600 hover:text-forest-800">
                <Search size={18} />
              </button>
              <input
                autoFocus
                type="text"
                placeholder="Search Shilajit, Kwath, Ashwagandha..."
                className="w-full pl-12 pr-12 py-3.5 rounded-full border-2 border-forest-200 bg-cream-50 focus:outline-none focus:ring-4 focus:ring-forest-100 focus:border-forest-800 transition-all duration-200 text-sm placeholder:text-forest-400/70"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button type="button" onClick={closeSearch} aria-label="Close search" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-forest-500 hover:text-forest-800 hover:bg-forest-100 transition-colors">
                <X size={16} />
              </button>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-forest-100 bg-cream-50 px-4 py-4 flex flex-col gap-1 animate-fade-in-down">
            {user?.role === 'admin' && (
              <Link
                to="/admin/dashboard"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-base font-semibold py-3 px-3 rounded-xl border-b border-forest-100 text-forest-800 hover:bg-forest-50 transition-colors duration-200"
              >
                <LayoutDashboard size={18} /> Admin Dashboard
              </Link>
            )}
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `text-base font-medium py-3 px-3 rounded-xl border-b border-forest-100 last:border-0 transition-colors duration-200 ${
                    isActive ? 'text-forest-800 bg-forest-50' : 'text-forest-900 hover:bg-forest-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to={user ? '/profile?tab=wishlist' : '/login'}
              onClick={() => setMenuOpen(false)}
              className="sm:hidden flex items-center justify-between gap-2 text-base font-medium py-3 px-3 rounded-xl border-b border-forest-100 text-forest-900 hover:bg-forest-50 transition-colors duration-200"
            >
              <span className="flex items-center gap-2"><Heart size={18} /> Wishlist</span>
              {wishlistCount > 0 && <span className="text-xs font-bold bg-gold-gradient text-white rounded-full px-2 py-0.5">{wishlistCount}</span>}
            </Link>
            <div className="pt-3 flex gap-3">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-outline-gold text-sm flex-1 text-center">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-gold text-sm flex-1 text-center">Register</Link>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
