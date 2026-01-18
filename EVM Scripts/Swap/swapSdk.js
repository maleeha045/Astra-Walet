import dotenv from "dotenv";
import axios from 'axios';
import { createPublicClient, createWalletClient, http } from "viem";
import { base, mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ethers } from 'ethers';

// Load environment variables from .env file
dotenv.config();

const requiredEnvVars = ["MAKER_ADDRESS", "SENDER_PRIVATE_KEY", "ONEINCH_API_KEY", "RPC_URL"];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
const CHAIN_ID = 1;
const AGGREGATION_ROUTER_V6 = "0x111111125421ca6dc452d289314280a0f8842a65";
const ERC20_ABI = [
  "function approve(address,uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address from, address to) view returns(uint256)",
];
// Configuration object (type assertions removed)
const config = {
  walletAddress: process.env.MAKER_ADDRESS,
  privateKey: process.env.SENDER_PRIVATE_KEY, // Note: Viem will handle this as Hex internally
  apiKey: process.env.ONEINCH_API_KEY,
  rpcUrl: process.env.RPC_URL,
  tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDC on Base
  amountToSwap: 1000000, // 0.1 USDC (as smallest unit, e.g., wei or smallest decimal unit)
  dstToken: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", // WETH on Base
  slippage: 1,
};

// --- Viem Clients Setup ---

const baseUrl = `https://api.1inch.com/swap/v6.1/${CHAIN_ID}`;

// Public client for reading blockchain data (fetching nonce, checking balance)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(config.rpcUrl),
});

const provider = new ethers.JsonRpcProvider(config.rpcUrl);

const signer = new ethers.Wallet(config.privateKey, provider);

// --- Utility Functions ---

/**
 * Builds the complete URL for a 1inch API endpoint.
 * @param {string} path - The API endpoint path (e.g., "/swap").
 * @param {Object.<string, string>} params - Query parameters.
 * @returns {string} The full query URL.
 */
function buildQueryURL(path, params) {
  const url = new URL(baseUrl + path);
  url.search = new URLSearchParams(params).toString();
  return url.toString();
}

/**
 * Calls the 1inch API and handles error checking.
 * @param {string} endpointPath - The endpoint (e.g., "/swap").
 * @param {Object.<string, string>} queryParams - The parameters.
 * @returns {Promise<Object>} The API response object.
 */
async function call1inchAPI(endpointPath, queryParams) {
  const url = buildQueryURL(endpointPath, queryParams);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`1inch API returned status ${response.status}: ${body}`);
  }

  // Type cast removed; Viem will handle types when using the result.
  return await response.json();
}

/**
 * Signs and sends a Viem transaction payload.
 * @param {Object} tx - Transaction payload from 1inch API.
 * @returns {Promise<string>} The transaction hash.
 */
async function signAndSendTransaction(tx) {
  const nonce = await publicClient.getTransactionCount({
    address: signer.address,
    blockTag: "pending",
  });

  console.log("Nonce:", nonce.toString());

  try {
    return await signer.sendTransaction({
      signer,
      to: tx.to,
      data: tx.data,
      // Ensure 'value' is a BigInt, as 1inch returns it as 'bigint' or string
      value: BigInt(tx.value),
      chain: mainnet,
      nonce,
      kzg: undefined, // Removed kzg check for simplicity, should be safe
    });
  } catch (err) {
    console.error("Transaction signing or broadcasting failed");
    console.error("Transaction data:", tx);
    console.error("Nonce:", nonce.toString());
    throw err;
  }
}

// --- Core Logic Functions ---

async function checkAllowance() {
  const url = "https://api.1inch.com/swap/v6.1/1/approve/allowance";

  const config = {
    headers: {
      Authorization: "Bearer VT6sGJqzXpBDj29UViojGGMMfH6LQ7LX",
    },
    params: {
      tokenAddress: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
      walletAddress: "0x9F05c95a514F37e8EF2A6863C6FBD2fB8a7700d4",
    },
    paramsSerializer: {
      indexes: null,
    },
  };

  try {
    const response = await axios.get(url, config);
    console.log("allowance is : ", response.data.allowance);
    return response.data.allowance;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Approves the required amount of tokens if the current allowance is insufficient.
 * @param {bigint} requiredAmount - The amount that needs to be approved.
 * @returns {Promise<void>}
 */
async function approveIfNeeded(tokenAddress,amount) {
   try {
     // const res = await getOneInchProtocolAddress(1);
     // console.log(res.address);
     const res = "0x111111125421cA6dc452d289314280a0f8842A65";
     const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
     console.log(Number(await tokenContract.balanceOf(signer.address)));
  const currentAllowance = Number(await tokenContract.allowance(signer.address, res));
  console.log("currentAllowance is:", currentAllowance);
 
 if (currentAllowance>0 && currentAllowance< amount) {
   console.log("Allowance is non-zero, setting to zero first...");
   
   // 1. Approve 0
   const txZero = await tokenContract.connect(signer).approve(res, 0);
   await txZero.wait(); // Wait for the zero approval to be mined
   console.log("Successfully set allowance to zero");
 }
 
 // 2. Approve the desired amount
 const tx = await tokenContract.connect(signer).approve(res, amount);
 console.log("successfully approved");
 console.log(tx);
   }
   catch (error) {
     console.log(error);
   }
 
 
}

/**
 * Performs the token swap.
 * @returns {Promise<void>}
 */
async function performSwap() {
  const swapParams = {
    src: config.tokenAddress,
    dst: config.dstToken,
    amount: config.amountToSwap.toString(),
    from: config.walletAddress,
    slippage: config.slippage.toString(),
    disableEstimate: "false",
    allowPartialFill: "false",
  };

  console.log("Fetching swap transaction...");

  // Type assertion removed; extract the 'tx' field
  const swapResponse = await call1inchAPI("/swap", swapParams);
  const swapTx = swapResponse.tx;

  console.log("Swap transaction:", swapTx);

  const txHash = await signAndSendTransaction(swapTx);
  console.log("Swap transaction sent. Hash:", txHash);
  return txHash;
}

// --- Main Execution ---

async function main() {
  try {
    // BigInt(config.amountToSwap) is used because Viem requires BigInt for value
    await approveIfNeeded(config.tokenAddress,config.amountToSwap);
    await performSwap();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Execute main function and handle any unhandled errors
main().catch((err) => {
  console.error("Unhandled error in main:", err);
  process.exit(1);
});