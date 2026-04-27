import type { Chain } from "viem";
import { baseSepolia } from "viem/chains";
import { APP_CHAIN } from "./chain";

const FALLBACK_CHAIN_ID = baseSepolia.id;
const FALLBACK_RPC_URL = baseSepolia.rpcUrls.default.http[0] || "";
const FALLBACK_EXPLORER_URL = baseSepolia.blockExplorers.default.url;

function buildAppWagmiChain(): Chain {
  const chainId =
    APP_CHAIN.chainIdDecimal > 0 ? APP_CHAIN.chainIdDecimal : FALLBACK_CHAIN_ID;
  const rpcUrl = APP_CHAIN.rpcUrls[0] || FALLBACK_RPC_URL;
  const explorerUrl = APP_CHAIN.blockExplorerUrls[0] || FALLBACK_EXPLORER_URL;

  return {
    id: chainId,
    name: APP_CHAIN.chainName || "Base Sepolia",
    nativeCurrency: {
      name: APP_CHAIN.nativeCurrency.name,
      symbol: APP_CHAIN.nativeCurrency.symbol,
      decimals: APP_CHAIN.nativeCurrency.decimals,
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
    blockExplorers: explorerUrl
      ? {
          default: {
            name: "Chain Explorer",
            url: explorerUrl,
          },
        }
      : undefined,
    testnet: chainId === baseSepolia.id,
  };
}

export const appWagmiChain = buildAppWagmiChain();

export const appKitNetworks: [Chain, ...Chain[]] = [appWagmiChain];

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "demo-project-id";

export const appKitMetadata = {
  name: "Eggsecutive",
  description: "Crossy chicken game with fixed-stake paid runs on Base.",
  url: "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};
