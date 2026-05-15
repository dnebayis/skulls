import { useState, useCallback } from "react";
import { createWalletClient, custom, parseEventLogs } from "viem";
import { publicClient, viemChain } from "../lib/chain";
import { SKULLS_ABI } from "../lib/abi";
import { CONFIG } from "../lib/config";

export interface MintedSkull {
  tokenId: bigint;
  txHash: `0x${string}`;
  name: string;
  image: string;
  attributes: { trait_type: string; value: string }[];
  rarity: string;
}

type MintState = "idle" | "confirm" | "pending" | "success" | "error";

export function useMint() {
  const [state, setState] = useState<MintState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [skull, setSkull] = useState<MintedSkull | null>(null);
  const [mintsUsed, setMintsUsed] = useState<number>(0);
  const [mintsLeft, setMintsLeft] = useState<number>(CONFIG.maxPerWallet);

  const refreshMintCount = useCallback(async (address: `0x${string}`) => {
    try {
      const [used, remaining] = await Promise.all([
        publicClient.readContract({ address: CONFIG.skullsAddress, abi: SKULLS_ABI, functionName: "mintCount", args: [address] }),
        publicClient.readContract({ address: CONFIG.skullsAddress, abi: SKULLS_ABI, functionName: "mintsRemaining", args: [address] }),
      ]);
      setMintsUsed(Number(used as bigint));
      setMintsLeft(Number(remaining as bigint));
    } catch { /* ignore */ }
  }, []);

  async function mint(provider: unknown, address: `0x${string}`, quantity = 1) {
    setError(null);
    setState("confirm");

    try {
      await refreshMintCount(address);
      if (quantity < 1 || quantity > CONFIG.maxPerWallet) throw new Error("Invalid mint quantity");

      const walletClient = createWalletClient({
        chain: viemChain,
        transport: custom(provider as Parameters<typeof custom>[0]),
        account: address,
      });

      const hash = await walletClient.writeContract({
        address: CONFIG.skullsAddress,
        abi: SKULLS_ABI,
        functionName: quantity === 1 ? "mint" : "mintMany",
        args: quantity === 1 ? [] : [BigInt(quantity)],
        value: CONFIG.mintPrice * BigInt(quantity),
        account: address,
        chain: viemChain,
      });

      setState("pending");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const logs = parseEventLogs({ abi: SKULLS_ABI, logs: receipt.logs });
      const mintedLogs = logs.filter(l => l.eventName === "Minted");
      const mintedLog = mintedLogs[mintedLogs.length - 1];
      const tokenId = mintedLog ? (mintedLog.args as { tokenId: bigint }).tokenId : 1n;

      const uri = await publicClient.readContract({
        address: CONFIG.skullsAddress, abi: SKULLS_ABI,
        functionName: "tokenURI", args: [tokenId],
      }) as string;

      const json = JSON.parse(atob(uri.split(",")[1]));
      const rarity = (json.attributes as { trait_type: string; value: string }[])
        .find(a => a.trait_type === "Rarity")?.value ?? "Common";

      setSkull({ tokenId, txHash: hash, name: json.name, image: json.image, attributes: json.attributes, rarity });
      setState("success");
      await refreshMintCount(address);
    } catch (e: unknown) {
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage
        ?? (e as { message?: string }).message
        ?? "Transaction failed";
      setError(msg);
      setState("error");
    }
  }

  function reset() { setState("idle"); setError(null); setSkull(null); }

  return { state, error, skull, mint, reset, mintsUsed, mintsLeft, refreshMintCount };
}
