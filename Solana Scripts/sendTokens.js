import web3 from "@solana/web3.js";
import {
    getOrCreateAssociatedTokenAccount,
    createTransferCheckedInstruction,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";

// ---------------------

// Connect to cluster
const connection = new web3.Connection(
    "https://restless-yolo-butterfly.solana-devnet.quiknode.pro/7504a532dc6331113d5bcdc04bb75a9fa67cb075/",
    'confirmed',
);

async function transferSPLToken(senderKeypair, recipientAddress, tokenAddress, tokenDecimals, amountToSend) {
    try{

    const senderWalletPublicKey = senderKeypair.publicKey;


    const recipientWalletPublicKey = new web3.PublicKey(recipientAddress);
    const mintPublicKey = new web3.PublicKey(tokenAddress);

    // --- 2. Get Associated Token Accounts (ATAs) ---
    /* SPL Tokens are NOT held directly in the wallet address. 
      They are held in a special ATA derived from the wallet address and the token's Mint Address.
    */

    // Get the sender's ATA for this specific token
    console.log("yes");
    const senderATA = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair, // Fee payer and signer
        mintPublicKey,
        senderWalletPublicKey,
        true // allow owner off curve (needed for nested PDAs/programs, good practice)
    );

    // Get the recipient's ATA for this specific token.
    // This function will automatically create the ATA if it does not exist.
    const recipientATA = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair, // Fee payer and signer (must pay the rent if created)
        mintPublicKey,
        recipientWalletPublicKey
    );

    console.log("Sender ATA:", senderATA.address.toBase58());
    console.log("Recipient ATA:", recipientATA.address.toBase58());

    // --- 3. Build the Transaction Instruction (The Key Change) ---

    const transferInstruction = createTransferCheckedInstruction(
        senderATA.address,       // 1. Source ATA (where tokens are coming from)
        mintPublicKey,           // 2. Token Mint Address (to ensure the correct token is sent)
        recipientATA.address,    // 3. Destination ATA (where tokens are going)
        senderWalletPublicKey,   // 4. Owner/Authority of the source ATA (the sender's wallet)
        amountToSend,          // 5. Amount to transfer (as an integer, respecting decimals)
        tokenDecimals,          // 6. Number of decimals
        [],                      // Signers (only needed for multi-sig)
        TOKEN_PROGRAM_ID         // 7. The SPL Token Program
    );

    // --- 4. Finalize and Send Transaction ---
    const transaction = new web3.Transaction().add(transferInstruction);

    const signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair], // The transaction must be signed by the sender's wallet Keypair
    );

    console.log('Transaction Hash: ', signature);
    return signature;
}
catch(error){
    console.log(error);
    return null;
}
}


// 1. **The Token You Want to Send**
const tokenAddress = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"; // <-- REPLACE THIS! (e.g., USDC's mint)
const tokenDecimals = 6; // <-- REPLACE THIS! (e.g., 6 for USDC)
const amountToSend = 1000000

// 2. The Recipient (Wallet/Owner Public Key)
const recipientAddress = "FaSGyVhjjGNTb85UpaHkhqv2LfqKPeT1msXb5F15Cwtd";
const SENDER_SECRET_KEY = "414xymewKFRxjZRVnNjaAojcWJk6nEzFT2F6aeCooMt17sXeokBTCJxYDSeG9ACUwCQNFrAubKDqrckwTwNAMMpS";

const privateKeyUint8Array = bs58.decode(SENDER_SECRET_KEY);
const senderKeypair = web3.Keypair.fromSecretKey(privateKeyUint8Array);

transferSPLToken(senderKeypair, recipientAddress, tokenAddress, tokenDecimals, amountToSend);