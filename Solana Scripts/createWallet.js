
import {
  Keypair,
} from "@solana/web3.js";
import * as bip39 from "bip39";
import { HDKey } from "micro-ed25519-hdkey";
import bs58 from "bs58";

// const path = `m/44'/501'/0'/0'`; //solana
//  const path = `m/84'/0'/0'/0/0`; //bitcoin
  const path = "m/44'/60'/0'/0"; //evm
async function createSolanaWallet() {

  const mnemonic = bip39.generateMnemonic(128); // 128 bits of entropy for 12 words
  console.log(`\nYour Seed Phrase (Mnemonic):\n${mnemonic}\n`);

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed.toString("hex"));


  const derivedKey = hdKey.derive(path);

  const keypair = Keypair.fromSeed(derivedKey.privateKey);
  const publicKey = keypair.publicKey.toBase58();

  const privateKey = keypair.secretKey;
  const privateKeyBase58 = bs58.encode(privateKey); // Corrected function call

  console.log(`Derivation Path: ${path}`);
  console.log(`Public Address:  ${publicKey}`);
  console.log(`Private Key (Base58): ${privateKeyBase58}`);
  return {
    mnemonic: mnemonic,
    address: publicKey,
    privateKey: privateKeyBase58
  }

}
async function importFromSolanaMnemonic(mnemonic) {
  if (!bip39.validateMnemonic(mnemonic)) {
    console.error("ERROR: Invalid mnemonic phrase.");
    return null;
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed.toString("hex"));

  const derivedKey = hdKey.derive(path);

  const keypair = Keypair.fromSeed(derivedKey.privateKey);

  const publicKey = keypair.publicKey.toBase58();
  const privateKeyBase58 = bs58.encode(keypair.secretKey);

  console.log(`Public Address (Imported): ${publicKey}`);
  console.log(`Private Key (Base58):      ${privateKeyBase58}`);
  return {
    address: publicKey,
    privateKey: privateKeyBase58
  }

}

async function importFromSolanaPrivateKey(privateKey) {
  try {
    console.log(`\n--- Importing Wallet from Private Key ---`);

    const privateKeyUint8Array = bs58.decode(privateKey);

    if (privateKeyUint8Array.length !== 64) {
      console.error("ERROR: Decoded key is not the required 64 bytes in length.");
      return null;
    }

    const keypair = Keypair.fromSecretKey(privateKeyUint8Array);
    const publicKey = keypair.publicKey.toBase58();

    console.log(`Public Address (Imported): ${publicKey}`);
    console.log(`Private Key (Base58):      ${privateKey.substring(0, 10)}...${privateKey.slice(-10)}`);

    return {
      address: publicKey,
      privateKey
    }

  } catch (error) {
    console.error("\n❌ ERROR during private key import:", error.message);
    return null;
  }
}
async function deriveSolanaAccounts(mnemonic, count) {
  if (!bip39.validateMnemonic(mnemonic)) {
    console.error("ERROR: Invalid mnemonic phrase.");
    return null;
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed.toString("hex"));


  console.log(`\n--- Deriving ${count} Solana Accounts ---`);
  const derived = [];
  for (let i = 0; i < count; i++) {
    // The derivation path specifies which key to derive from the master seed.
    const path = `m/44'/501'/${i}'/0'`;

    // Derive a key from the master seed using the specific path.
    const derivedKey = hdKey.derive(path);

    // Create a Solana Keypair object from the derived private key.
    const keypair = Keypair.fromSeed(derivedKey.privateKey);

    // Get the public address in Base58 format.
    const publicKey = keypair.publicKey.toBase58();

    // The private key is a Uint8Array. We'll convert it to a Base58 string for a more
    // readable format using the bs58 library.
    const privateKey = keypair.secretKey;
    const privateKeyBase58 = bs58.encode(privateKey); // Corrected function call

    console.log(`\nAccount #${i + 1}`);
    console.log(`Public Address:  ${publicKey}`);
    console.log(`Private Key (Base58): ${privateKeyBase58}`);
    derived.push({
      index: i,
      path,
      address: publicKey,
      privateKey: privateKeyBase58

    })
  }
  return derived;
}

async function exportSolanaWallet(mnemonic) {

  if (!bip39.validateMnemonic(mnemonic)) {
    console.error("ERROR: Invalid mnemonic phrase.");
    return null;
  }


  // Step 1: Convert the mnemonic to a master seed
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed.toString("hex"));

  const derivedKey = hdKey.derive(path);

  // Step 3: Create a Solana Keypair object
  // Keypair.fromSeed expects a 32-byte seed from the derivation
  const keypair = Keypair.fromSeed(derivedKey.privateKey);

  // Step 4: Display results
  const publicKey = keypair.publicKey.toBase58();
  const privateKeyBase58 = bs58.encode(keypair.secretKey);

  console.log(`Public Address (Imported): ${publicKey}`);
  console.log(`Private Key (Base58):      ${privateKeyBase58}`);
  return {
    mnemonic,
    address: publicKey,
    privateKey: privateKeyBase58
  }

}
createSolanaWallet();