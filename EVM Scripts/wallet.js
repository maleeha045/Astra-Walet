// demo-wallet.js
// npm install ethers@5 bip39
const fs = require('fs');
const path = require('path');
const { Wallet, utils } = require('ethers');
const bip39 = require('bip39'); // for mnemonic validation

const OUT = path.join(__dirname, 'derived.json');

/**
 * Generate a new mnemonic and derive `count` addresses
 */
function generateAndDerive(count = 5) {
  const wallet = Wallet.createRandom();           // includes .mnemonic
  const mnemonic = wallet.mnemonic.phrase;
  const derived = deriveFromMnemonic(mnemonic, count);
  return { mnemonic, derived };
}

/**
 * Derive addresses from an existing mnemonic.
 * Path: m/44'/60'/0'/0/i
 */
function deriveFromMnemonic(mnemonic, count = 5) {
  if (!mnemonic || typeof mnemonic !== 'string') {
    throw new Error('Please provide a valid mnemonic string.');
  }

  // ✅ bip39 validation (ethers v5 has no isValidMnemonic)
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic (bad checksum).');
  }

  const basePath = "m/44'/60'/0'/0";
  const result = [];

  for (let i = 0; i < count; i++) {
    const path = `${basePath}/${i}`;
    const w = Wallet.fromMnemonic(mnemonic, path);
    result.push({
      index: i,
      path,
      address: utils.getAddress(w.address),
      privateKey: w.privateKey
    });
  }

  return result;
}

function saveToFile(obj, filepath = OUT) {
  fs.writeFileSync(filepath, JSON.stringify(obj, null, 2), 'utf8');
  console.log('Saved to', filepath);
}

/* ----------------- Example usage ----------------- */

// 1) Create a new mnemonic and derive 5 addresses
const { mnemonic, derived } = generateAndDerive(5);
console.log('NEW MNEMONIC (KEEP SECRET):', mnemonic);
console.log('Derived addresses from new mnemonic:');
derived.forEach(d => console.log(`#${d.index} ${d.path} -> ${d.address}`));
saveToFile({ mnemonic, derived });

// 2) Re-derive from same mnemonic
const recovered = deriveFromMnemonic(mnemonic, 5);
console.log('\nRe-derived addresses (should match above):');
recovered.forEach(d => console.log(`#${d.index} ${d.path} -> ${d.address}`));

// 3) Example: derive from existing mnemonic
// const existingMnemonic = "your twelve words ...";
// console.log(deriveFromMnemonic(existingMnemonic, 5));