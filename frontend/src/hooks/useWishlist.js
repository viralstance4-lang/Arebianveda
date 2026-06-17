import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import useAuthStore from '../store/authStore'

export default function useWishlist() {
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const navigate = useNavigate()

  const isWishlisted = (productId) => !!user?.wishlist?.includes(productId)

  const toggleWishlist = async (productId) => {
    if (!user) {
      toast.error('Please login to use your wishlist')
      navigate('/login')
      return
    }
    try {
      const { data } = await api.post(`/auth/wishlist/${productId}`)
      updateUser({ ...user, wishlist: data.wishlist })
      toast.success(data.wishlist.includes(productId) ? 'Added to wishlist' : 'Removed from wishlist')
    } catch {
      toast.error('Could not update wishlist')
    }
  }

  return { user, isWishlisted, toggleWishlist }
}
