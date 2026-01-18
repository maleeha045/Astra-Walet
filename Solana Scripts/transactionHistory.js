import web3 from "@solana/web3.js";

// Connect to cluster
const connection = new web3.Connection(
  "https://restless-yolo-butterfly.solana-devnet.quiknode.pro/7504a532dc6331113d5bcdc04bb75a9fa67cb075/",
  'confirmed',
);
/**
 * Fetches and displays the last 10 transaction signatures for a given Solana address.
 * * @param {string} address The Solana public key string.
 */
async function fetchTransactionHistory(address) {
    console.log(`--- Fetching history for: ${address} ---`);
    
    try {
            const walletPublicKey = new web3.PublicKey(address);

        // --- Step 1: Get the list of transaction signatures ---
        // getConfirmedSignaturesForAddress2 is preferred as it's more robust.
        // limit: defines how many signatures to fetch (max 1000).
        const signatures = await connection.getSignaturesForAddress(
            walletPublicKey,
            { limit: 10 } 
        );

        if (signatures.length === 0) {
            console.log("No recent transaction signatures found.");
            return;
        }

        console.log(`Found ${signatures.length} recent transaction signatures.`);
        
        // --- Step 2: Display the Signatures ---
        signatures.forEach((sig, index) => {
            console.log(`\nTransaction #${index + 1}:`);
            console.log(`  Signature: ${sig.signature}`);
            console.log(`  Block Time: ${new Date(sig.blockTime * 1000).toLocaleString()}`);
            console.log(`  Error: ${sig.err ? 'Yes' : 'No'}`);
        });

        // --- Step 3 (Optional but Recommended): Fetching Details ---
        // To get details (who sent what to whom), you need to fetch the transaction objects.
        const firstSignature = signatures[0].signature;
        console.log(`\n--- Fetching details for the latest transaction (${firstSignature.substring(0, 10)}...) ---`);

        const transactionDetails = await connection.getParsedTransaction(
            firstSignature,
            { maxSupportedTransactionVersion: 0 }
        );

        if (transactionDetails) {
            console.log(`Fee: ${transactionDetails.meta.fee} Lamports`);
            
            // This loop iterates through the transaction instructions (like transfers, token swaps, etc.)
            console.log("Instructions (Parsed):");
            transactionDetails.transaction.message.instructions.forEach((instruction, i) => {
                if (instruction.parsed) {
                    console.log(`    ${i + 1}. Type: ${instruction.parsed.type}`);
                    if (instruction.parsed.info && instruction.parsed.info.lamports) {
                        console.log(`Amount: ${instruction.parsed.info.lamports / 10**9} SOL`);
                    }
                } else {
                    console.log(`    ${i + 1}. Type: Custom or Program Instruction`);
                }
            });
        }

    } catch (error) {
        console.error("An error occurred during transaction history fetch:", error);
    }
}

// --- Example Usage ---
// Use a well-known Solana address with activity for testing.
const testWallet = "b9VxwWT6T8xE3N3WYRtBvEhG5C49mqBqEnWhuvQZX5p"; 
fetchTransactionHistory(testWallet);