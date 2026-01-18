import { randomBytes } from "node:crypto";
import { setTimeout } from "timers/promises";

import { add0x } from "@1inch/byte-utils";
import dotenv from "dotenv";
import { parseUnits } from "viem";
import { Keypair, Transaction } from "@solana/web3.js";
import { utils, web3 } from "@coral-xyz/anchor";
import {
  NetworkEnum,
  SDK,
  SolanaAddress,
  HashLock,
  EvmAddress,
  SvmSrcEscrowFactory,
  Quote,
  OrderStatus,
} from "@1inch/cross-chain-sdk";

dotenv.config();

const requiredEnvVars = [
  "SENDER_PRIVATE_KEY",
  "MAKER_ADDRESS",
  "RECEIVER_ADDRESS",
  "ONEINCH_API_KEY",
];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const config = {
  signerPrivateKey: process.env.SENDER_PRIVATE_KEY!,
  maker: "4Z9PjrxmPz3mn9vhQTk8KHAf6fcgECgyAoyXV1gtqnKB",
  receiver: "0xff7e90f5c1a3fc4fb5dd7298811f02eda899ca40",
  devPortalApiKey: process.env.ONEINCH_API_KEY!,
  srcChainId: NetworkEnum.SOLANA,
  dstChainId: NetworkEnum.ETHEREUM,
  solanaRpc: "https://api.mainnet-beta.solana.com",
  sdkUrl: "https://api.1inch.com/fusion-plus",
  usdtEvm: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  usdtSolana: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  amount: parseUnits("1", 6),
  pollInterval: 5000,
};

const sdk = new SDK({
  url: config.sdkUrl,
  authKey: config.devPortalApiKey,
});

function getSecret(): string {
  return add0x(randomBytes(32).toString("hex"));
}

function generateSecrets(count: number): string[] {
  return Array.from({ length: count }).map(getSecret);
}

function createHashLock(secrets: string[]): HashLock {
  const leaves = HashLock.getMerkleLeaves(secrets);

  return secrets.length > 1
    ? HashLock.forMultipleFills(leaves)
    : HashLock.forSingleFill(secrets[0]);
}

async function getQuote(): Promise<Quote> {
  console.log("Fetching quote...");

  const srcToken = SolanaAddress.fromString(config.usdtSolana);
  const dstToken = EvmAddress.fromString(config.usdtEvm);

  const quote = await sdk.getQuote({
    amount: config.amount.toString(),
    srcChainId: config.srcChainId.valueOf(),
    dstChainId: config.dstChainId.valueOf(),
    srcTokenAddress: srcToken.toString(),
    dstTokenAddress: dstToken.toString(),
    enableEstimate: true,
    walletAddress: config.maker,
  });

  console.log("Quote received successfully");
  return quote;
}

async function createAndSubmitOrder(
  quote: Quote,
): Promise<{ orderHash: string; secrets: string[] }> {
  console.log("Creating order...");

  const preset = quote.getPreset(quote.recommendedPreset);

  const secrets = generateSecrets(preset.secretsCount);
  const secretHashes = secrets.map(HashLock.hashSecret);
  const hashLock = createHashLock(secrets);

  const order = quote.createSolanaOrder({
    hashLock,
    receiver: EvmAddress.fromString(config.receiver),
    preset: quote.recommendedPreset,
  });

  console.log("Announcing order to relayer...");
  const orderHash = await sdk.announceOrder(
    order,
    quote.quoteId!,
    secretHashes,
  );
  console.log("Order announced with hash:", orderHash);

  // Create and submit the Solana transaction
  const ix = SvmSrcEscrowFactory.DEFAULT.createOrder(order, {
    srcTokenProgramId: SolanaAddress.TOKEN_PROGRAM_ID,
  });

  const makerSigner = Keypair.fromSecretKey(
    utils.bytes.bs58.decode(config.signerPrivateKey),
  );

  const tx = new Transaction().add({
    data: ix.data,
    programId: new web3.PublicKey(ix.programId.toBuffer()),
    keys: ix.accounts.map((a) => ({
      isSigner: a.isSigner,
      isWritable: a.isWritable,
      pubkey: new web3.PublicKey(a.pubkey.toBuffer()),
    })),
  });

  const connection = new web3.Connection(config.solanaRpc);

  const result = await connection.sendTransaction(tx, [makerSigner]);
  console.log("Transaction submitted with signature:", result);

  return { orderHash, secrets };
}

async function monitorAndSubmitSecrets(
  orderHash: string,
  secrets: string[],
): Promise<void> {
  console.log("Starting to monitor for fills...");

  // Wait one poll interval for backend to catch up
  await setTimeout(config.pollInterval);

  const alreadyShared = new Set<number>();

   while (true) {
     try {
       const order = await sdk.getOrderStatus(orderHash);
       if (order.status === "executed") {
         console.log("Order is complete.");
         return;
       }
     } catch (err) {
       console.error(
         `Error while getting order status: ${JSON.stringify(err, null, 2)}`,
       );
     }
 
     try {
       const readyToAcceptSecrets =
         await sdk.getReadyToAcceptSecretFills(orderHash);
       if (readyToAcceptSecrets.fills.length) {
                 for (const { idx } of readyToAcceptSecrets.fills) {
     
                     // it is responsibility of the client to check whether is safe to share secret (check escrow addresses and so on)
                     await sdk.submitSecret(orderHash, secrets[idx])
     
                     console.log({ idx }, 'shared secret')
                 }
             }
     
             // check if order finished
             const { status } = await sdk.getOrderStatus(orderHash)
     
             if (
                 status === OrderStatus.Executed ||
                 status === OrderStatus.Expired ||
                 status === OrderStatus.Refunded
             ) {
                 break
             }

      await setTimeout(config.pollInterval);
      console.log("polling for fills...");
    } catch (err) {
      console.error("Error while monitoring fills:", err);
      await setTimeout(config.pollInterval);
      console.log("retrying after error...");
    }
  }
}

async function performCrossChainSwap(): Promise<void> {
  console.log("Starting cross-chain swap from Solana to EVM...");

  const quote = await getQuote();
  const { orderHash, secrets } = await createAndSubmitOrder(quote);
  await monitorAndSubmitSecrets(orderHash, secrets);
}

async function main(): Promise<void> {
  try {
    await performCrossChainSwap();
  } catch (err) {
    console.error("Error:", err as Error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error in main:", err);
  process.exit(1);
});