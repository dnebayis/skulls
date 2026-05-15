import { useState, useCallback } from "react";
import { createWalletClient, custom, formatEther, parseEther } from "viem";
import type { Abi } from "viem";
import { publicClient, viemChain } from "../lib/chain";
import { SKULLS_ABI, MARKET_ABI } from "../lib/abi";
import { CONFIG } from "../lib/config";

export interface Listing {
  tokenId: bigint;
  seller: `0x${string}`;
  price: bigint;
  name: string;
  image: string;
  rarity: string;
}

export function useMarket() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const tokenIds = await publicClient.readContract({
        address: CONFIG.marketAddress, abi: MARKET_ABI, functionName: "activeListingIds",
      }) as bigint[];

      if (tokenIds.length === 0) { setListings([]); return; }

      const listingContracts = tokenIds.map(id => ({
        address: CONFIG.marketAddress,
        abi: MARKET_ABI as Abi,
        functionName: "getListing" as const,
        args: [id],
      }));

      const listingResults = await multicallInChunks(listingContracts);

      const active: { tokenId: bigint; seller: `0x${string}`; price: bigint }[] = [];
      tokenIds.forEach((tokenId, i) => {
        if (listingResults[i].status !== "success") return;
        const [seller, price] = listingResults[i].result as [`0x${string}`, bigint];
        if (seller !== "0x0000000000000000000000000000000000000000") {
          active.push({ tokenId, seller, price });
        }
      });

      if (active.length === 0) { setListings([]); return; }

      const uriContracts = active.map(({ tokenId }) => ({
        address: CONFIG.skullsAddress,
        abi: SKULLS_ABI as Abi,
        functionName: "tokenURI" as const,
        args: [tokenId],
      }));
      const uriResults = await multicallInChunks(uriContracts);

      const result: Listing[] = [];
      active.forEach(({ tokenId, seller, price }, i) => {
        if (uriResults[i].status !== "success") return;
        try {
          const uri = uriResults[i].result as string;
          const json = JSON.parse(atob(uri.split(",")[1]));
          const rarity = (json.attributes as { trait_type: string; value: string }[])
            .find(a => a.trait_type === "Rarity")?.value ?? "Common";
          result.push({ tokenId, seller, price, name: json.name, image: json.image, rarity });
        } catch { /* skip */ }
      });

      result.sort((a, b) => Number(a.price - b.price));
      setListings(result);
    } catch (e) {
      console.error("useMarket loadListings:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const listToken = useCallback(async (
    provider: unknown, address: `0x${string}`,
    tokenId: bigint, priceEth: string
  ) => {
    const walletClient = createWalletClient({ chain: viemChain, transport: custom(provider as Parameters<typeof custom>[0]), account: address });
    const approved = await publicClient.readContract({
      address: CONFIG.skullsAddress, abi: SKULLS_ABI,
      functionName: "getApproved", args: [tokenId],
    });
    if ((approved as string).toLowerCase() !== CONFIG.marketAddress.toLowerCase()) {
      const approveHash = await walletClient.writeContract({
        address: CONFIG.skullsAddress, abi: SKULLS_ABI,
        functionName: "approve", args: [CONFIG.marketAddress, tokenId],
        account: address, chain: viemChain,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }
    const hash = await walletClient.writeContract({
      address: CONFIG.marketAddress, abi: MARKET_ABI,
      functionName: "list", args: [tokenId, parseEther(priceEth)],
      account: address, chain: viemChain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }, []);

  const buyToken = useCallback(async (
    provider: unknown, address: `0x${string}`,
    tokenId: bigint, price: bigint
  ) => {
    const walletClient = createWalletClient({ chain: viemChain, transport: custom(provider as Parameters<typeof custom>[0]), account: address });
    const hash = await walletClient.writeContract({
      address: CONFIG.marketAddress, abi: MARKET_ABI,
      functionName: "buy", args: [tokenId],
      value: price, account: address, chain: viemChain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }, []);

  const cancelListing = useCallback(async (
    provider: unknown, address: `0x${string}`, tokenId: bigint
  ) => {
    const walletClient = createWalletClient({ chain: viemChain, transport: custom(provider as Parameters<typeof custom>[0]), account: address });
    const hash = await walletClient.writeContract({
      address: CONFIG.marketAddress, abi: MARKET_ABI,
      functionName: "cancel", args: [tokenId],
      account: address, chain: viemChain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }, []);

  return { listings, loading, loadListings, listToken, buyToken, cancelListing, formatEther };
}

const MULTICALL_CHUNK_SIZE = 300;

type ContractCall = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
};

type MulticallResult =
  | { status: "success"; result: unknown }
  | { status: "failure"; error?: unknown };

async function multicallInChunks(contracts: readonly ContractCall[]) {
  const results: MulticallResult[] = [];
  for (let i = 0; i < contracts.length; i += MULTICALL_CHUNK_SIZE) {
    const chunk = contracts.slice(i, i + MULTICALL_CHUNK_SIZE);
    const chunkResults = await publicClient.multicall({ contracts: chunk, allowFailure: true });
    results.push(...(chunkResults as MulticallResult[]));
  }
  return results;
}
