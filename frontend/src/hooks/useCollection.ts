import { useState, useCallback } from "react";
import type { Abi } from "viem";
import { publicClient } from "../lib/chain";
import { SKULLS_ABI } from "../lib/abi";
import { CONFIG } from "../lib/config";

export interface SkullToken {
  tokenId: bigint;
  name: string;
  image: string;
  rarity: string;
  attributes: { trait_type: string; value: string }[];
}

export function useCollection() {
  const [tokens, setTokens] = useState<SkullToken[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (address: `0x${string}`) => {
    setLoading(true);
    try {
      const ownedIds = await publicClient.readContract({
        address: CONFIG.skullsAddress, abi: SKULLS_ABI, functionName: "tokensOfOwner", args: [address],
      }) as bigint[];

      if (ownedIds.length === 0) { setTokens([]); return; }

      const uriContracts = ownedIds.map(id => ({
        address: CONFIG.skullsAddress,
        abi: SKULLS_ABI as Abi,
        functionName: "tokenURI" as const,
        args: [id],
      }));
      const uriResults = await multicallInChunks(uriContracts);

      const skulls: SkullToken[] = [];
      ownedIds.forEach((tokenId, i) => {
        if (uriResults[i].status !== "success") return;
        try {
          const uri = uriResults[i].result as string;
          const json = JSON.parse(atob(uri.split(",")[1]));
          const rarity = (json.attributes as { trait_type: string; value: string }[])
            .find(a => a.trait_type === "Rarity")?.value ?? "Common";
          skulls.push({ tokenId, name: json.name, image: json.image, rarity, attributes: json.attributes });
        } catch { /* skip */ }
      });

      skulls.sort((a, b) => (a.tokenId < b.tokenId ? -1 : 1));
      setTokens(skulls);
    } catch (e) {
      console.error("useCollection:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tokens, loading, load };
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
