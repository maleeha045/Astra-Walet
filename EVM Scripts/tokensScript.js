const { ethers } = require("ethers");
require('dotenv').config();


// --- Configuration ---
const YOUR_RPC_URL = "https://1rpc.io/sepolia";
// const YOUR_RPC_URL = "https://eth-mainnet.public.blastapi.io";


const SENDER_PRIVATE_KEY = process.env.SENDER_PRIVATE_KEY;

// Create a Provider
const provider = new ethers.providers.JsonRpcProvider(YOUR_RPC_URL);
const signer = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);

// Contract ABI (using the minimal ABI defined above)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount)"
];
const ERC721_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string memory)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
];

async function importErc20Token(TOKEN_ADDRESS, USER_ADDRESS) {
  try {
    // 1. Create a Contract instance
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);

    // 2. Fetch Token Details
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();

    // 3. Fetch User Balance
    const balanceRaw = await tokenContract.balanceOf(USER_ADDRESS);

    // 4. Format Balance for Display (dividing by the token's decimals)
    const balanceFormatted = ethers.utils.formatUnits(balanceRaw, decimals);

    // 5. Log the results (This is what your wallet UI would display)
    console.log(`✅ ERC-20 Token Imported:`);
    console.log(`  Name: ${name}`);
    console.log(`  Symbol: ${symbol}`);
    console.log(`  Contract Address: ${TOKEN_ADDRESS}`);
    console.log(`  User Balance: ${balanceFormatted} ${symbol}`);

    return { name, symbol, TOKEN_ADDRESS, balance: balanceFormatted };

  } catch (error) {
    console.error(`❌ Error importing ERC-20 token ${TOKEN_ADDRESS}:`, error.message);
    return null;
  }
}





async function importErc721Tokens(NFT_ADDRESS, USER_ADDRESS, TOKEN_ID) {
  try {

    const nftContract = new ethers.Contract(NFT_ADDRESS, ERC721_ABI, provider);

    const name = await nftContract.name();
    const symbol = await nftContract.symbol();

    const balance = Number(await nftContract.balanceOf(USER_ADDRESS));

    console.log(`\n--- Importing ERC-721 Collection ---`);
    console.log(`Collection: ${name} (${symbol})`);
    console.log(`Contract Address: ${NFT_ADDRESS}`);

    console.log(`-----------------------------------`);

    const ownedTokens = [];

    // Get the URL for the NFT's metadata (image, attributes, etc.)
    const tokenURI = await nftContract.tokenURI(TOKEN_ID);
    console.log(tokenURI);

    ownedTokens.push({
      TOKEN_ID,
      tokenURI
    });
    console.log(`[#Token ID: ${TOKEN_ID}\n   URI: ${tokenURI}`);

    return { name, symbol, NFT_ADDRESS, ownedTokens };

  } catch (error) {
    console.error(`\n❌ Error importing ERC-721 token ${NFT_ADDRESS}:`, error.message);
    return null;
  }
}


// Balances

async function getERC20Balance(TOKEN_ADDRESS, USER_ADDRESS) {



  const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);

  try {

    const balanceWei = Number(await tokenContract.balanceOf(USER_ADDRESS));

    console.log(`Balance (in smallest unit - Wei-like): ${balanceWei.toString()}`);
    return balanceWei;

  } catch (error) {
    console.error("Error fetching ERC-20 balance:", error);
    return null;
  }
}
async function getERC721Balance(NFT_ADDRESS, USER_ADDRESS) {


  const nftContract = new ethers.Contract(NFT_ADDRESS, ERC721_ABI, provider);

  try {


    const balanceWei = Number(await nftContract.balanceOf(USER_ADDRESS));
    return balanceWei;
  } catch (error) {
    console.error("Error fetching ERC-20 balance:", error);
    return null;
  }
}

async function getNativeBalance(USER_ADDRESS) {
  try {
    const balance = Number(await provider.getBalance(USER_ADDRESS));
    console.log(balance);
    return balance;
  }
  catch (error) {
    console.error("Error fetching native balance:", error);
    return null;
  }
}
async function getFeeData() {
  try {
    const feeData = await provider.getFeeData();
    console.log(Number(feeData.lastBaseFeePerGas));
    console.log(Number(feeData.maxFeePerGas));
    console.log(Number(feeData.maxPriorityFeePerGas));
    console.log(Number(feeData.gasPrice));
  }
  catch (error) {
    console.log(error)
  }
}
getNativeBalance("0xd47e4431443b9FC2A2F4C77f315547A5a605bcCa");