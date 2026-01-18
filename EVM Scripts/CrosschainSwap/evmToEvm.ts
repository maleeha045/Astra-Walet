import {
  SDK,
  HashLock,
  PrivateKeyProviderConnector,
  NetworkEnum,
//   QuoteParams,
//   MerkleLeaf,
//   SupportedChain,
} from "@1inch/cross-chain-sdk";
import * as OneInchCrossChain from '@1inch/cross-chain-sdk';
import dotenv from "dotenv";
import {
  solidityPackedKeccak256,
  randomBytes,
  Wallet,
  JsonRpcProvider,
  Contract,
} from "ethers";

dotenv.config();
const placeholder = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const requiredEnvVars = ["SENDER_PRIVATE_KEY", "ONEINCH_API_KEY", "RPC_URL"];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

function getRandomBytes32(): string {
  return "0x" + Buffer.from(randomBytes(32)).toString("hex");
}

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

const AGGREGATION_ROUTER_V6 = "0x111111125421ca6dc452d289314280a0f8842a65";
const usdtEVM = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const usdcPolygon = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

const config = {
  aggregationRouter: AGGREGATION_ROUTER_V6,

  privateKey: process.env.SENDER_PRIVATE_KEY!,
  apiKey: process.env.ONEINCH_API_KEY!,
  rpcUrl: process.env.RPC_URL!,

  srcChainId: NetworkEnum.ETHEREUM,
  dstChainId: NetworkEnum.POLYGON,
  srcTokenAddress: usdtEVM,
  dstTokenAddress: usdcPolygon,
  amountToSwap: "1000000",
};

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

const provider = new JsonRpcProvider(config.rpcUrl);
const wallet = new Wallet(config.privateKey, provider);

const ethersProviderConnector: Web3Like = {
  eth: {
    call(transactionConfig): Promise<string> {
      return provider.call(transactionConfig);
    },
  },
  extend(): void {},
};

const blockchainProvider = new PrivateKeyProviderConnector(
  config.privateKey,
  ethersProviderConnector,
);

const sdk = new SDK({
  url: "https://api.1inch.dev/fusion-plus",
  authKey: config.apiKey,
  blockchainProvider,
});

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

async function performCrossChainSwap(): Promise<void> {


     const quote = await sdk.getQuote({
       
          srcChainId: NetworkEnum.ETHEREUM,
          dstChainId: NetworkEnum.POLYGON,
          srcTokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
          dstTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
          amount: '2000000',
          enableEstimate: true,
          walletAddress: wallet.address
      })
  console.log("Getting cross-chain quote...");
  const secretsCount = quote.getPreset().secretsCount;
  const secrets = Array.from({ length: secretsCount }).map(() =>
    getRandomBytes32(),
  );
  const secretHashes = secrets.map((x) => HashLock.hashSecret(x));

  const hashLock =
    secretsCount === 1
      ? HashLock.forSingleFill(secrets[0])
      : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets));

  console.log("Received Fusion+ quote from 1inch API");

  const quoteResponse = await sdk.placeOrder(quote, {
    walletAddress: wallet.address,
    hashLock,
    secretHashes,
  });

  const orderHash = quoteResponse.orderHash;
  console.log(`Order successfully placed. Hash: ${orderHash}`);

  const start = Date.now();

  console.log(`Waiting for a Resolver to claim order and deploy escrows...`);
  const intervalId = setInterval(async () => {
    try {
      const order = await sdk.getOrderStatus(orderHash);

      if (order.status === "executed") {
        console.log(
          "Order completed in",
          (Date.now() - start) / 1000,
          "seconds.",
        );
        clearInterval(intervalId);
        return;
      }

      const fillsObject = await sdk.getReadyToAcceptSecretFills(orderHash);

      if (fillsObject.fills.length > 0) {
        for (const fill of fillsObject.fills) {
          try {
            await sdk.submitSecret(orderHash, secrets[fill.idx]);
            console.log(
              "Escrows deployed and funds are settled on both chains",
            );
            console.log(
              `Submitted secret to release funds for fill index ${fill.idx}`,
            );
          } catch (error) {
            console.error(`Error submitting secret:`, error);
          }
        }
      }
    } catch (error: any) {
      if (error.response) {
        console.error("API Error:", {
          status: error.response.status,
          data: error.response.data,
        });
      } else {
        console.error("Error:", error.message);
      }
    }
  }, 10000);
}

async function main() {
  try {
    if(config.srcTokenAddress == placeholder){
       }
         else{
    await approveIfNeeded(
      config.srcTokenAddress,
      config.aggregationRouter,
      BigInt(config.amountToSwap),
    );
  }


    await performCrossChainSwap();
  }catch (err) {
    console.error("Error:", (err as any)?.response?.data || err);
  }
}

main().catch((err) => {
  console.error("Unhandled error in main:", err);
  process.exit(1);
});