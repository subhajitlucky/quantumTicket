require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      // Use Hardhat's built-in network for testing
    },
    ...(process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== "your-private-key-here" ? {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
        accounts: [process.env.PRIVATE_KEY],
    },
    } : {}),
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
