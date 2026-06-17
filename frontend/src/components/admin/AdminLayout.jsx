import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tag, Settings,
  Menu, LogOut, Home, Layers, HelpCircle, Star, FileText, Image, Aperture, Images, Sparkles, CreditCard,
} from 'lucide-react'
import { io } from 'socket.io-client'
import useAuthStore from '../../store/authStore'
import useUnviewedOrdersStore from '../../store/unviewedOrdersStore'
import api from '../../api'
import toast from 'react-hot-toast'

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '')

const navItems = [
  { to: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/banners',    label: 'Homepage Banners', icon: Images },
  { to: '/admin/concerns',   label: 'Health Concerns', icon: Sparkles },
  { to: '/admin/products',   label: 'Products',   icon: Package },
  { to: '/admin/blogs',      label: 'Blogs',      icon: FileText },
  { to: '/admin/categories', label: 'Categories', icon: Layers },
  { to: '/admin/orders',     label: 'Orders',     icon: ShoppingCart },
  { to: '/admin/users',      label: 'Users',      icon: Users },
  { to: '/admin/reviews',    label: 'Reviews',    icon: Star },
  { to: '/admin/coupons',    label: 'Coupons',    icon: Tag },
  { to: '/admin/faqs',       label: 'FAQs',       icon: HelpCircle },
  { to: '/admin/policies',   label: 'Policies',   icon: FileText },
  { to: '/admin/media',      label: 'Media',      icon: Image },
  { to: '/admin/logos',      label: 'Logos',      icon: Aperture },
  { to: '/admin/payment-settings', label: 'Payment Settings', icon: CreditCard },
  { to: '/admin/settings',   label: 'Settings',   icon: Settings },
]

function SidebarContent({ onNavigate, unviewedCount }) {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-forest-800">
        <img src="/logo-white.png" alt="Arebianveda" className="h-10 w-10 object-contain" />
        <div>
          <p className="text-white font-serif font-bold leading-none">AREBIANVEDA</p>
          <p className="text-forest-800 text-[10px] tracking-widest mt-1">ADMIN PANEL</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-forest-800 text-white' : 'text-forest-200 hover:bg-forest-800'
              }`
            }
          >
            <item.icon size={18} />
            <span className="flex-1">{item.label}</span>
            {item.to === '/admin/orders' && unviewedCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                {unviewedCount > 99 ? '99+' : unviewedCount}
              </span>
            )}
          </NavLink>
        ))}

        <NavLink
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-forest-200 hover:bg-forest-800 transition-colors mt-4 border-t border-forest-800 pt-4"
        >
          <Home size={18} />
          Back to Store
        </NavLink>
      </nav>

      <div className="px-3 py-4 border-t border-forest-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-forest-800 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-forest-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-forest-200 hover:bg-forest-800 transition-colors w-full">
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { count: unviewedCount, setCount } = useUnviewedOrdersStore()

  useEffect(() => {
    api.get('/orders/admin/unviewed-count')
      .then(({ data }) => setCount(data.unviewedCount))
      .catch(() => {})

    const socket = io(SOCKET_URL, { withCredentials: true })
    socket.emit('join:admin')
    socket.on('orders:update', ({ unviewedCount: c }) => { if (c !== undefined) setCount(c) })
    socket.on('orders:unviewed', ({ unviewedCount: c }) => setCount(c))
    return () => socket.disconnect()
  }, [setCount])

  return (
    <div className="flex h-screen bg-forest-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-forest-900 flex-shrink-0">
        <SidebarContent unviewedCount={unviewedCount} />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-forest-900">
            <SidebarContent onNavigate={() => setSidebarOpen(false)} unviewedCount={unviewedCount} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between bg-forest-900 px-4 h-14 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-white p-1">
            <Menu size={22} />
          </button>
          <p className="text-white font-serif font-semibold">Admin Panel</p>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
