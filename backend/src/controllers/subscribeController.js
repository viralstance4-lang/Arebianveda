const Subscriber = require('../models/Subscriber');

const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if email is valid (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Check if already subscribed
    const existingSubscriber = await Subscriber.findOne({ email: email.toLowerCase().trim() });
    if (existingSubscriber) {
      return res.status(400).json({ success: false, message: 'Already subscribed' });
    }

    // Create new subscriber
    const subscriber = new Subscriber({
      email: email.toLowerCase().trim(),
      status: 'active'
    });

    await subscriber.save();

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscribe error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Already subscribed' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { subscribe };