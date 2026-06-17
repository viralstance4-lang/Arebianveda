import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import api from '../api'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { setAuth }             = useAuthStore()
  const navigate                = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setAuth(data.user, data.token)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ background: 'linear-gradient(135deg,#FFFDF5,#D2EADD)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            <img src="/logo.png" alt="Arebianveda" className="h-20 w-20 object-contain mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-forest-900" style={{ fontFamily: "'Playfair Display',serif" }}>Welcome Back</h1>
          <p className="text-forest-500 text-sm mt-1">Sign in to your Arebianveda account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-forest-800 font-medium text-sm mb-2">Email Address</label>
              <input type="email" required placeholder="you@example.com"
                className="input" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-forest-800 font-medium text-sm mb-2">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required placeholder="Your password"
                  className="input pr-12" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-3.5 text-forest-400 hover:text-forest-600">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-forest-800 hover:underline">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full justify-center py-4 text-base">
              {loading ? 'Signing in...' : <><LogIn size={18} /> Sign In</>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-forest-600 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-forest-800 font-semibold hover:underline">Create one</Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-forest-100 text-center">
            <p className="text-xs text-forest-400 mb-3">Or continue as</p>
            <Link to="/checkout" className="text-forest-800 text-sm font-medium hover:underline">
              Guest Checkout →
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-forest-400 mt-6">
          By signing in you agree to our{' '}
          <Link to="/terms" className="underline">Terms</Link> and{' '}
          <Link to="/privacy-policy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
