const axios = require("axios");

async function getSupportedChainIds() {
  const url = "https://api.1inch.com/token/v1.3/multi-chain/supported-chains";

  const config = {
    headers: {
      Authorization: "Bearer VT6sGJqzXpBDj29UViojGGMMfH6LQ7LX",
    },
    params: {},
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
getSupportedChainIds();