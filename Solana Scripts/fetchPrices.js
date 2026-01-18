import axios from 'axios';
import { ethers } from "ethers";
import web3 from "@solana/web3.js";

// Connect to cluster
const connection = new web3.Connection(
  "https://restless-yolo-butterfly.solana-devnet.quiknode.pro/7504a532dc6331113d5bcdc04bb75a9fa67cb075/",
  'confirmed',
);
// --- CONFIGURATION ---
// IMPORTANT: Replace 'YOUR_API_KEY' with your actual CoinMarketCap API key.
const API_KEY = '18eda615-5005-446b-8f56-20a9c3ef4837';

// The endpoint for getting the latest market quotes
const URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';




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
          'volume': formatDollar(quote.volume_24h),


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

async function convertSolToUsd(amountSol) {

  const URL = 'https://pro-api.coinmarketcap.com/v1/tools/price-conversion';

  // Set up the request parameters for the conversion endpoint
  const params = {
    'amount': amountSol,
    'symbol': 'SOL',
    'convert': 'USD'
  };

  try {
    console.log(`\nAttempting to convert ${amountSol} SOL...`);

    const response = await axios.get(URL, { headers, params });
    const data = response.data;

    // 1. Check for API-level errors
    if (data.status.error_code !== 0) {
      console.error(`API Error: ${data.status.error_message}`);
      return null;
    }

    // 2. Extract the converted price
    const convertedPriceUsd = data.data.quote.USD.price;

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
  const ownerWalletPublicKey = new web3.PublicKey(USER_ADDRESS);
  try {
    const balance = await connection.getBalance(ownerWalletPublicKey);
    console.log(balance);
    const usdBalance = await convertSolToUsd(balance /1000000000 );
    console.log(usdBalance);
    return usdBalance;
  }
  catch (error) {
    console.log(error);
  }
}


//  fetchTokenPriceInUSDById(5426)
//  fetchTokenPriceInUSDBySymbol('SOL');
//  convertSolToUsd(1);
convertUserBalanceInUSD("b9VxwWT6T8xE3N3WYRtBvEhG5C49mqBqEnWhuvQZX5p");