import "dotenv/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import { defineConfig } from "hardhat/config";

const monadRpcUrl = process.env.MONAD_TESTNET_RPC_URL || process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
const monadChainId = Number(process.env.MONAD_TESTNET_CHAIN_ID || 10143);
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY || "";
const explorerApiKey = process.env.ETHERSCAN_API_KEY || process.env.MONADSCAN_API_KEY || "";

const config = defineConfig({
  plugins: [hardhatViem, hardhatVerify],
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
  },
  verify: {
    blockscout: {
      enabled: false
    },
    etherscan: {
      enabled: Boolean(explorerApiKey),
      apiKey: explorerApiKey
    },
    sourcify: {
      enabled: true,
      apiUrl: "https://sourcify-api-monad.blockvision.org"
    }
  },
  chainDescriptors: {
    10143: {
      name: "MonadTestnet",
      blockExplorers: {
        etherscan: {
          name: "MonadScan Testnet",
          url: "https://testnet.monadscan.com",
          apiUrl: "https://api.etherscan.io/v2/api"
        }
      }
    }
  }
});

export default config;
