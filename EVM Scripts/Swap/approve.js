import axios from "axios";

async function ApproveOneInch() {
  const url = "https://api.1inch.com/swap/v6.1/1/approve/transaction";

  const config = {
    headers: {
      Authorization: "Bearer VT6sGJqzXpBDj29UViojGGMMfH6LQ7LX",
    },
    params: {
      tokenAddress: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
      amount: "100000000000",
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
ApproveOneInch();