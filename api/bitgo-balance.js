// api/bitgo-balance.js
import BitGo from 'bitgo';

export default async function handler(req, res) {
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

    // Try to get balances, if IMS error occurs, return 0 instead of crashing
    let balances = { balance: 0, confirmedBalance: 0, spendableBalance: 0 };
    try {
        balances = {
            balance: wallet.balance(),
            confirmedBalance: wallet.confirmedBalance(),
            spendableBalance: wallet.spendableBalance()
        };
    } catch (balanceError) {
        console.warn('BitGo IMS Balance Warning:', balanceError.message);
        // Fallback to 0 if BitGo IMS is having issues
    }

    return res.status(200).json(balances);
  } catch (error) {
    console.error('BitGo API General Error:', error);
    return res.status(error.status || 500).json({ 
      error: error.message || 'Failed to connect to BitGo' 
    });
  }
}
