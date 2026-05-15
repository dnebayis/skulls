import { createPublicClient, http } from "viem";
import { CONFIG } from "./config";

export const viemChain = {
  id: CONFIG.chainId,
  name: CONFIG.chainName,
  nativeCurrency: CONFIG.nativeCurrency,
  rpcUrls: {
    default: { http: [CONFIG.rpcUrl] },
    public:  { http: [CONFIG.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: CONFIG.blockExplorer },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`,
      blockCreated: 14353601,
    },
  },
} as const;

export const publicClient = createPublicClient({
  chain: viemChain,
  transport: http(CONFIG.rpcUrl),
});
