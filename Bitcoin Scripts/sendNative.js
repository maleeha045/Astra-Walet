// --- Prerequisites ---
// npm install bitcoinjs-lib ecpair axios tiny-secp256k1

import * as bitcoin from 'bitcoinjs-lib';
import * as ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import axios from 'axios';

// Initialize ECPair factory
const ECPair = ECPairFactory.default(ecc);

// --- Configuration ---
const NETWORK = bitcoin.networks.testnet;
const API_BASE_URL = 'https://blockstream.info/testnet/api';
const DEFAULT_FEE_RATE = 20; // sat/vB

// --- Helper: Fetch UTXOs ---
async function getUtxos(address) {
    const url = `${API_BASE_URL}/address/tb1qygr46u56rj0h7yg5nc8v98xk3yl03fym57rx6l/utxo`;
    try {
        const res = await axios.get(url, {
            timeout: 15000,
            headers: { 'Accept': 'application/json', 'User-Agent': 'NodeJS' }
        });
        if (!Array.isArray(res.data)) throw new Error('Invalid UTXO response');
        return res.data.map(u => ({ txid: u.txid, vout: u.vout, value: u.value }));
    } catch (err) {
        console.error('Error fetching UTXOs:', err.message);
        if (err.response) console.error(err.response.data);
        return [];
    }
}

// --- Build, sign & broadcast transaction ---
async function sendTestnetBtc(privateKeyWIF, recipientAddress, amountToSendSatoshis) {
    console.log('--- Starting BTC Transaction ---');

    const keyPair = ECPair.fromWIF(privateKeyWIF, NETWORK);
    const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: NETWORK });
    const senderAddress = p2wpkh.address;

    console.log(`Sender Address: ${senderAddress}`);

    const utxos = await getUtxos(senderAddress);
    if (utxos.length === 0) {
        console.error('No UTXOs found. Add tBTC to this address first.');
        return;
    }

    const totalInput = utxos.reduce((sum, u) => sum + u.value, 0);
    console.log(`Total Input: ${totalInput} sat`);

    if (totalInput < amountToSendSatoshis) {
        console.error('Insufficient funds.');
        return;
    }

    // Estimate fee
    const VBYTES_INPUT = 107;
    const VBYTES_OUTPUT = 31;
    const VBYTES_OVERHEAD = 10;
    const estimatedVBytes = (utxos.length * VBYTES_INPUT) + (2 * VBYTES_OUTPUT) + VBYTES_OVERHEAD;
    const feeSatoshis = BigInt(Math.ceil(estimatedVBytes * DEFAULT_FEE_RATE));
    const requiredTotal = BigInt(amountToSendSatoshis) + feeSatoshis;
    const changeSatoshis = BigInt(totalInput) - requiredTotal;

    console.log(`Amount to Send: ${amountToSendSatoshis} sat`);
    console.log(`Estimated Fee: ${feeSatoshis} sat`);
    console.log(`Change: ${changeSatoshis} sat`);

    // Build PSBT
    const psbt = new bitcoin.Psbt({ network: NETWORK });

    utxos.forEach(utxo => {
        psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
                script: p2wpkh.output,
                value: BigInt(utxo.value)
            }
        });
    });

    psbt.addOutput({ address: recipientAddress, value: BigInt(amountToSendSatoshis) });

    if (changeSatoshis > 546n) {
        psbt.addOutput({ address: senderAddress, value: changeSatoshis });
    } else if (changeSatoshis > 0n) {
        console.log(`Change < dust (546 sat), added to fee`);
    }

    // Sign inputs
    utxos.forEach((_, i) => psbt.signInput(i, keyPair));
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    console.log(`Signed Transaction Hex: ${txHex}`);

    // Broadcast
    try {
        const res = await axios.post(`${API_BASE_URL}/tx`, txHex, {
            headers: { 'Content-Type': 'text/plain' }
        });
        console.log(`Broadcast successful! TXID: ${res.data}`);
        console.log(`Explorer: ${API_BASE_URL}/tx/${res.data}`);
    } catch (err) {
        console.error('Broadcast error:', err.response?.data || err.message);
    }
}

// --- Example Usage ---
async function main() {
    const TESTNET_WIF = 'cNjc8eBvwhQfzCHC7LSXbYZ7Pd2RCSsEFQ2gK57sW2eCkN6ew1hX'; // REPLACE
    const RECIPIENT = 'tb1q5mp998t8d2cv687mkh2pzgzdahrz8cenmrv2vn'; // REPLACE
    const AMOUNT = 10000; // sat

    await sendTestnetBtc(TESTNET_WIF, RECIPIENT, AMOUNT);
}

main();