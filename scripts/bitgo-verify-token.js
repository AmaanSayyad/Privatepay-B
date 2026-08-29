import dotenv from 'dotenv';
dotenv.config();

const accessToken = process.env.VITE_BITGO_ACCESS_TOKEN;
const apiBaseUrl = 'https://app.bitgo-test.com/api/v2';

async function testToken() {
  if (!accessToken) {
    console.error('Access token is missing in .env');
    return;
  }

  console.log('Testing access token...');
  try {
    const response = await fetch(`${apiBaseUrl}/user/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (response.ok) {
      console.log('Token is VALID!');
      console.log('User info:', JSON.stringify(data, null, 2));
      
      // Now try to list wallets for tbaseeth
      console.log('\nFetching tbaseeth wallets...');
      const walletsResponse = await fetch(`${apiBaseUrl}/tbaseeth/wallet`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const walletsData = await walletsResponse.json();
      console.log('Wallets Response:', JSON.stringify(walletsData, null, 2));
    } else {
      console.error('Token is INVALID or UNAUTHORIZED');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Request failed:', e.message);
  }
}

testToken();
