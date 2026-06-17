import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { User, MapPin, Heart, Package, LogOut, Edit3, Plus, CheckCircle, Loader2, Trash2 } from 'lucide-react'
import useAuthStore from '../store/authStore'
import api from '../api'
import ProductCard from '../components/ui/ProductCard'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'profile',   label: 'My Profile',  icon: <User size={16} /> },
  { id: 'orders',    label: 'My Orders',   icon: <Package size={16} /> },
  { id: 'addresses', label: 'Addresses',   icon: <MapPin size={16} /> },
  { id: 'wishlist',  label: 'Wishlist',    icon: <Heart size={16} /> },
]

const ORDER_STATUS = {
  placed:     { label: 'Order Placed', color: 'bg-blue-100 text-blue-700' },
  confirmed:  { label: 'Confirmed',    color: 'bg-forest-100 text-forest-900' },
  processing: { label: 'Processing',   color: 'bg-orange-100 text-orange-700' },
  shipped:    { label: 'Shipped',      color: 'bg-purple-100 text-purple-700' },
  delivered:  { label: 'Delivered',    color: 'bg-green-100 text-green-700' },
  cancelled:  { label: 'Cancelled',    color: 'bg-red-100 text-red-700' },
}

const EMPTY_ADDRESS = { name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', isDefault: false }

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore()
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()
  const [tab, setTab]    = useState(TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'profile')

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm]       = useState({ name: '', phone: '' })
  const [savingProfile, setSavingProfile]   = useState(false)

  // Orders
  const [orders, setOrders]               = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Addresses
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressForm, setAddressForm]   = useState(EMPTY_ADDRESS)
  const [savingAddress, setSavingAddress] = useState(false)

  // Wishlist
  const [wishlist, setWishlist]               = useState([])
  const [wishlistLoading, setWishlistLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'orders' || !user) return
    setOrdersLoading(true)
    api.get('/orders/my')
      .then(({ data }) => setOrders(data.orders || []))
      .finally(() => setOrdersLoading(false))
  }, [tab, user])

  useEffect(() => {
    if (tab !== 'wishlist' || !user) return
    setWishlistLoading(true)
    api.get('/auth/wishlist')
      .then(({ data }) => setWishlist(data.wishlist || []))
      .finally(() => setWishlistLoading(false))
  }, [tab, user])

  if (!user) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-serif text-forest-900">Please login to view your profile</p>
      <Link to="/login" className="btn-gold">Sign In</Link>
    </div>
  )

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/')
  }

  // ── Profile edit ──────────────────────────────────────────────────────────
  const openEditProfile = () => {
    setProfileForm({ name: user.name || '', phone: user.phone || '' })
    setEditingProfile(true)
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!profileForm.name.trim()) return toast.error('Name is required')
    setSavingProfile(true)
    try {
      const { data } = await api.put('/auth/profile', profileForm)
      updateUser({ ...user, name: data.user.name, phone: data.user.phone })
      toast.success('Profile updated')
      setEditingProfile(false)
    } catch {
      toast.error('Could not update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Addresses ────────────────────────────────────────────────────────────
  const openAddAddress = () => {
    setEditingAddressId(null)
    setAddressForm(EMPTY_ADDRESS)
    setShowAddressForm(true)
  }

  const openEditAddress = (addr) => {
    setEditingAddressId(addr._id)
    setAddressForm({
      name: addr.name || '', phone: addr.phone || '', line1: addr.line1 || '', line2: addr.line2 || '',
      city: addr.city || '', state: addr.state || '', pincode: addr.pincode || '', isDefault: !!addr.isDefault,
    })
    setShowAddressForm(true)
  }

  const closeAddressForm = () => {
    setShowAddressForm(false)
    setEditingAddressId(null)
    setAddressForm(EMPTY_ADDRESS)
  }

  const handleAddressSubmit = async (e) => {
    e.preventDefault()
    const { name, phone, line1, city, state, pincode } = addressForm
    if (!name.trim() || !phone.trim() || !line1.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      return toast.error('Please fill all required fields')
    }
    setSavingAddress(true)
    try {
      const { data } = editingAddressId
        ? await api.put(`/auth/address/${editingAddressId}`, addressForm)
        : await api.post('/auth/address', addressForm)
      updateUser({ ...user, addresses: data.addresses })
      toast.success(editingAddressId ? 'Address updated' : 'Address added')
      closeAddressForm()
    } catch {
      toast.error('Could not save address')
    } finally {
      setSavingAddress(false)
    }
  }

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Delete this address?')) return
    try {
      const { data } = await api.delete(`/auth/address/${addressId}`)
      updateUser({ ...user, addresses: data.addresses })
      toast.success('Address deleted')
    } catch {
      toast.error('Could not delete address')
    }
  }

  return (
    <div className="min-h-screen bg-forest-50/30">
      <div className="bg-forest-900 py-10 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-forest-600 flex items-center justify-center text-white text-2xl font-bold">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display',serif" }}>{user.name}</h1>
            <p className="text-forest-300 text-sm">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="card p-4 space-y-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${tab === t.id ? 'bg-forest-100 text-forest-900' : 'text-forest-700 hover:bg-forest-100'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 transition-colors">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </aside>

          {/* Main */}
          <div className="lg:col-span-3">
            {tab === 'profile' && (
              <div className="card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-serif text-xl font-bold text-forest-900">Personal Information</h2>
                  {!editingProfile && (
                    <button onClick={openEditProfile} className="flex items-center gap-2 text-forest-800 text-sm hover:text-forest-900">
                      <Edit3 size={15} /> Edit
                    </button>
                  )}
                </div>

                {editingProfile ? (
                  <form onSubmit={handleProfileSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs text-forest-400 font-medium mb-1 block">Full Name</label>
                        <input type="text" className="input" value={profileForm.name}
                          onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-forest-400 font-medium mb-1 block">Email</label>
                        <input type="email" className="input bg-forest-50 text-forest-400" value={user.email} disabled />
                      </div>
                      <div>
                        <label className="text-xs text-forest-400 font-medium mb-1 block">Phone</label>
                        <input type="text" className="input" value={profileForm.phone}
                          onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-forest-400 font-medium mb-1 block">Account Type</label>
                        <input type="text" className="input bg-forest-50 text-forest-400" value={user.role === 'admin' ? 'Administrator' : 'Customer'} disabled />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={savingProfile} className="btn-gold text-sm disabled:opacity-50">
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => setEditingProfile(false)} className="btn-outline-gold text-sm">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-5">
                    {[
                      { label: 'Full Name', value: user.name },
                      { label: 'Email', value: user.email },
                      { label: 'Phone', value: user.phone || 'Not added' },
                      { label: 'Account Type', value: user.role === 'admin' ? 'Administrator' : 'Customer' },
                    ].map(f => (
                      <div key={f.label} className="bg-forest-50 rounded-xl p-4 border border-forest-100">
                        <p className="text-xs text-forest-400 font-medium mb-1">{f.label}</p>
                        <p className="text-forest-900 font-medium">{f.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'orders' && (
              <div className="card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-serif text-xl font-bold text-forest-900">My Orders</h2>
                  {orders.length > 0 && (
                    <Link to="/orders" className="text-forest-800 text-sm font-medium hover:underline">View All</Link>
                  )}
                </div>

                {ordersLoading ? (
                  <div className="text-center py-12">
                    <Loader2 size={32} className="text-forest-300 mx-auto animate-spin" />
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map(order => {
                      const status = ORDER_STATUS[order.orderStatus] || ORDER_STATUS.placed
                      return (
                        <Link key={order._id} to="/orders" className="block p-4 border border-forest-100 rounded-xl hover:border-forest-300 transition-colors">
                          <div className="flex flex-wrap justify-between items-center gap-3">
                            <div>
                              <p className="font-mono text-sm font-bold text-forest-900">{order.orderId}</p>
                              <p className="text-xs text-forest-400 mt-0.5">
                                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {' · '}{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
                              <span className="font-bold text-forest-900">₹{order.total}</span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package size={48} className="text-forest-300 mx-auto mb-4" />
                    <p className="text-forest-600 font-medium">No orders yet</p>
                    <p className="text-forest-400 text-sm mt-1">Start shopping to see your orders here</p>
                    <Link to="/shop" className="btn-gold mt-5 inline-flex">Browse Products</Link>
                  </div>
                )}
              </div>
            )}

            {tab === 'addresses' && (
              <div className="card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-serif text-xl font-bold text-forest-900">Saved Addresses</h2>
                  {!showAddressForm && (
                    <button onClick={openAddAddress} className="flex items-center gap-2 text-forest-800 text-sm border border-forest-600 px-3 py-2 rounded-full hover:bg-forest-50">
                      <Plus size={14} /> Add New
                    </button>
                  )}
                </div>

                {showAddressForm && (
                  <form onSubmit={handleAddressSubmit} className="p-4 border border-forest-100 rounded-xl mb-4 space-y-4">
                    <h3 className="font-semibold text-forest-900 text-sm">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input type="text" placeholder="Full Name *" className="input"
                        value={addressForm.name} onChange={e => setAddressForm(f => ({ ...f, name: e.target.value }))} />
                      <input type="text" placeholder="Phone *" className="input"
                        value={addressForm.phone} onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <input type="text" placeholder="Address Line 1 *" className="input"
                      value={addressForm.line1} onChange={e => setAddressForm(f => ({ ...f, line1: e.target.value }))} />
                    <input type="text" placeholder="Address Line 2 (optional)" className="input"
                      value={addressForm.line2} onChange={e => setAddressForm(f => ({ ...f, line2: e.target.value }))} />
                    <div className="grid sm:grid-cols-3 gap-3">
                      <input type="text" placeholder="City *" className="input"
                        value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} />
                      <input type="text" placeholder="State *" className="input"
                        value={addressForm.state} onChange={e => setAddressForm(f => ({ ...f, state: e.target.value }))} />
                      <input type="text" placeholder="Pincode *" className="input"
                        value={addressForm.pincode} onChange={e => setAddressForm(f => ({ ...f, pincode: e.target.value }))} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-forest-700">
                      <input type="checkbox" checked={addressForm.isDefault}
                        onChange={e => setAddressForm(f => ({ ...f, isDefault: e.target.checked }))} />
                      Set as default address
                    </label>
                    <div className="flex gap-3">
                      <button type="submit" disabled={savingAddress} className="btn-gold text-sm disabled:opacity-50">
                        {savingAddress ? 'Saving...' : 'Save Address'}
                      </button>
                      <button type="button" onClick={closeAddressForm} className="btn-outline-gold text-sm">Cancel</button>
                    </div>
                  </form>
                )}

                {user.addresses?.length > 0 ? user.addresses.map((a) => (
                  <div key={a._id} className="p-4 border border-forest-100 rounded-xl mb-3 flex justify-between gap-3">
                    <div>
                      <p className="font-semibold text-forest-900 text-sm">{a.name} · {a.phone}</p>
                      <p className="text-forest-500 text-sm">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} — {a.pincode}</p>
                      {a.isDefault && <span className="badge-green text-xs mt-1 inline-flex"><CheckCircle size={11} /> Default</span>}
                    </div>
                    <div className="flex items-start gap-3 flex-shrink-0">
                      <button onClick={() => openEditAddress(a)} className="text-forest-800 text-xs hover:underline">Edit</button>
                      <button onClick={() => handleDeleteAddress(a._id)} aria-label="Delete address" className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )) : !showAddressForm && (
                  <div className="text-center py-10">
                    <MapPin size={40} className="text-forest-200 mx-auto mb-3" />
                    <p className="text-forest-500 text-sm">No saved addresses yet</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'wishlist' && (
              <div className="card p-6">
                <h2 className="font-serif text-xl font-bold text-forest-900 mb-6">My Wishlist</h2>
                {wishlistLoading ? (
                  <div className="text-center py-12">
                    <Loader2 size={32} className="text-forest-300 mx-auto animate-spin" />
                  </div>
                ) : wishlist.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {wishlist.map(p => <ProductCard key={p._id} product={p} />)}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Heart size={48} className="text-forest-200 mx-auto mb-4" />
                    <p className="text-forest-500 text-sm">No items in your wishlist</p>
                    <Link to="/shop" className="btn-gold mt-5 inline-flex">Explore Products</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
