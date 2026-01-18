
const axios = require("axios");
const oneInchApiKey = "VT6sGJqzXpBDj29UViojGGMMfH6LQ7LX"

async function getSupportedTokensList(chainId) {
  const url = `https://api.1inch.com/swap/v6.1/${chainId}/tokens`;

  const config = {
    headers: {
      Authorization: `Bearer ${oneInchApiKey}`,
    },
    params: {},
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
getSupportedTokensList();