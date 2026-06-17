const mongoose = require('mongoose');
const dns = require('dns');

// Node.js v17+ on Windows may use an IPv6 link-local DNS server that fails
// SRV record lookups required by mongodb+srv:// URIs. Force IPv4 DNS servers.
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Cache connection across serverless invocations (Vercel cold-start fix)
let cached = global._mongoConn;
if (!cached) cached = global._mongoConn = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }).then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }

  return cached.conn;
};

module.exports = connectDB;
