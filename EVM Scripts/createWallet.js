// wallet-script.js
// npm install ethers@5 bip39

const { Wallet, utils } = require("ethers");
const bip39 = require("bip39");

/**
 * 1. Generate new wallet (mnemonic + account)
 */
function createWallet() {
  const wallet = Wallet.createRandom();
  return {
    mnemonic: wallet.mnemonic.phrase,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * 2. Import wallet from mnemonic
 */
function importFromMnemonic(mnemonic) {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic");
  }
  const wallet = Wallet.fromMnemonic(mnemonic);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * 3. Import account from private key
 */
function importFromPrivateKey(privateKey) {
  const wallet = new Wallet(privateKey);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/**
 * 4. Derive multiple accounts from mnemonic
 */
function deriveAccounts(mnemonic, count) {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic");
  }

  const basePath = "m/44'/60'/0'/0";
  const derived = [];

  for (let i = 0; i < count; i++) {
    const path = `${basePath}/${i}`;
    const w = Wallet.fromMnemonic(mnemonic, path);
    derived.push({
      index: i,
      path,
      address: utils.getAddress(w.address),
      privateKey: w.privateKey,
    });
  }

  return derived;
}

/**
 * 5. Export wallet (mnemonic + details)
 */
function exportWallet(mnemonic) {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic");
  }
  const wallet = Wallet.fromMnemonic(mnemonic);
  return {
    mnemonic,
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

/* ----------------- Example Usage ----------------- */

// 1) Create new wallet
const newWallet = createWallet();
console.log("🔑 New Wallet:", newWallet);

// 2) Import from mnemonic
const importedMnemonicWallet = importFromMnemonic(newWallet.mnemonic);
console.log("\n📥 Imported from Mnemonic:", importedMnemonicWallet);

// 3) Import from private key
const importedPrivateWallet = importFromPrivateKey(newWallet.privateKey);
console.log("\n📥 Imported from Private Key:", importedPrivateWallet);

// 4) Derive multiple accounts
const derived = deriveAccounts(newWallet.mnemonic, 5);
console.log("\n🌐 Derived Accounts:", derived);

// 5) Export wallet
const exported = exportWallet(newWallet.mnemonic);
console.log("\n📤 Exported Wallet:", exported);




// encrypt and decrypt private keys and mnemonic

// keystore-secure.js
// npm i argon2
const crypto = require('crypto');
const argon2 = require('argon2');
const fs = require('fs');

/**
 * Derive a 32-byte key using Argon2id with explicit salt and params.
 * Returns a Buffer.
 */
async function deriveKey(password, salt, opts = {}) {
  const timeCost = opts.timeCost ?? 3;
  const memoryCost = opts.memoryCost ?? 65536; // KiB (64 MiB)
  const parallelism = opts.parallelism ?? 1;
  const hashLen = opts.hashLen ?? 32;

  // argon2.hash with raw:true returns a Buffer of length hashLen
  const key = await argon2.hash(password, {
    type: argon2.argon2id,
    salt,
    timeCost,
    memoryCost,
    parallelism,
    hashLength: hashLen,
    raw: true, // return raw Buffer
  });
  return key; // Buffer
}

/**
 * Encrypt plaintext (string or Buffer) using password.
 * Returns JS object (keystore) ready to stringify/save.
 */
async function encryptPrivateKey(password, plaintext, opts = {}) {
  if (typeof plaintext === 'string') plaintext = Buffer.from(plaintext, 'utf8');

  const salt = crypto.randomBytes(opts.saltLen ?? 16);
  const iv = crypto.randomBytes(opts.ivLen ?? 12); // 12 bytes for GCM

  const key = await deriveKey(password, salt, opts.kdf || {}); // Buffer(32)

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // wipe key material in memory
  key.fill(0);

  const keystore = {
    version: opts.version || 1,
    kdf: 'argon2id',
    kdfparams: {
      salt: salt.toString('base64'),
      timeCost: opts.kdf?.timeCost ?? 3,
      memoryCost: opts.kdf?.memoryCost ?? 65536,
      parallelism: opts.kdf?.parallelism ?? 1,
      hashLen: opts.kdf?.hashLen ?? 32
    },
    cipher: 'aes-256-gcm',
    cipherparams: {
      iv: iv.toString('base64')
    },
    ciphertext: ciphertext.toString('base64'),
    tag: tag.toString('base64'),
    meta: opts.meta || null
  };

  return keystore;
}

/**
 * Decrypt a keystore (the object created above) using password.
 * Returns Buffer plaintext.
 */
async function decryptKeystore(keystore, password) {
  if (!keystore || keystore.kdf !== 'argon2id' || keystore.cipher !== 'aes-256-gcm') {
    throw new Error('Unsupported keystore format');
  }
  const salt = Buffer.from(keystore.kdfparams.salt, 'base64');
  const iv = Buffer.from(keystore.cipherparams.iv, 'base64');
  const ciphertext = Buffer.from(keystore.ciphertext, 'base64');
  const tag = Buffer.from(keystore.tag, 'base64');

  const kdfOpts = {
    timeCost: keystore.kdfparams.timeCost,
    memoryCost: keystore.kdfparams.memoryCost,
    parallelism: keystore.kdfparams.parallelism,
    hashLen: keystore.kdfparams.hashLen
  };
  const key = await deriveKey(password, salt, kdfOpts);

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    // zero key
    key.fill(0);

    return plaintext; // Buffer
  } catch (e) {
    // zero key before throwing
    key.fill(0);
    throw e;
  }
}

/* ----------------- Example usage ----------------- */
async function demo() {
  const password = 'ReplaceWithStrongPassword!'; // *DO NOT* hardcode in prod
  const privateKeyHex = '0x0123456789abcdef...'; // private key or secret seed

  const ks = await encryptPrivateKey(password, privateKeyHex, {
    kdf: { timeCost: 3, memoryCost: 65536, parallelism: 1, hashLen: 32 },
    meta: { address: '0x...', createdAt: new Date().toISOString() }
  });

  fs.writeFileSync('my-keystore.json', JSON.stringify(ks, null, 2), 'utf8');
  console.log('Saved keystore -> my-keystore.json');

  // later...
  const saved = JSON.parse(fs.readFileSync('my-keystore.json', 'utf8'));
  //   console.log("encrypted keys" , saved )
  const recovered = await decryptKeystore(saved, password);
  console.log('Recovered plaintext:', recovered.toString('utf8'));
}

if (require.main === module) demo().catch(console.error);

module.exports = { encryptPrivateKey, decryptKeystore };
