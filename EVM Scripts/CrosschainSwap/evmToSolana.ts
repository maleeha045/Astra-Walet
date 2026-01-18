import { randomBytes } from "node:crypto";
import { setTimeout } from "timers/promises";
import Web3 from 'web3'
import { add0x } from "@1inch/byte-utils";
import dotenv from "dotenv";
import {  JsonRpcProvider,Contract,FetchRequest,Wallet } from "ethers";
import { parseUnits } from "viem";
import {
  Quote,
  OrderStatus,
  NetworkEnum,
  SDK,
  SolanaAddress,
  HashLock,
  EvmAddress,
  PrivateKeyProviderConnector,
} from "@1inch/cross-chain-sdk";

interface TransactionConfig {
  data?: string;
  to?: string;
}
export interface Web3Like {
  eth: {
    call(transactionConfig: TransactionConfig): Promise<string>;
  };
  extend(extension: unknown): any;
}

dotenv.config();
const placeholder = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

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
const AGGREGATION_ROUTER_V6 = "0x111111125421ca6dc452d289314280a0f8842a65";

const config = {
   aggregationRouter: AGGREGATION_ROUTER_V6,
  signerPrivateKey: process.env.SENDER_PRIVATE_KEY!,
  maker: process.env.MAKER_ADDRESS!,
  receiver: process.env.RECEIVER_ADDRESS!,
  apiKey: process.env.ONEINCH_API_KEY!,
  srcChainId: NetworkEnum.ETHEREUM,
  dstChainId: NetworkEnum.SOLANA,
  nodeUrl: `https://api.1inch.com/web3/${NetworkEnum.ETHEREUM}`,
  sdkUrl: "https://api.1inch.com/fusion-plus",
  srcTokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  usdtSolana: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  amount: parseUnits("5", 6),
  pollInterval: 5000,
    rpcUrl: process.env.RPC_URL!,
};
const provider = new JsonRpcProvider(config.rpcUrl);
const wallet = new Wallet(config.signerPrivateKey, provider);

const ethersProviderConnector: Web3Like = {
  eth: {
    call(transactionConfig): Promise<string> {
      return provider.call(transactionConfig);
    },
  },
  extend(): void {},
};

const blockchainProvider = new PrivateKeyProviderConnector(
  config.signerPrivateKey,
  ethersProviderConnector,
);

const sdk = new SDK({
  url: "https://api.1inch.dev/fusion-plus",
  authKey: config.apiKey,
  blockchainProvider,
});
const erc20ABI = [
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

async function checkAllowance(
  tokenAddress: string,
  spenderAddress: string,
): Promise<bigint> {
  console.log("Checking token allowance...");

  const tokenContract = new Contract(tokenAddress, erc20ABI, provider);
  const allowance = await tokenContract.allowance(
    wallet.address,
    spenderAddress,
  );

  console.log("Allowance:", allowance.toString());

  return allowance;
}


async function approveIfNeeded(
  tokenAddress: string,
  spenderAddress: string,
  requiredAmount: bigint,
): Promise<void> {
  const allowance = await checkAllowance(tokenAddress, spenderAddress);

  if (allowance >= requiredAmount) {
    console.log("Allowance is sufficient for the swap.");
    return;
  }

  console.log("Insufficient allowance. Approving exact amount needed...");

  const tokenContract = new Contract(tokenAddress, erc20ABI, wallet);

  const tx = await tokenContract.approve(spenderAddress, requiredAmount);

  console.log("Approval transaction sent. Hash:", tx.hash);
  console.log("Waiting for confirmation...");

  await tx.wait();

  console.log("Approval confirmed!");
}



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

  const srcToken = EvmAddress.fromString(config.srcTokenAddress);
  const dstToken = SolanaAddress.fromString(config.usdtSolana);

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

  const order = quote.createEvmOrder({
    hashLock,
    receiver: SolanaAddress.fromString(config.receiver),
    preset: quote.recommendedPreset,
  });

  console.log("Submitting order to relayer...");
  const { orderHash } = await sdk.submitOrder(
    config.srcChainId.valueOf(),
    order,
    quote.quoteId!,
    secretHashes,
  );
  console.log("Order submitted with hash:", orderHash);

  return { orderHash, secrets };
}

async function monitorAndSubmitSecrets(
  orderHash: string,
  secrets: string[],
): Promise<void> {
  console.log("Starting to monitor for fills...");

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
       if(config.srcTokenAddress == placeholder){
       }
       else{
    await approveIfNeeded(
      config.srcTokenAddress,
      config.aggregationRouter,
      BigInt(config.amount
      ),
    );
  }
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