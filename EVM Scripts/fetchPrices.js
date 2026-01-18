import axios from 'axios';
import { ethers } from "ethers";

// --- CONFIGURATION ---
// IMPORTANT: Replace 'YOUR_API_KEY' with your actual CoinMarketCap API key.
const API_KEY = '18eda615-5005-446b-8f56-20a9c3ef4837';

// The endpoint for getting the latest market quotes
const URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
// const YOUR_RPC_URL = "https://1rpc.io/sepolia"; 
const YOUR_RPC_URL = "https://eth-mainnet.public.blastapi.io";

const provider = new ethers.JsonRpcProvider(YOUR_RPC_URL);


// Headers for the API request, including your API Key
const headers = {
  'Accepts': 'application/json',
  'X-CMC_PRO_API_KEY': API_KEY,
};

// --- API CALL FUNCTION ---
async function fetchTokenPriceInUSDBySymbol(tokenSymbol) {
  console.log("--- Fetching Latest Crypto Prices ---");
  // Parameters for the API request
  const params = {
    'symbol': `${tokenSymbol}`, // Comma-separated list of symbols
    'convert': 'USD'     // The currency to convert the price to
  };


  try {
    const response = await axios.get(URL, { headers, params });
    const data = response.data;

    // Check API status
    if (data.status.error_code === 0) {
      console.log(`Status: ${data.status.error_message}`);
      console.log("-".repeat(35));

      // Process and display the data for each coin
      for (const symbol in data.data) {
        const coinData = data.data[symbol];
        const quote = coinData.quote.USD;

        // Use a utility function for dollar formatting
        const formatDollar = (value) => `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        console.log(`Coin: ${coinData.name} (${symbol})`);
        console.log(`  Price (USD): ${formatDollar(quote.price)}`);
        console.log(`  Market Cap:  ${formatDollar(quote.market_cap)}`);
        console.log(`  24h Volume:  ${formatDollar(quote.volume_24h)}`);
        console.log("-".repeat(35));
        return {
          'price': formatDollar(quote.price),
          'marketCap': formatDollar(quote.market_cap),
          'volume': formatDollar(quote.volume_24h)

        }
      }
    } else {
      console.error(`API Error: ${data.status.error_message} (Code: ${data.status.error_code})`);
      return null;
    }

  } catch (error) {
    // Handle network or request-specific errors
    console.error(`An error occurred during the API request: ${error.message}`);
    if (error.response) {
      console.error(`Response Data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function fetchTokenPriceInUSDById(tokenId) {
  console.log("--- Fetching Latest Crypto Prices ---");
  // Parameters for the API request
  const params = {
    'id': `${tokenId}`, // Comma-separated list of symbols
    'convert': 'USD'     // The currency to convert the price to
  };


  try {
    const response = await axios.get(URL, { headers, params });
    const data = response.data;

    // Check API status
    if (data.status.error_code === 0) {
      console.log(`Status: ${data.status.error_message}`);
      console.log("-".repeat(35));

      // Process and display the data for each coin
      for (const symbol in data.data) {
        const coinData = data.data[symbol];
        const quote = coinData.quote.USD;

        // Use a utility function for dollar formatting
        const formatDollar = (value) => `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        console.log(`Coin: ${coinData.name} (${symbol})`);
        console.log(`  Price (USD): ${formatDollar(quote.price)}`);
        console.log(`  Market Cap:  ${formatDollar(quote.market_cap)}`);
        console.log(`  24h Volume:  ${formatDollar(quote.volume_24h)}`);
        console.log("-".repeat(35));

        return {

          'price': formatDollar(quote.price),
          'marketCap': formatDollar(quote.market_cap),
          'volume': formatDollar(quote.volume_24h)

        }
      }
    } else {
      console.error(`API Error: ${data.status.error_message} (Code: ${data.status.error_code})`);
      return null;
    }

  } catch (error) {
    // Handle network or request-specific errors
    console.error(`An error occurred during the API request: ${error.message}`);
    if (error.response) {
      console.error(`Response Data: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function convertEthToUsd(amountEth) {

  const URL = 'https://pro-api.coinmarketcap.com/v1/tools/price-conversion';

  // Set up the request parameters for the conversion endpoint
  const params = {
    'amount': amountEth,
    'symbol': 'ETH',
    'convert': 'USD'
  };

  try {
    console.log(`\nAttempting to convert ${amountEth} ETH...`);

    const response = await axios.get(URL, { headers, params });
    const data = response.data;

    // 1. Check for API-level errors
    if (data.status.error_code !== 0) {
      console.error(`API Error: ${data.status.error_message}`);
      return null;
    }

    // 2. Extract the converted price
    const convertedPriceUsd = data.data.quote.USD.price;
    console.log(convertedPriceUsd);

    return convertedPriceUsd;

  } catch (error) {
    // Handle network or request configuration errors
    console.error(`Network or Request Error: ${error.message}`);
    if (error.response) {
      console.error(`Response details: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}
// convertEthToUsd("0.5");
async function convertUserBalanceInUSD(USER_ADDRESS) {
  try {
    const balance = Number(await provider.getBalance(USER_ADDRESS));
    const balanceinEth = balance / 1000000000000000000;
    convertEthToUsd(balanceinEth.toString());

  }
  catch (error) {
    console.log(error);
    return null;
  }
}
//  convertUserBalanceInUSD("0xd47e4431443b9FC2A2F4C77f315547A5a605bcCa");

fetchTokenPriceInUSDById(5426)
fetchTokenPriceInUSDBySymbol('SOL');