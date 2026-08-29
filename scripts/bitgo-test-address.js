import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.VITE_BITGO_ACCESS_TOKEN;
const walletId = process.env.VITE_BITGO_WALLET_ID;
const coin = 'tbaseeth';
const apiBaseUrl = 'https://app.bitgo-test.com/api/v2';

async function testAddressGen() {
  if (!accessToken || !walletId) return;
  
  console.log(`Trying to generate address for wallet ${walletId}...`);
  try {
    const response = await fetch(`${apiBaseUrl}/${coin}/wallet/${walletId}/address`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ label: 'Test Address' })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('SUCCESS! Address generated:', data.address);
    } else {
      console.error('FAILED to generate address');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testAddressGen();
