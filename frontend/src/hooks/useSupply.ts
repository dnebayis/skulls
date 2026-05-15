import { useState, useEffect } from "react";
import { publicClient } from "../lib/chain";
import { SKULLS_ABI } from "../lib/abi";
import { CONFIG } from "../lib/config";

export interface SupplyInfo {
  minted: bigint;
  max: bigint;
  price: bigint;
  pct: number;
}

export function useSupply() {
  const [supply, setSupply] = useState<SupplyInfo | null>(null);

  async function fetch() {
    try {
      const [minted, max, price] = await Promise.all([
        publicClient.readContract({ address: CONFIG.skullsAddress, abi: SKULLS_ABI, functionName: "totalSupply" }),
        publicClient.readContract({ address: CONFIG.skullsAddress, abi: SKULLS_ABI, functionName: "MAX_SUPPLY" }),
        publicClient.readContract({ address: CONFIG.skullsAddress, abi: SKULLS_ABI, functionName: "MINT_PRICE" }),
      ]);
      const m = minted as bigint, x = max as bigint, p = price as bigint;
      setSupply({ minted: m, max: x, price: p, pct: x > 0n ? Number((m * 10000n) / x) / 100 : 0 });
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 15_000);
    return () => clearInterval(id);
  }, []);

  return { supply, refresh: fetch };
}
