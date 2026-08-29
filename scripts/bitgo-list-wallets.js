import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.VITE_BITGO_ACCESS_TOKEN;
const apiBaseUrl = 'https://app.bitgo-test.com/api/v2';

async function listWallets() {
  if (!accessToken) return;
  
  try {
    const coins = ['teth', 'tbaseeth'];
    for (const coin of coins) {
      console.log(`\nChecking wallets for ${coin}...`);
      const response = await fetch(`${apiBaseUrl}/${coin}/wallet`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      if (data.wallets && data.wallets.length > 0) {
        data.wallets.forEach(w => {
          console.log(`- Label: ${w.label}, ID: ${w.id}, Coin: ${w.coin}`);
        });
      } else {
        console.log(`No ${coin} wallets found.`);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

listWallets();
