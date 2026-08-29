/**
 * Vercel Serverless Function: POST /api/withdraw
 * Withdraw from treasury to user's wallet. Relayer logic (treasury key, EVM transfer)
 * must be implemented and TREASURY_PRIVATE_KEY set in Vercel env for production.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, amount, destinationAddress } = req.body || {};

  if (!username || amount == null || !destinationAddress) {
    return res.status(400).json({
      error: 'missing_params',
      message: 'Requires username, amount, and destinationAddress',
    });
  }

  // Relayer not configured: implement treasury transfer here and set TREASURY_PRIVATE_KEY in Vercel env
  const treasuryKey = process.env.TREASURY_PRIVATE_KEY;
  if (!treasuryKey) {
    return res.status(501).json({
      error: 'not_configured',
      message:
        'Withdrawal relayer is not configured. Set TREASURY_PRIVATE_KEY in Vercel env and implement the transfer in api/withdraw.js (see docs/TREASURY_RELAYER.md).',
    });
  }

  // TODO: 1) Verify user balance in Supabase for username >= amount
  // TODO: 2) Build and broadcast transfer_public from treasury to destinationAddress for amount
  // TODO: 3) Return { txHash } on success
  return res.status(501).json({
    error: 'not_implemented',
    message: 'Relayer key is set but transfer logic is not implemented. Implement in api/withdraw.js.',
  });
}
