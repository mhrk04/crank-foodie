"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { monadTestnet } from "@/lib/chains";
import { useState } from "react";

const config = getDefaultConfig({
  appName: "CrankFoodie",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "crankfoodie-local",
  chains: [monadTestnet],
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

