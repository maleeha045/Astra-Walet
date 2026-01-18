
const axios = require("axios");
require('dotenv').config();

async function getOneInchAddress() {
  const url = "https://api.1inch.com/swap/v6.1/1/approve/spender";

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
    return response.data;
  } catch (error) {
    console.error(error);
  }
}
getOneInchAddress();