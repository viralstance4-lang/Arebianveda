import { Navigate, Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function AdminRoute({ children }) {
  const user = useAuthStore(s => s.user)

  if (!user) return <Navigate to="/login" replace />

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg,#FFFDF5,#D2EADD)' }}>
        <div className="card p-10 text-center max-w-md">
          <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-forest-900 mb-2">403 — Access Denied</h1>
          <p className="text-forest-600 text-sm mb-6">You don't have permission to access the admin panel.</p>
          <Link to="/" className="btn-gold">Back to Home</Link>
        </div>
      </div>
    )
  }

  return children
}
