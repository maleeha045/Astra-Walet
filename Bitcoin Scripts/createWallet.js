const bip39 = require('bip39');
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const crypto = require('crypto'); // 💡 Import Node's crypto module

// Inject the ECC library into bip32 and ECPair (Required for HD operations)
const { BIP32Factory } = require('bip32'); 
const bip32 = BIP32Factory(ecc);

const { ECPairFactory } = require('ecpair');
const ECPair = ECPairFactory(ecc);


/**
 * Generates a single Bitcoin HD wallet (BIP-84, Native SegWit)
 * @param {string} [mnemonic=null] Optional 12/24-word BIP-39 mnemoniencodec to use.
 * @param {string} [passphrase=''] Optional BIP-39 passphrase.
 * @returns {object} The first key object derived from the seed.
 */
function generateWallet() {
    let mnemonic = null;
    let passphrase = '';
    let finalMnemonic = mnemonic;

    if (!finalMnemonic) {
        // Generate 128 bits (16 bytes) of FRESH, SECURE entropy
        const entropy = crypto.randomBytes(16).toString('hex'); 
        finalMnemonic = bip39.entropyToMnemonic(entropy);
    }

    if (!bip39.validateMnemonic(finalMnemonic)) {
        throw new Error('Invalid Mnemonic Phrase.');
    }

    // Derive Seed, Root Key, and Address
    const seed = bip39.mnemonicToSeedSync(finalMnemonic, passphrase);
    const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
    
    // Path: m/84'/0'/0'/0/0 
    const path = `m/84'/0'/0'/0/0`; 

    const child = root.derivePath(path);
    const keyPair = ECPair.fromPrivateKey(child.privateKey, { network: bitcoin.networks.bitcoin });

    const { address } = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.bitcoin,
    });
    
    return {
        mnemonic: finalMnemonic,
        privateKeyWIF: keyPair.toWIF(),
        publicKeyAddress: address,
    };
}

function generateBitcoinWallet(){

try {
    console.log('## 🔑 Generating a New, Unique Bitcoin Wallet ##');
    const newWallet = generateWallet();
    
    console.log('\n✅ Wallet Details:\n');
    console.log(`Mnemonic Phrase: **${newWallet.mnemonic}**`);
    console.log(`privateKey: ${newWallet.privateKeyWIF}`);
    console.log(`Public Address: ${newWallet.publicKeyAddress}`);
    
} catch (error) {
    console.error(`\n❌ An error occurred: ${error.message}`);
}
}

/**
 * Imports a wallet from a mnemonic and derives a specified number of keys.
 * @param {string} mnemonic The BIP-39 mnemonic phrase.
 * @param {number} count The number of consecutive keys (starting from index 0) to derive.
 * @returns {object} The wallet details including the master pub key and derived keys array.
 */
function importWalletFromMnemonic(mnemonic, count) {
    let passphrase = ''
    // --- 1. Validation ---
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error('❌ Error: The provided mnemonic phrase is invalid. Please check for typos or incorrect word count.');
    }
    if (count <= 0) {
         throw new Error('❌ Error: Key count must be a positive number.');
    }

    // --- 2. Seed and Root Key Generation ---
    // Derive the seed from the mnemonic
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
    
    // Create the HD Root Key using the injected bip32 library
    const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);

    const derivedKeys = [];
    
    // Base derivation path for BIP-84 (Native SegWit): m/purpose'/coin_type'/account'/change
    // m/84'/0'/0'/0
    const baseDerivationPath = `m/84'/0'/0'/0`; 
    
    // --- 3. Key Derivation Loop ---
    for (let i = 0; i < count; i++) {
        // Construct the full path by incrementing the final address index
        const path = `${baseDerivationPath}/${i}`;

        // Derive the child key
        const child = root.derivePath(path);
        
        // Create the ECPair from the private key
        const keyPair = ECPair.fromPrivateKey(child.privateKey, { network: bitcoin.networks.bitcoin });

        // Derive the Native SegWit (P2WPKH - Bech32) Public Address (bc1q...)
        const { address } = bitcoin.payments.p2wpkh({
            pubkey: keyPair.publicKey,
            network: bitcoin.networks.bitcoin,
        });
        
        derivedKeys.push({
            index: i,
            path: path,
            privateKeyWIF: keyPair.toWIF(),
            publicKeyAddress: address,
        });
    }

    return { 
        mnemonic: mnemonic,
        masterPublicKey: root.neutered().toBase58(), // zpub for BIP-84, but neutered() returns xpub format.
        derivedKeys: derivedKeys 
    };
}

/**
 * Imports a Bitcoin wallet from a mnemonic and displays all derived keys.
 * * NOTE: THIS FUNCTION WAS MODIFIED TO LOOP THROUGH AND DISPLAY ALL derivedKeys.
 * * @param {string} mnemonic The mnemonic to import.
 * @param {number} numberOfKeysToImport The count of keys to derive and display.
 */
function importBitcoinWallet(mnemonic,numberOfKeysToImport){
   
try {
    console.log(`\n## 📥 Importing Wallet and Deriving ${numberOfKeysToImport} Keys (Index 0 to ${numberOfKeysToImport - 1}) ##`);
    
    const importedWallet = importWalletFromMnemonic(mnemonic, numberOfKeysToImport);
    
    console.log(`\nMaster Public Key (xpub): ${importedWallet.masterPublicKey}`);
    console.log(`Mnemonic: **${importedWallet.mnemonic}**`);

    // The fix: Loop through the array of derived keys and print all of them.
    importedWallet.derivedKeys.forEach(key => {
        console.log(`\n--- Derived Key: Index ${key.index} ---`);
        console.log(`Path: ${key.path}`);
        console.log(`Address: ${key.publicKeyAddress}`);
        console.log(`⚠️ Private Key (WIF): ${key.privateKeyWIF}`);
    });
    
} catch (error) {
    console.error(`\n❌ Import failed: ${error.message}`);
}
}

// Example usage:
// 1. Generate and display a single new wallet
// generateBitcoinWallet();

// 2. Import an existing mnemonic and derive the first 5 keys
importBitcoinWallet("riot bag diamond trial museum hidden riot business cricket rival federal tuition",5)