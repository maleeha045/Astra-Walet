import axios from "axios";

// Replace with your Etherscan API Key
const ETHERSCAN_API_KEY = "BDK8FAWMWS9AKS3JFHU1HKNHYM66SEI5FC";

// The wallet address you want to check
const WALLET_ADDRESS = "0xd47e4431443b9FC2A2F4C77f315547A5a605bcCa";

// Etherscan API parameters
const MODULE = "account";
const ACTION = "txlist";
const PAGE = 1; // Start from the first page
const OFFSET = 5; // Limit the results to 5
const SORT = "desc"; // 'desc' gets the newest transactions first

// Etherscan base URL for Mainnet
const API_URL = "https://api-sepolia.etherscan.io/api";

function getFunctionName(tx, queryAddress) {
  const inputData = tx.input;
  const toAddress = tx.to;
  const value = BigInt(tx.value);

  // Case 1: Contract Deployment
  if (!toAddress) {
    return "Contract Deployment";
  }

  // 2. Simple ETH Transfer (When inputData is '0x' and value is > 0)
  if (inputData === "0x" && value > 0n) {
    const isOutbound = tx.from.toLowerCase() === queryAddress.toLowerCase();

    // Use the check to distinguish Sent vs. Received
    return isOutbound ? "Sent ETH" : "Received ETH";
  }

  // Case 3: Contract Interaction
  if (inputData.length > 2) {
    // The first 10 characters (0x + 8 hex digits) are the Function Selector.
    const functionSelector = inputData.substring(0, 10);

    switch (functionSelector) {
      case "0xa9059cbb":
        return "transfer(address,uint256) (ERC-20)"; // Common 'transfer'
      case "0x40c10f19":
        return "safeTransferFrom(address,address,uint256) (ERC-721)";
      case "0x42842e0e":
        return "safeMint(...) (Example Method ID)";
      case "0xd0e30db0":
        return "executeTransaction (Gnosis Safe)";
      default:
        return `Contract Call - Method ID: ${functionSelector}`;
    }
  }

  return "Unknown Contract Interaction";
}

async function getLatestTransactions(address, limit) {
  try {
    const response = await axios.get(API_URL, {
      params: {
        module: MODULE,
        action: ACTION,
        address: address,
        page: PAGE,
        offset: limit,
        sort: SORT,
        apikey: ETHERSCAN_API_KEY,
      },
    });

    if (response.data.status === "1") {
      const transactions = response.data.result;
      console.log(`✅ Latest ${limit} Transactions for ${address}:`);

      // Display key information for each transaction
      transactions.forEach((tx, index) => {
        const isOutbound = tx.from.toLowerCase() === address.toLowerCase();
        const direction = isOutbound ? "OUT" : "IN";
        const valueInEth = tx.value / 1e18; // Convert Wei to Ether
        const functionName = getFunctionName(tx, address);

        console.log(`
--- Transaction ${index + 1} (${direction}) ---
Hash: ${tx.hash}
Block: ${tx.blockNumber}
From: ${tx.from}
To: ${tx.to}
Value: ${valueInEth} ETH
Function: ${functionName}
Time: ${new Date(parseInt(tx.timeStamp) * 1000).toLocaleString()}
                `);
      });

      return transactions;
    } else {
      console.error("❌ Etherscan API Error:", response.data.message);
      return [];
    }
  } catch (error) {
    console.error(
      "An error occurred while fetching transactions:",
      error.message
    );
    return [];
  }
}

// Run the function
getLatestTransactions(WALLET_ADDRESS, OFFSET);