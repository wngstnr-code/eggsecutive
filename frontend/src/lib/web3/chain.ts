import { baseSepolia } from "viem/chains";

type NativeCurrency = {
  name: string;
  symbol: string;
  decimals: number;
};

export type AppChainConfig = {
  chainIdHex: string;
  chainIdDecimal: number;
  chainName: string;
  nativeCurrency: NativeCurrency;
  rpcUrls: string[];
  blockExplorerUrls: string[];
};

function splitList(rawValue: string) {
  if (!rawValue) return [];
  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseChainId(rawValue: string) {
  const normalized = String(rawValue || "").trim().toLowerCase();
  if (!normalized) {
      return {
      chainIdHex: `0x${baseSepolia.id.toString(16)}`,
      chainIdDecimal: baseSepolia.id,
    };
  }

  const parsed = normalized.startsWith("0x")
    ? Number.parseInt(normalized, 16)
    : Number.parseInt(normalized, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return {
      chainIdHex: `0x${baseSepolia.id.toString(16)}`,
      chainIdDecimal: baseSepolia.id,
    };
  }

  return {
    chainIdHex: `0x${parsed.toString(16)}`,
    chainIdDecimal: parsed,
  };
}

const parsedChainId = parseChainId(process.env.NEXT_PUBLIC_CHAIN_ID || "");
const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME || "Base Sepolia";
const nativeCurrencyName =
  process.env.NEXT_PUBLIC_CHAIN_NATIVE_NAME || baseSepolia.nativeCurrency.name;
const nativeCurrencySymbol =
  process.env.NEXT_PUBLIC_CHAIN_NATIVE_SYMBOL ||
  baseSepolia.nativeCurrency.symbol;
const nativeCurrencyDecimals = Number(
  process.env.NEXT_PUBLIC_CHAIN_NATIVE_DECIMALS ||
    String(baseSepolia.nativeCurrency.decimals),
);
const envRpcUrls = splitList(process.env.NEXT_PUBLIC_CHAIN_RPC_URLS || "");
const envBlockExplorerUrls = splitList(
  process.env.NEXT_PUBLIC_CHAIN_EXPLORER_URLS || "",
);

export const APP_CHAIN: AppChainConfig = {
  chainIdHex: parsedChainId.chainIdHex,
  chainIdDecimal: parsedChainId.chainIdDecimal,
  chainName,
  nativeCurrency: {
    name: nativeCurrencyName,
    symbol: nativeCurrencySymbol,
    decimals: Number.isFinite(nativeCurrencyDecimals)
      ? nativeCurrencyDecimals
      : baseSepolia.nativeCurrency.decimals,
  },
  rpcUrls:
    envRpcUrls.length > 0 ? envRpcUrls : [...baseSepolia.rpcUrls.default.http],
  blockExplorerUrls:
    envBlockExplorerUrls.length > 0
      ? envBlockExplorerUrls
      : baseSepolia.blockExplorers?.default?.url
        ? [baseSepolia.blockExplorers.default.url]
        : [],
};

export function hasAppChainConfig() {
  return Boolean(
    APP_CHAIN.chainIdHex &&
      APP_CHAIN.chainIdDecimal > 0 &&
      APP_CHAIN.chainName &&
      APP_CHAIN.rpcUrls.length > 0 &&
      APP_CHAIN.nativeCurrency.symbol,
  );
}

export function explorerTxUrl(hash: string) {
  if (!hash) return "";
  const baseUrl = APP_CHAIN.blockExplorerUrls[0];
  if (!baseUrl) return "";
  return `${baseUrl.replace(/\/+$/, "")}/tx/${hash}`;
}
