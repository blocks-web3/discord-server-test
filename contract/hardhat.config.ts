import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-deploy";
import { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";

import dotenv from "dotenv";
dotenv.config();

function getNetwork1(url: string) {
  if (process.env.PRIVATE_KEY) {
    return { url, accounts: [process.env.PRIVATE_KEY] };
  }
  throw Error("not found PRIVATE_KEY");
}

function getNetwork(name: string) {
  return getNetwork1(
    // `https://${name}.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`
    `https://evm.astar.network`
  );
  // return https://polygon-mumbai.g.alchemy.com/v2/SbQkCjN2CwBogDgyPzHWNGUNFyIE8ELc
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: { enabled: true, runs: 1000000 },
        },
      },
    ],
  },
  networks: {
    dev: { url: "http://localhost:8545" },
    // github action starts localgeth service, for gas calculations
    localgeth: { url: "http://localgeth:8545" },
    goerli: getNetwork("goerli"),
    sepolia: getNetwork("sepolia"),
    proxy: getNetwork1("http://localhost:8545"),
    mumbai: getNetwork("polygon-mumbai"),
    astar: getNetwork("astar-mainnet"),
  },
  mocha: {
    timeout: 10000,
  },
  etherscan: {
    apiKey: { polygonMumbai: "MNZ1S3J19F3RYUH4HT7T9W3SSFQTGFN5EV" },
    customChains: [
      {
        network: "polygonMumbai",
        chainId: 8001,
        urls: {
          apiURL: "https://api-testnet.polygonscan.com/",
          browserURL: "https://polygonscan.com/",
        },
      },
    ],
  },
};

export default config;
