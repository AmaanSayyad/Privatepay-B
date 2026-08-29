/**
 * BitGo Client-Side Bridge
 * All requests proxy through /api/bitgo-* (or VITE_BACKEND_URL + /api/...) to bypass CORS and hide tokens.
 * With "npm run dev", /api routes are not available — use "vercel dev" or set VITE_BACKEND_URL to an API server.
 */

const API_BASE = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL
  ? import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')
  : '';

async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  const text = await response.text();
  throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)} (Status: ${response.status})`);
}

/**
 * Generate a fresh address (Shielded Address)
 */
export async function generateFreshAddress(label = 'Shielded Payment') {
  try {
    const response = await fetch(`${API_BASE}/api/bitgo-generate-address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('BitGo API not found. Run "vercel dev" (see README for Root Directory fix) or set VITE_BACKEND_URL to your API server.');
        }
        const data = await handleResponse(response);
        throw new Error(data.error || 'Failed to generate address');
    }
    
    return await response.json();
  } catch (error) {
    console.error('BitGo Proxy Error:', error);
    throw error;
  }
}

/**
 * Get wallet balance
 */
export async function getBitGoWalletBalance() {
  try {
    const response = await fetch(`${API_BASE}/api/bitgo-balance`);
    if (!response.ok) return { balance: 0, confirmedBalance: 0, spendableBalance: 0 };
    
    const data = await response.json();
    return {
      balance: data.balance ?? 0,
      confirmedBalance: data.confirmedBalance ?? 0,
      spendableBalance: data.spendableBalance ?? 0,
    };
  } catch (error) {
    console.error('BitGo Proxy Error:', error);
    return { balance: 0, confirmedBalance: 0, spendableBalance: 0 };
  }
}

/**
 * Send funds from BitGo Wallet
 */
export async function sendBitGoFunds(address, amount, walletPassphrase) {
  try {
    const response = await fetch(`${API_BASE}/api/bitgo-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, amount, walletPassphrase }),
    });

    if (!response.ok) {
        const data = await handleResponse(response);
        throw new Error(data.error || 'Withdrawal failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('BitGo Proxy Error:', error);
    throw error;
  }
}
