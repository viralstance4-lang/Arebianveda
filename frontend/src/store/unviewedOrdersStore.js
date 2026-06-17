import { create } from 'zustand'

const useUnviewedOrdersStore = create((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
}))

export default useUnviewedOrdersStore
