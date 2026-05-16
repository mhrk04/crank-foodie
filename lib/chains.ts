import { defineChain } from "viem";

const chainId = Number(process.env.NEXT_PUBLIC_MONAD_TESTNET_CHAIN_ID || 10143);
const rpcUrl = process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL || "https://testnet-rpc.monad.xyz";

export const monadTestnet = defineChain({
  id: chainId,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON"
  },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] }
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com"
    }
  },
  testnet: true
});

