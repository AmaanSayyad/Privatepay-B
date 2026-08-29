// api/bitgo-generate-address.js
import BitGo from 'bitgo';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { label } = req.body;
  const accessToken = process.env.VITE_BITGO_ACCESS_TOKEN;
  const walletId = process.env.VITE_BITGO_WALLET_ID;
  const coin = process.env.VITE_BITGO_COIN || 'tbaseeth';
  const env = process.env.VITE_BITGO_ENV || 'test';

  if (!accessToken || !walletId) {
    return res.status(500).json({ error: 'BitGo not configured on server' });
  }

  try {
    const bitgo = new BitGo.BitGo({ env, accessToken });
    const wallet = await bitgo.coin(coin).wallets().get({ id: walletId });
    const address = await wallet.createAddress({ label });

    return res.status(200).json({
      address: address.address,
      label: address.label,
      id: address.id
    });
  } catch (error) {
    console.error('BitGo API Error:', error);
    return res.status(error.status || 500).json({ 
      error: error.message || 'Failed to generate address via server' 
    });
  }
}
