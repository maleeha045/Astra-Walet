import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();
const OneInchApiKey = process.env.ONEINCH_API_KEY;

async function getQuote(srcAddress, dstAddress, amount) {
  const url = "https://api.1inch.com/swap/v6.1/1/quote";

  const config = {
    headers: {
      Authorization: `Bearer ${OneInchApiKey}`,
    },
    params: {
      src: srcAddress,
      dst: dstAddress,
      amount: amount,
    },
    paramsSerializer: {
      indexes: null,
    },
  };

  try {
    const response = await axios.get(url, config);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}
getQuote("0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", "0xdAC17F958D2ee523a2206206994597C13D831ec7", 10000000000000000000);
// 428240291
// 428436585
//13125764225164