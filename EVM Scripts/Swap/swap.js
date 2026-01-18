import axios from "axios";
import { ethers } from "ethers";
import dotenv from 'dotenv';
dotenv.config();

// const YOUR_RPC_URL = "https://1rpc.io/sepolia"; 
// const YOUR_RPC_URL = "https://eth-mainnet.public.blastapi.io";
const YOUR_RPC_URL = "https://ethereum-json-rpc.stakely.io";
// const YOUR_RPC_URL = "https://eth-mainnet.nodereal.io/v1/1659dfb40aa24bbb8153a677b98064d7"

const ONEINCH_BASE = "https://api.1inch.dev/swap/v5.2";
const CHAIN_ID = 1;
const ONE_INCH_BASE_URL = `https://api.1inch.dev/swap/v6.0/${CHAIN_ID}`;


const SENDERPRIVATEKEY = "175c13bdf31da6736efc4c1f6c1833f224916bef7109aab3904a3c152fb4f315";
const provider = new ethers.JsonRpcProvider(YOUR_RPC_URL);

const signer = new ethers.Wallet(SENDERPRIVATEKEY, provider);

const ERC20_ABI = [
  "function approve(address,uint256)",
  "function balanceOf(address owner) view returns (uint256)",
];

//same address across different blockchains
async function getSpenderAddress() {
  const url = "https://api.1inch.com/swap/v6.1/1/approve/spender";

  const config = {
    headers: {
      Authorization: `Bearer VT6sGJqzXpBDj29UViojGGMMfH6LQ7LX`,
    },
    params: {},
    paramsSerializer: {
      indexes: null,
    },
  };

  try {
    const response = await axios.get(url, config);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function approve(tokenAddress, amount) {
  try {
    const res = await getSpenderAddress();
    console.log(res.address);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    console.log(Number(await tokenContract.balanceOf(signer.address)));

    const tx = await tokenContract.connect(signer).approve(res.address, amount.toString());
    console.log("successfully approved");
    console.log(tx);
    return tx;
  }
  catch (error) {
    console.log(error);
    return null;
  }

}
async function checkAllowance(tokenAddress, walletAddress, chainId) {
  try {
    const url = `https://api.1inch.com/swap/v6.1/${chainId}/approve/allowance`;

    const config = {
      headers: {
        Authorization: "Bearer VT6sGJqzXpBDj29UViojGGMMfH6LQ7LX",
      },
      params: {
        tokenAddress: tokenAddress,
        walletAddress: walletAddress
      },
      paramsSerializer: {
        indexes: null,
      },
    };

    try {
      const response = await axios.get(url, config);
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }
  catch (error) {
    console.log(error);
    return null;
  }
}
//build Transaction

// async function buildSwap( srcTokenAddress, dstTokenAddress, Amount, walletAddress, slippage) {
//     const swapEndpoint = `${ONE_INCH_BASE_URL}/swap`;

//     const response = await axios.get(swapEndpoint, {
//         params: {
//             src: srcTokenAddress,
//             dst: dstTokenAddress,
//             amount: Amount,
//             from: walletAddress,
//             slippage: slippage
//         },
//         headers: {
//             'Authorization': `Bearer VT6sGJqzXpBDj29UViojGGMMfH6LQ7LX`
//         }
//     });

//     if (!response.data || !response.data.tx) {
//         throw new Error('Failed to get swap transaction data from 1inch API.');
//     }

//     console.log(response.data.tx);

// }

async function buildSwap(srcTokenAddress, dstTokenAddress, amount, walletAddress, chainId) {
  const url = `https://api.1inch.com/swap/v6.1/${chainId}/swap`;


  const config = {
    headers: {
      Authorization: "Bearer VT6sGJqzXpBDj29UViojGGMMfH6LQ7LX",
    },
    params: {
      src: `${srcTokenAddress}`,
      dst: `${dstTokenAddress}`,
      amount: `${amount}`,
      from: `${walletAddress}`,
      origin: `${walletAddress}`,
      slippage: 1,
    },
    paramsSerializer: {
      indexes: null,
    },
  };

  try {
    const response = await axios.get(url, config);
    console.log(response).data;
    console.log("swap built");
    return response.data.tx;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function broadcastTransaction(transactionData) {
  // transactionData should look like { to: '...', data: '...', value: '...', gas: '...' }

  // In a browser environment with a wallet (like MetaMask)
  // the providerOrSigner should be a Web3Provider and a Signer.
  // const signer = providerOrSigner.getSigner ? providerOrSigner.getSigner() : providerOrSigner;

  // 1inch often provides gas limit, which is good to include,
  // but sometimes gas price/maxFeePerGas/maxPriorityFeePerGas might be missing, 
  // and the signer will typically estimate these.

  const tx = {
    from: transactionData.from,
    to: transactionData.to,
    data: transactionData.data,
    value: transactionData.value, // value is 0 for token swaps, but included for completeness
    gasLimit: transactionData.gas,
    gasPrice: transactionData.gasPrice,// Renamed to gasLimit for ethers compatibility
    // The Signer/Provider will handle nonce, gasPrice/fee estimation, and chainId
  };

  try {
    console.log("Broadcasting transaction...");
    // Send the transaction (this prompts the user to sign in a wallet environment)
    const txResponse = await signer.sendTransaction(tx);

    console.log("Transaction sent. Hash:", txResponse.hash);

    // Wait for the transaction to be mined (optional but recommended for confirmation)
    const receipt = await txResponse.wait();

    console.log("Transaction confirmed in block:", receipt.blockNumber);
    return receipt;
  } catch (error) {
    console.error("Error broadcasting transaction:", error);
    throw new Error("Failed to broadcast or confirm transaction.");
    return null;
  }
}
async function performSWap() {
  try {
    const response = buildSwap("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 100000000000000, "0x9F05c95a514F37e8EF2A6863C6FBD2fB8a7700d4", 1);
    await broadcastTransaction(response);
  }
  catch (error) {
    console.log(error);
  }
}
await performSWap();



// getSpenderAddress()
//  approve("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",100000000000000);
// checkAllowance("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE","0x9F05c95a514F37e8EF2A6863C6FBD2fB8a7700d4",1);
// buildSwap("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE","0xdAC17F958D2ee523a2206206994597C13D831ec7",100000000000000,"0x9F05c95a514F37e8EF2A6863C6FBD2fB8a7700d4",1);