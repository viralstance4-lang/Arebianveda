import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

export default function MultiSelect({ label, options, selected = [], onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggle = (value) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  const remove = (value) => onChange(selected.filter(v => v !== value))

  const selectedOptions = options.filter(o => selected.includes(o.value))

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-xs text-forest-500 mb-1.5">{label}</label>}
      <button type="button" onClick={() => setOpen(o => !o)} className="input flex items-center justify-between gap-2 text-left">
        <span className="flex flex-wrap gap-1 flex-1 min-h-[1.25rem]">
          {selectedOptions.length ? selectedOptions.map(o => (
            <span key={o.value} className="badge-green">
              {o.label}
              <X size={12} className="cursor-pointer hover:text-green-900" onClick={e => { e.stopPropagation(); remove(o.value) }} />
            </span>
          )) : <span className="text-forest-300">{placeholder}</span>}
        </span>
        <ChevronDown size={16} className={`text-forest-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto bg-white border border-forest-200 rounded-xl shadow-lg p-1">
          {options.length === 0 && <p className="text-xs text-forest-400 px-3 py-2">No options available</p>}
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-forest-50 cursor-pointer text-sm text-forest-700 capitalize">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} className="accent-forest-800 w-4 h-4" />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
