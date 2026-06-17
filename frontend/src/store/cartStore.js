import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(persist(
  (set, get) => ({
    items: [],
    coupon: null,

    addItem: (product, qty = 1, variant = null, pkg = null) => {
      const { items } = get()
      const key = [product._id, variant?.label, pkg?.label].filter(Boolean).join('-')
      const existing = items.find(i => i.key === key)
      if (existing) {
        set({ items: items.map(i => i.key === key ? { ...i, qty: i.qty + qty } : i) })
      } else {
        const price = pkg ? pkg.price : (variant ? variant.price : product.price)
        const comparePrice = pkg ? pkg.comparePrice : (variant ? variant.comparePrice : product.comparePrice)
        set({ items: [...items, { key, product, variant, pkg, qty, price, comparePrice }] })
      }
    },

    removeItem: (key) => set({ items: get().items.filter(i => i.key !== key) }),

    updateQty: (key, qty) => {
      if (qty < 1) return get().removeItem(key)
      set({ items: get().items.map(i => i.key === key ? { ...i, qty } : i) })
    },

    changePackage: (key, newPkg) => {
      const { items } = get()
      set({ items: items.map(i => i.key === key
        ? { ...i, key: [i.product._id, i.variant?.label, newPkg.label].filter(Boolean).join('-'),
            pkg: newPkg, price: newPkg.price, comparePrice: newPkg.comparePrice }
        : i) })
    },

    clearCart: () => set({ items: [], coupon: null }),

    setCoupon: (coupon) => set({ coupon }),
  }),
  { name: 'av-cart' }
))

export default useCartStore
