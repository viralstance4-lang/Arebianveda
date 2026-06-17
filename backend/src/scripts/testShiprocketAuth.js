/**
 * Standalone Shiprocket authentication test — `npm run shiprocket:test`.
 *
 * Checks SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD are loaded, attempts a login,
 * and (on success) prints the account's pickup-location/company info.
 * Never prints the password.
 */
require('dotenv').config();
const shiprocketService = require('../services/shiprocketService');

// Delay process.exit slightly so undici's keep-alive sockets settle first —
// an immediate process.exit() while a fetch socket is open crashes with a
// libuv assertion on Windows.
function exit(code) {
  process.exitCode = code;
  setTimeout(() => process.exit(code), 50);
}

(async () => {
  console.log('── Shiprocket Authentication Test ──\n');

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email) console.log('Missing SHIPROCKET_EMAIL');
  else console.log(`SHIPROCKET_EMAIL: ${email}`);

  if (!password) console.log('Missing SHIPROCKET_PASSWORD');
  else console.log(`SHIPROCKET_PASSWORD: set (${password.length} chars)`);

  if (!email || !password) {
    console.log('\nAborting — set the missing variable(s) in backend/.env');
    return exit(1);
  }

  console.log('\nAuthenticating...');
  const result = await shiprocketService.healthCheck();

  if (!result.success) {
    console.log('\nAuthentication FAILED');
    console.log(`  code:  ${result.code}`);
    console.log(`  error: ${result.error}`);
    return exit(1);
  }

  console.log('\nAuthentication SUCCESS');
  console.log(`  tokenReceived: ${result.tokenReceived}`);

  try {
    const account = await shiprocketService.getAccountDetails();
    const addresses = account?.data?.shipping_address || [];
    console.log(`\nPickup locations (${addresses.length}):`);
    for (const addr of addresses) {
      console.log(`  - ${addr.pickup_location} — ${addr.company_name || ''} (${addr.city}, ${addr.state})`);
    }
  } catch (err) {
    console.log(`\nCould not fetch account details: ${err.message}`);
  }

  exit(0);
})();
