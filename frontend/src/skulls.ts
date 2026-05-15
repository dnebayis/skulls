import { SKULLS_ABI } from "./abi";
import { CONFIG } from "./config";
import { publicClient, walletClient, account } from "./wallet";

export interface SkullMetadata {
  tokenId: number;
  name: string;
  image: string; // SVG data URI
  attributes: { trait_type: string; value: string }[];
}

export async function getSupplyInfo(): Promise<{ total: bigint; max: bigint; price: bigint }> {
  const [total, max, price] = await Promise.all([
    publicClient.readContract({ address: CONFIG.skullsAddress, abi: SKULLS_ABI, functionName: "totalSupply" }),
    publicClient.readContract({ address: CONFIG.skullsAddress, abi: SKULLS_ABI, functionName: "MAX_SUPPLY" }),
    publicClient.readContract({ address: CONFIG.skullsAddress, abi: SKULLS_ABI, functionName: "MINT_PRICE" }),
  ]);
  return { total: total as bigint, max: max as bigint, price: price as bigint };
}

export async function mintSkull(): Promise<{ txHash: `0x${string}`; tokenId: bigint }> {
  if (!walletClient || !account) throw new Error("Cüzdan bağlı değil");

  const hash = await walletClient.writeContract({
    address: CONFIG.skullsAddress,
    abi: SKULLS_ABI,
    functionName: "mint",
    value: CONFIG.mintPrice,
    account,
    chain: null,
  });

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse tokenId from Minted event
  let tokenId = 0n;
  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() === CONFIG.skullsAddress.toLowerCase() &&
      log.topics[0] === "0x735d687607ce9e35b73121f5b238c4cd2854db103741adba51d670bb706051cc"
    ) {
      tokenId = BigInt(log.topics[1] ?? "0x1");
      break;
    }
  }
  // Fallback: parse from Transfer event (topic[3] = tokenId)
  if (tokenId === 0n) {
    for (const log of receipt.logs) {
      if (log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
        tokenId = BigInt(log.topics[3] ?? "0x1");
        break;
      }
    }
  }

  return { txHash: hash, tokenId };
}

export async function loadSkullMetadata(tokenId: bigint): Promise<SkullMetadata> {
  const uri = await publicClient.readContract({
    address: CONFIG.skullsAddress,
    abi: SKULLS_ABI,
    functionName: "tokenURI",
    args: [tokenId],
  }) as string;

  // uri = "data:application/json;base64,<b64>"
  const b64 = uri.split(",")[1];
  const json = JSON.parse(atob(b64));

  return {
    tokenId: Number(tokenId),
    name: json.name,
    image: json.image,
    attributes: json.attributes,
  };
}
