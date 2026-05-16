"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, getDefaultConfig, getDefaultWallets } from "@rainbow-me/rainbowkit";
import { rabbyWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { monadTestnet } from "@/lib/chains";
import { useState } from "react";

const appName = "CrankFoodie";
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "crankfoodie-local";
const { wallets: defaultWallets } = getDefaultWallets();

const config = getDefaultConfig({
  appName,
  projectId,
  chains: [monadTestnet],
  wallets: [
    {
      ...defaultWallets[0],
      wallets: [...defaultWallets[0].wallets, rabbyWallet]
    },
    ...defaultWallets.slice(1)
  ],
  transports: {
    [monadTestnet.id]: http()
  },
  ssr: true
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
