/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: "https://sepolia-rpc.wagmi.io",
      accounts: [process.env.PRIVATE_KEY]
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      // accounts are automatically provided by Hardhat node
    }
  }
};