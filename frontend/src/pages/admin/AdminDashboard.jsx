import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IndianRupee, ShoppingBag, Users, Activity, Star, RefreshCw, Package, Send, Truck, CheckCircle, XCircle } from 'lucide-react'
import api from '../../api'
import { fmtINR, fmtDate, ORDER_STATUS_COLORS } from '../../utils/format'

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold text-forest-900">{value}</p>
      <p className="text-sm text-forest-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-forest-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/orders/admin/stats')
      setData(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading || !data) {
    return <div className="text-forest-600 text-sm">Loading dashboard…</div>
  }

  const { stats, recentOrders, monthlyRevenue, topProducts, categorySales, shippingStats } = data
  const maxMonthly = Math.max(1, ...monthlyRevenue.map(m => m.revenue))
  const maxSold = Math.max(1, ...topProducts.map(p => p.sold))
  const totalCategorySold = categorySales.reduce((a, c) => a + c.sold, 0) || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-forest-900 font-serif">Dashboard</h1>
        <button onClick={load} className="btn-outline-gold text-sm py-2 px-4">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={IndianRupee} label="Total Revenue" value={fmtINR(stats.totalRevenue)}
          sub={`${fmtINR(stats.todayRevenue)} today`} accent="bg-green-100 text-green-700" />
        <StatCard icon={ShoppingBag} label="Total Orders" value={stats.totalOrders}
          sub={`${stats.todayOrders} today`} accent="bg-blue-100 text-blue-700" />
        <StatCard icon={Users} label="Customers" value={stats.totalUsers}
          accent="bg-purple-100 text-purple-700" />
        <StatCard icon={Activity} label="Active Orders" value={stats.pendingOrders}
          accent="bg-forest-100 text-forest-900" />
        <StatCard icon={Star} label="Pending Reviews" value={stats.pendingReviews}
          accent="bg-red-100 text-red-700" />
      </div>

      {/* Shipping overview */}
      <div>
        <h2 className="font-semibold text-forest-900 mb-3">Shipping Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Package} label="Pending Shipment" value={shippingStats.pendingShipment}
            accent="bg-gray-100 text-gray-700" />
          <StatCard icon={Send} label="Ready To Ship" value={shippingStats.readyToShip}
            accent="bg-cyan-100 text-cyan-700" />
          <StatCard icon={Truck} label="In Transit" value={shippingStats.inTransit}
            accent="bg-indigo-100 text-indigo-700" />
          <StatCard icon={CheckCircle} label="Delivered" value={shippingStats.delivered}
            accent="bg-green-100 text-green-700" />
          <StatCard icon={XCircle} label="Cancelled" value={shippingStats.cancelled}
            accent="bg-red-100 text-red-700" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly revenue */}
        <div className="card p-5">
          <h2 className="font-semibold text-forest-900 mb-4">Revenue — Last 6 Months</h2>
          {monthlyRevenue.length === 0 ? (
            <p className="text-sm text-forest-400">No revenue data yet.</p>
          ) : (
            <div className="space-y-3">
              {monthlyRevenue.map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-forest-600 mb-1">
                    <span>{m._id.month}/{m._id.year}</span>
                    <span>{fmtINR(m.revenue)} · {m.orders} orders</span>
                  </div>
                  <div className="h-2 bg-forest-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(m.revenue / maxMonthly) * 100}%`, background: 'linear-gradient(135deg,#1C5C37,#0A2D19)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales by category */}
        <div className="card p-5">
          <h2 className="font-semibold text-forest-900 mb-4">Sales by Category</h2>
          {categorySales.length === 0 ? (
            <p className="text-sm text-forest-400">No sales data yet.</p>
          ) : (
            <div className="space-y-3">
              {categorySales.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-forest-600 mb-1">
                    <span>{c._id || 'Uncategorized'}</span>
                    <span>{c.sold} units · {fmtINR(c.revenue)}</span>
                  </div>
                  <div className="h-2 bg-forest-100 rounded-full overflow-hidden">
                    <div className="h-full bg-forest-800 rounded-full" style={{ width: `${(c.sold / totalCategorySold) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-forest-900 mb-4">Top Selling Products</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-forest-400">No sales yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p._id} className="flex items-center gap-3">
                  <span className="text-forest-300 font-bold w-5 text-center">{i + 1}</span>
                  <img src={p.images?.[0]?.url} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-forest-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-forest-900 truncate">{p.name}</p>
                    <div className="h-1.5 bg-forest-100 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-forest-800 rounded-full" style={{ width: `${(p.sold / maxSold) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-forest-900">{fmtINR(p.price * p.sold)}</p>
                    <p className="text-xs text-forest-400">{p.sold} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-forest-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-forest-800 hover:underline">View all</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-forest-400">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(o => (
                <div key={o._id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-forest-900">{o.orderId}</p>
                    <p className="text-xs text-forest-500 truncate">{o.user?.name || o.guestInfo?.name || 'Guest'} · {fmtDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-semibold text-forest-900">{fmtINR(o.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[o.orderStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {o.orderStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
