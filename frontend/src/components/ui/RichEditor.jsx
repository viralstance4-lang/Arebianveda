import { Bold, Italic, Underline, List, ListOrdered, Link } from 'lucide-react'

export default function RichEditor({ value, onChange, minHeight = 260 }) {
  const exec = (cmd, val = null) => document.execCommand(cmd, false, val)

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) exec('createLink', url)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 p-2 bg-forest-50 border border-forest-200 rounded-t-xl">
        {[
          { cmd: 'bold',      label: <Bold size={14} /> },
          { cmd: 'italic',    label: <Italic size={14} /> },
          { cmd: 'underline', label: <Underline size={14} /> },
        ].map(({ cmd, label }) => (
          <button key={cmd} type="button"
            onMouseDown={e => { e.preventDefault(); exec(cmd) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-forest-600 hover:bg-forest-100 hover:text-forest-900 transition-colors">
            {label}
          </button>
        ))}
        <div className="w-px h-6 bg-forest-200 mx-1 self-center" />
        {[
          { cmd: 'insertUnorderedList', label: <List size={14} /> },
          { cmd: 'insertOrderedList',   label: <ListOrdered size={14} /> },
        ].map(({ cmd, label }) => (
          <button key={cmd} type="button"
            onMouseDown={e => { e.preventDefault(); exec(cmd) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-forest-600 hover:bg-forest-100 hover:text-forest-900 transition-colors">
            {label}
          </button>
        ))}
        <div className="w-px h-6 bg-forest-200 mx-1 self-center" />
        {['h2', 'h3', 'p'].map(tag => (
          <button key={tag} type="button"
            onMouseDown={e => { e.preventDefault(); exec('formatBlock', tag) }}
            className="px-2.5 h-8 rounded-lg text-xs font-semibold uppercase text-forest-600 hover:bg-forest-100 hover:text-forest-900 transition-colors">
            {tag}
          </button>
        ))}
        <div className="w-px h-6 bg-forest-200 mx-1 self-center" />
        <button type="button"
          onMouseDown={e => { e.preventDefault(); insertLink() }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-forest-600 hover:bg-forest-100 hover:text-forest-900 transition-colors">
          <Link size={14} />
        </button>
      </div>
      <div
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={e => onChange(e.currentTarget.innerHTML)}
        style={{ minHeight }}
        className="min-h-[var(--rte-h)] p-4 bg-white border border-forest-200 border-t-0 rounded-b-xl outline-none focus:ring-2 focus:ring-forest-800 cursor-text prose prose-sm max-w-none"
      />
    </div>
  )
}
