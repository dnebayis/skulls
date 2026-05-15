import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatEther,
  type PublicClient,
  type WalletClient,
  type Address,
} from "viem";
import { CONFIG } from "./config";

const chain = {
  id: CONFIG.chainId,
  name: CONFIG.chainName,
  nativeCurrency: CONFIG.nativeCurrency,
  rpcUrls: {
    default: { http: [CONFIG.rpcUrl] },
    public: { http: [CONFIG.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: CONFIG.blockExplorer },
  },
} as const;

export let publicClient: PublicClient;
export let walletClient: WalletClient | null = null;
export let account: Address | null = null;

publicClient = createPublicClient({ chain, transport: http(CONFIG.rpcUrl) });

export async function connectWallet(): Promise<Address> {
  if (!window.ethereum) throw new Error("MetaMask yüklü değil");

  // Request accounts
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  account = accounts[0] as Address;

  walletClient = createWalletClient({ chain, transport: custom(window.ethereum) });

  // Switch/add chain if needed
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${CONFIG.chainId.toString(16)}` }],
    });
  } catch (e: any) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${CONFIG.chainId.toString(16)}`,
          chainName: CONFIG.chainName,
          nativeCurrency: CONFIG.nativeCurrency,
          rpcUrls: [CONFIG.rpcUrl],
          blockExplorerUrls: [CONFIG.blockExplorer],
        }],
      });
    }
  }

  return account;
}

export function formatAddress(addr: Address): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatEth(wei: bigint): string {
  return `${parseFloat(formatEther(wei)).toFixed(4)} ETH`;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
