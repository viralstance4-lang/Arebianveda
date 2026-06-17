// Shared "Shop by Health Concern" card color themes — used by AdminConcerns.jsx
// (theme picker) and HomePage.jsx (rendering). Stored as a `colorTheme` key on
// each Concern document so cards keep a consistent look without free-form CSS.
export const CONCERN_THEMES = [
  { key: 'green',   label: 'Green',        gradient: 'from-forest-100 to-forest-50', border: 'border-forest-300' },
  { key: 'red',     label: 'Red / Orange', gradient: 'from-red-50 to-orange-50',     border: 'border-red-200' },
  { key: 'emerald', label: 'Emerald',      gradient: 'from-green-100 to-emerald-50', border: 'border-green-300' },
  { key: 'blue',    label: 'Blue',         gradient: 'from-blue-50 to-indigo-50',    border: 'border-blue-200' },
  { key: 'pink',    label: 'Pink',         gradient: 'from-pink-50 to-rose-50',      border: 'border-pink-200' },
  { key: 'purple',  label: 'Purple',       gradient: 'from-purple-50 to-pink-50',    border: 'border-purple-200' },
  { key: 'gold',    label: 'Gold',         gradient: 'from-amber-50 to-yellow-50',   border: 'border-amber-200' },
  { key: 'gray',    label: 'Gray',         gradient: 'from-gray-100 to-gray-50',     border: 'border-gray-300' },
]

export const getConcernTheme = (key) => CONCERN_THEMES.find(t => t.key === key) || CONCERN_THEMES[0]
