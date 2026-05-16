import "dotenv/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { defineConfig } from "hardhat/config";

const monadRpcUrl = process.env.MONAD_TESTNET_RPC_URL || process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const monadChainId = Number(process.env.MONAD_TESTNET_CHAIN_ID || 10143);
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || "";

const config = defineConfig({
  plugins: [hardhatViem],
  solidity: {
    profiles: {
      default: {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    }
  },
  networks: {
    monadTestnet: {
      type: "http",
      chainType: "l1",
      url: monadRpcUrl,
      chainId: monadChainId,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    }
  }
});

export default config;
