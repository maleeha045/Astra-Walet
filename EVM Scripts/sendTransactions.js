
const { ethers } = require("ethers");
require('dotenv').config();


// --- Configuration ---
const YOUR_RPC_URL = "https://1rpc.io/sepolia";


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
async function createUnsignedTx(SENDER_ADDRESS, RECIPIENT_ADDRESS, AMOUNT_TO_SEND) {
  // Fetch the next transaction count (nonce) for the sender
  const nonce = await provider.getTransactionCount(SENDER_ADDRESS, 'latest');

  // Fetch current gas parameters (using EIP-1559 style for modern networks)
  const gasFeeData = await provider.getFeeData();

  // Convert the human-readable ETH amount to Wei
  const valueWei = ethers.utils.parseEther(AMOUNT_TO_SEND.toString());
  console.log(valueWei);
  // V6: const valueWei = ethers.parseEther(amountInEther.toString());

  // Define the unsigned transaction object
  const unsignedTx = {
    from: SENDER_ADDRESS,
    to: RECIPIENT_ADDRESS,
    value: AMOUNT_TO_SEND,
    nonce: nonce,
    gasLimit: 21000, // Standard gas limit for a simple ETH transfer

    // EIP-1559 gas fields
    maxFeePerGas: gasFeeData.maxFeePerGas,
    maxPriorityFeePerGas: gasFeeData.maxPriorityFeePerGas,
    type: 2 // EIP-1559 transaction type
  };
  console.log(unsignedTx);
  return unsignedTx;
}
async function signTransaction(unsignedTx) {
  // The signer signs the entire transaction object
  const txResponse = await signer.sendTransaction(unsignedTx);


  console.log(`Transaction Hash: ${txResponse.hash}`);
  console.log("Waiting for transaction to be mined...");

  // Wait for the transaction to be mined
  const receipt = await txResponse.wait();

  console.log("Transaction Mined!");
  console.log("Block Number:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());

}


async function sendNativeBalance(sender, recipient, amount) {
  const tx = await createUnsignedTx(sender, recipient, amount);
  await signTransaction(tx);

}

async function sendErc721Token(NFT_ADDRESS, RECIPIENT_ADDRESS, TOKEN_ID) {
  try {


    const signer = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
    const senderAddress = signer.address;
    const nftContract = new ethers.Contract(
      NFT_ADDRESS,
      ERC721_ABI,
      signer
    );

    console.log(`\nSending NFT (ID: ${TOKEN_ID}) to ${RECIPIENT_ADDRESS}...`);

    const tx = await nftContract["safeTransferFrom(address,address,uint256)"](
      senderAddress,
      RECIPIENT_ADDRESS,
      TOKEN_ID
    );

    console.log(`Transaction hash: ${tx.hash}`);

    console.log("✅ ERC-721 NFT Transfer successful!");
    return tx.hash;

  } catch (error) {
    console.error("❌ Error sending ERC-721 token:", error.message);
    return null;
  }
}




async function sendErc20Token(TOKEN_ADDRESS, SENDER_ADDRESS, RECIPIENT_ADDRESS, AMOUNT_TO_SEND) {
  try {

    const signer = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);

    const tokenContract = new ethers.Contract(
      TOKEN_ADDRESS,
      ERC20_ABI,
      signer
    );
    // const TOKEN_DECIMALS = await tokenContract.decimals();
    // const amountInWei = ethers.utils.parseUnits(AMOUNT_TO_SEND, TOKEN_DECIMALS);

    console.log(`Sending ${AMOUNT_TO_SEND} tokens...`);

    const tx = await tokenContract.transfer(
      RECIPIENT_ADDRESS,
      AMOUNT_TO_SEND
    );

    console.log(`Transaction hash: ${tx.hash}`);

    console.log("✅ ERC-20 Token Transfer successful!");

  } catch (error) {
    console.error("❌ Error sending ERC-20 token:", error.message);
  }
}