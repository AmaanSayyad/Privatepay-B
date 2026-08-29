import BitGo from 'bitgo';
import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.VITE_BITGO_ACCESS_TOKEN;

async function run() {
  if (!accessToken) {
    console.error('Access token is missing in .env');
    return;
  }

  const bitgo = new BitGo.BitGo({ env: 'test', accessToken });

  try {
    console.log('Fetching wallets...');
    const wallets = await bitgo.coin('teth').wallets().list();
    if (wallets.wallets.length === 0) {
      console.log('No teth wallets found. You need to create one.');
    } else {
      console.log('Found wallets:');
      wallets.wallets.forEach(w => {
        console.log(`- Label: ${w.label()}, ID: ${w.id()}, Address: ${w.receiveAddress()}`);
      });
    }
  } catch (e) {
    console.error('BitGo Error:', e.message);
  }
}

run();
