const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');

// POST /api/newsletter/subscribe
router.post('/subscribe', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  // Upsert: if already subscribed just re-activate
  const subscriber = await Subscriber.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { name: name || '', status: 'active' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, message: 'Successfully subscribed!', subscriber });
});

module.exports = router;
