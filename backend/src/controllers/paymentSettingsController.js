const PaymentSettings = require('../models/PaymentSettings');

// Defaults used when no settings doc exists yet (fresh install)
const DEFAULTS = {
  codEnabled: true,
  onlineEnabled: true,
  partialCodEnabled: false,
  advancePercentage: 20,
  codPercentage: 80,
};

// ─── GET /api/payment-settings — public (checkout reads this) ────────────────
exports.getPaymentSettings = async (req, res) => {
  let settings = await PaymentSettings.findOne().lean();
  if (!settings) settings = DEFAULTS;
  res.json({ success: true, settings });
};

// ─── PUT /api/payment-settings — admin only ───────────────────────────────────
exports.updatePaymentSettings = async (req, res) => {
  const { codEnabled, onlineEnabled, partialCodEnabled, advancePercentage } = req.body;

  const fields = {};
  if (codEnabled !== undefined)        fields.codEnabled = Boolean(codEnabled);
  if (onlineEnabled !== undefined)     fields.onlineEnabled = Boolean(onlineEnabled);
  if (partialCodEnabled !== undefined) fields.partialCodEnabled = Boolean(partialCodEnabled);

  if (advancePercentage !== undefined) {
    const adv = Number(advancePercentage);
    if (isNaN(adv) || adv < 1 || adv > 99) {
      return res.status(400).json({ success: false, message: 'Advance Payment % must be between 1 and 99' });
    }
    fields.advancePercentage = adv;
    fields.codPercentage = 100 - adv; // always derived so the two halves total 100
  }

  // Guard: don't let the admin disable every payment method at once —
  // checkout would have nothing to offer.
  const current = (await PaymentSettings.findOne().lean()) || DEFAULTS;
  const merged = { ...current, ...fields };
  if (!merged.codEnabled && !merged.onlineEnabled && !merged.partialCodEnabled) {
    return res.status(400).json({ success: false, message: 'At least one payment method must remain enabled' });
  }

  const settings = await PaymentSettings.findOneAndUpdate(
    {},
    { $set: fields },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, settings });
};
