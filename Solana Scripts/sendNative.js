import web3 from "@solana/web3.js";
import bs58 from "bs58";
// Connect to cluster
const connection = new web3.Connection(
  "https://restless-yolo-butterfly.solana-devnet.quiknode.pro/7504a532dc6331113d5bcdc04bb75a9fa67cb075/",
  'confirmed',
);


async function sendNative(SENDER_ADDRESS_STRING, RECIPIENT_ADDRESS_STRING, SOL_AMOUNT, keypair) {

  const senderPublicKey = new web3.PublicKey(SENDER_ADDRESS_STRING);
  const recipientPublicKey = new web3.PublicKey(RECIPIENT_ADDRESS_STRING);

  const transaction = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: senderPublicKey,
      toPubkey: recipientPublicKey,
      lamports: SOL_AMOUNT,
    }),
  );




  // The Keypair constructor expects the full 64-byte secret key (which includes the public key part).

  const signature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [keypair],
  );
  console.log('TRansaction Hash: ', signature);
}
const senderPrivateKey = "414xymewKFRxjZRVnNjaAojcWJk6nEzFT2F6aeCooMt17sXeokBTCJxYDSeG9ACUwCQNFrAubKDqrckwTwNAMMpS"
const privateKeyUint8Array = bs58.decode(senderPrivateKey);
const senderKeypair = web3.Keypair.fromSecretKey(privateKeyUint8Array);

sendNative("b9VxwWT6T8xE3N3WYRtBvEhG5C49mqBqEnWhuvQZX5p", "FaSGyVhjjGNTb85UpaHkhqv2LfqKPeT1msXb5F15Cwtd", 1000000000, senderKeypair);