import { useEffect, useState } from 'react'
import { CreditCard, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api'
import { fmtINR } from '../../utils/format'

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wider flex items-center gap-2">
        {Icon && <Icon size={15} />} {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-forest-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function PartialCodPreview({ advancePercentage, codPercentage }) {
  const total = 1000
  const advance = Math.round(total * advancePercentage / 100)
  const cod = total - advance

  return (
    <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 space-y-2">
      <p className="text-xs font-semibold text-forest-600 uppercase tracking-wider mb-1">Example — Order Total {fmtINR(total)}</p>
      <div className="flex justify-between text-sm">
        <span className="text-forest-600">Advance Payment ({advancePercentage}%)</span>
        <span className="font-semibold text-forest-900">{fmtINR(advance)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-forest-600">Pay on Delivery ({codPercentage}%)</span>
        <span className="font-semibold text-forest-900">{fmtINR(cod)}</span>
      </div>
    </div>
  )
}

export default function AdminPaymentSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState({
    codEnabled: true,
    onlineEnabled: true,
    partialCodEnabled: false,
    advancePercentage: 20,
    codPercentage: 80,
  })

  useEffect(() => {
    api.get('/payment-settings')
      .then(({ data }) => {
        const s = data.settings
        setSettings({
          codEnabled: s.codEnabled,
          onlineEnabled: s.onlineEnabled,
          partialCodEnabled: s.partialCodEnabled,
          advancePercentage: s.advancePercentage,
          codPercentage: s.codPercentage,
        })
      })
      .catch(() => toast.error('Failed to load payment settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdvanceChange = (value) => {
    const adv = Math.max(1, Math.min(99, Number(value) || 0))
    setSettings(s => ({ ...s, advancePercentage: adv, codPercentage: 100 - adv }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.put('/payment-settings', {
        codEnabled: settings.codEnabled,
        onlineEnabled: settings.onlineEnabled,
        partialCodEnabled: settings.partialCodEnabled,
        advancePercentage: settings.advancePercentage,
      })
      const s = data.settings
      setSettings({
        codEnabled: s.codEnabled,
        onlineEnabled: s.onlineEnabled,
        partialCodEnabled: s.partialCodEnabled,
        advancePercentage: s.advancePercentage,
        codPercentage: s.codPercentage,
      })
      toast.success('Payment settings updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-forest-600 text-sm">Loading settings…</div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-forest-900 font-serif">Payment Settings</h1>
        <p className="text-sm text-forest-500 mt-0.5">Choose which payment methods customers can use at checkout</p>
      </div>

      <form onSubmit={handleSave}>
        <Section icon={CreditCard} title="Payment Methods">
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-2 cursor-pointer border border-forest-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-forest-800">Cash on Delivery (COD)</p>
                <p className="text-xs text-forest-500">Customer pays the full amount in cash on delivery</p>
              </div>
              <input
                type="checkbox"
                checked={settings.codEnabled}
                onChange={e => setSettings(s => ({ ...s, codEnabled: e.target.checked }))}
                className="accent-forest-800 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between gap-2 cursor-pointer border border-forest-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-forest-800">Online Payment</p>
                <p className="text-xs text-forest-500">Customer pays the full amount online via Razorpay</p>
              </div>
              <input
                type="checkbox"
                checked={settings.onlineEnabled}
                onChange={e => setSettings(s => ({ ...s, onlineEnabled: e.target.checked }))}
                className="accent-forest-800 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between gap-2 cursor-pointer border border-forest-100 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-forest-800">Partial COD (Advance + COD)</p>
                <p className="text-xs text-forest-500">Customer pays a percentage online now, the rest on delivery</p>
              </div>
              <input
                type="checkbox"
                checked={settings.partialCodEnabled}
                onChange={e => setSettings(s => ({ ...s, partialCodEnabled: e.target.checked }))}
                className="accent-forest-800 w-4 h-4"
              />
            </label>
          </div>

          {settings.partialCodEnabled && (
            <div className="border-t border-forest-100 pt-4 space-y-4">
              <h3 className="text-xs font-semibold text-forest-400 uppercase tracking-wider">Partial COD Split</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Advance Payment (%)">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={settings.advancePercentage}
                    onChange={e => handleAdvanceChange(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="COD Payment (%)">
                  <input type="number" value={settings.codPercentage} disabled className="input bg-forest-50 text-forest-500" />
                </Field>
              </div>
              <PartialCodPreview advancePercentage={settings.advancePercentage} codPercentage={settings.codPercentage} />
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-gold text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Payment Settings
          </button>
        </Section>
      </form>
    </div>
  )
}
