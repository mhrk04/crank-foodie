import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-viem";

const monadRpcUrl = process.env.MONAD_TESTNET_RPC_URL || process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const monadChainId = Number(process.env.MONAD_TESTNET_CHAIN_ID || 10143);
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    monadTestnet: {
      url: monadRpcUrl,
      chainId: monadChainId,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    }
  }
};

export default config;
