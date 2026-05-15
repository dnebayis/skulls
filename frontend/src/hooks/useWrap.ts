import { useState, useCallback } from "react";
import { createWalletClient, custom } from "viem";
import type { Abi } from "viem";
import { publicClient, viemChain } from "../lib/chain";
import { SKULLS_ABI, WRAPPER_ABI } from "../lib/abi";
import { CONFIG } from "../lib/config";
import type { SkullToken } from "./useCollection";

export function useWrap() {
  const [wrappedTokens, setWrappedTokens] = useState<SkullToken[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWrapped = useCallback(async (address: `0x${string}`) => {
    setLoading(true);
    try {
      const wrappedIds = await publicClient.readContract({
        address: CONFIG.wrapperAddress, abi: WRAPPER_ABI, functionName: "tokensOfOwner", args: [address],
      }) as bigint[];

      if (wrappedIds.length === 0) { setWrappedTokens([]); return; }

      const uriContracts = wrappedIds.map(id => ({
        address: CONFIG.wrapperAddress,
        abi: WRAPPER_ABI as Abi,
        functionName: "tokenURI" as const,
        args: [id],
      }));
      const uriResults = await multicallInChunks(uriContracts);

      const result: SkullToken[] = [];
      wrappedIds.forEach((tokenId, i) => {
        if (uriResults[i].status !== "success") return;
        try {
          const uri = uriResults[i].result as string;
          const json = JSON.parse(atob(uri.split(",")[1]));
          const rarity = (json.attributes as { trait_type: string; value: string }[])
            .find(a => a.trait_type === "Rarity")?.value ?? "Common";
          result.push({ tokenId, name: json.name, image: json.image, rarity, attributes: json.attributes });
        } catch { /* skip */ }
      });

      result.sort((a, b) => (a.tokenId < b.tokenId ? -1 : 1));
      setWrappedTokens(result);
    } catch (e) {
      console.error("useWrap loadWrapped:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const wrap = useCallback(async (
    provider: unknown, address: `0x${string}`, tokenId: bigint
  ) => {
    const walletClient = createWalletClient({ chain: viemChain, transport: custom(provider as Parameters<typeof custom>[0]), account: address });
    const approved = await publicClient.readContract({
      address: CONFIG.skullsAddress, abi: SKULLS_ABI,
      functionName: "getApproved", args: [tokenId],
    });
    if ((approved as string).toLowerCase() !== CONFIG.wrapperAddress.toLowerCase()) {
      const h = await walletClient.writeContract({
        address: CONFIG.skullsAddress, abi: SKULLS_ABI,
        functionName: "approve", args: [CONFIG.wrapperAddress, tokenId],
        account: address, chain: viemChain,
      });
      await publicClient.waitForTransactionReceipt({ hash: h });
    }
    const hash = await walletClient.writeContract({
      address: CONFIG.wrapperAddress, abi: WRAPPER_ABI,
      functionName: "wrap", args: [tokenId],
      account: address, chain: viemChain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }, []);

  const unwrap = useCallback(async (
    provider: unknown, address: `0x${string}`, tokenId: bigint
  ) => {
    const walletClient = createWalletClient({ chain: viemChain, transport: custom(provider as Parameters<typeof custom>[0]), account: address });
    const hash = await walletClient.writeContract({
      address: CONFIG.wrapperAddress, abi: WRAPPER_ABI,
      functionName: "unwrap", args: [tokenId],
      account: address, chain: viemChain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }, []);

  return { wrappedTokens, loading, loadWrapped, wrap, unwrap };
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
