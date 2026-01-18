import axios from "axios";

async function getQuote() {
  const url = "https://api.1inch.com/fusion-plus/quoter/v1.1/quote/receive";

  const config = {
    headers: {
      Authorization: "Bearer VT6sGJqzXpBDj29UViojGGMMfH6LQ7LX",
    },
    params: {
      srcChain: "1",
      dstChain: "137",
      srcTokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", //USDT
      dstTokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", //USDC
      amount: "1500000",
      walletAddress: "0xFf7e90f5c1A3fc4fB5dd7298811F02EdA899CA40",
      enableEstimate: "true",
    },
    paramsSerializer: {
      indexes: null,
    },
  };

  try {
    const response = await axios.get(url, config);
    console.log(response.data);
  } catch (error) {
    console.error(error);
  }
}
getQuote();