

import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import web3 from "@solana/web3.js";

// Connect to cluster
const connection = new web3.Connection(
  "https://restless-yolo-butterfly.solana-devnet.quiknode.pro/7504a532dc6331113d5bcdc04bb75a9fa67cb075/",
  'confirmed',
);
//   const ownerPublicKey = "b9VxwWT6T8xE3N3WYRtBvEhG5C49mqBqEnWhuvQZX5p"


async function fetchTokensAndAmount(ownerPublicAddress) {
  const ownerWalletPublicKey = new web3.PublicKey(ownerPublicAddress);
  try {

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      ownerWalletPublicKey,
      {
        programId: TOKEN_PROGRAM_ID, // This is the crucial filter to get ALL SPL tokens
      },
      'confirmed'
    );

    const tokens = tokenAccounts.value
      // Filter for only accounts that have a non-zero balance
      .filter(account => {
        const { info } = account.account.data.parsed;
        // The uiAmount is a floating point number representation
        return info && info.tokenAmount && info.tokenAmount.uiAmount > 0;
      })
      // Map to a cleaner object structure
      .map(account => {
        const { info } = account.account.data.parsed;
        return {
          pubkey: account.pubkey.toBase58(),
          mint: info.mint,
          balance: info.tokenAmount.amount, // Balance in the smallest unit (lamports/wei equivalent)
          uiAmount: info.tokenAmount.uiAmount, // Human-readable balance
          decimals: info.tokenAmount.decimals,
        };
      });
    console.log(tokens);
  }
  catch (error) {
    console.log(error);
  }
}

async function fetchNativBalance(ownerPublicAddress) {
  const ownerWalletPublicKey = new web3.PublicKey(ownerPublicAddress);
  try {
    const balance = await connection.getBalance(ownerWalletPublicKey);
    console.log(balance);
    return balance;
  }
  catch (error) {
    console.log(error);
  }
}
fetchNativBalance("b9VxwWT6T8xE3N3WYRtBvEhG5C49mqBqEnWhuvQZX5p")
// fetchTokens("b9VxwWT6T8xE3N3WYRtBvEhG5C49mqBqEnWhuvQZX5p");

// 3855681440 9 decimals