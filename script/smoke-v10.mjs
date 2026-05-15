import { execFileSync } from "node:child_process";
import { loadEnv } from "./env.mjs";

const env = { ...loadEnv(), ...process.env };
const rpc = env.RPC_URL || env.RPC_SEPOLIA;
const pk = env.DEPLOYER_PRIVATE_KEY;
const account = env.DEPLOYER_ADDRESS;

for (const key of ["RENDERER_SEPOLIA", "SKULLS_SEPOLIA", "WRAPPER_SEPOLIA", "MARKET_SEPOLIA", "RPC_SEPOLIA", "DEPLOYER_PRIVATE_KEY", "DEPLOYER_ADDRESS"]) {
  if (!env[key]) throw new Error(`Missing ${key}`);
}

function call(address, signature, ...args) {
  return execFileSync("cast", ["call", address, signature, ...args, "--rpc-url", rpc], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }).trim();
}

function scalar(value) {
  return value.split(/\s+/)[0];
}

function stringValue(value) {
  return value.trim().replace(/^"|"$/g, "");
}

function send(address, signature, ...args) {
  const command = ["send", address, signature, ...args, "--rpc-url", rpc, "--private-key", pk];
  const output = execFileSync("cast", command, { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  const hash = output.match(/transactionHash\s+([0-9a-fx]+)/i)?.[1] || output.match(/0x[0-9a-fA-F]{64}/)?.[0] || "";
  if (hash) console.log(`tx ${hash}`);
  return output;
}

function assertIncludes(label, listOutput, tokenId) {
  if (!(listOutput.match(/\d+/g) || []).includes(tokenId)) {
    throw new Error(`${label}: token ${tokenId} not found in ${listOutput}`);
  }
  console.log(`ok ${label}: contains ${tokenId}`);
}

console.log(`Smoke account: ${account}`);
console.log(`Renderer: ${env.RENDERER_SEPOLIA}`);
console.log(`Skulls: ${env.SKULLS_SEPOLIA}`);

const renderer = call(env.SKULLS_SEPOLIA, "renderer()(address)");
if (renderer.toLowerCase() !== env.RENDERER_SEPOLIA.toLowerCase()) {
  throw new Error(`HashSkulls renderer mismatch: ${renderer}`);
}
console.log("ok renderer link");

const mintPrice = BigInt(scalar(call(env.SKULLS_SEPOLIA, "MINT_PRICE()(uint256)")));
const maxSupply = scalar(call(env.SKULLS_SEPOLIA, "MAX_SUPPLY()(uint256)"));
console.log(`ok mint params: price=${mintPrice} maxSupply=${maxSupply}`);

let tokenId = env.SMOKE_TOKEN_ID;
if (!tokenId) {
  const remaining = BigInt(scalar(call(env.SKULLS_SEPOLIA, "mintsRemaining(address)(uint256)", account)));
  if (remaining <= 0n) throw new Error("Smoke account has no mints remaining. Set SMOKE_TOKEN_ID to reuse an owned token.");

  send(env.SKULLS_SEPOLIA, "mintMany(uint256)", "1", "--value", mintPrice.toString());
  const totalSupply = call(env.SKULLS_SEPOLIA, "totalSupply()(uint256)");
  const owned = call(env.SKULLS_SEPOLIA, "tokensOfOwner(address)(uint256[])", account);
  const tokenIds = owned.match(/\d+/g) || [];
  tokenId = tokenIds[tokenIds.length - 1];
  if (!tokenId) throw new Error(`No token found after mint: ${owned}`);
  console.log(`ok mint: totalSupply=${totalSupply}, tokenId=${tokenId}`);
} else {
  assertIncludes("native tokensOfOwner before smoke", call(env.SKULLS_SEPOLIA, "tokensOfOwner(address)(uint256[])", account), tokenId);
  console.log(`ok reuse tokenId=${tokenId}`);
}

const tokenUri = stringValue(call(env.SKULLS_SEPOLIA, "tokenURI(uint256)(string)", tokenId));
if (!tokenUri.startsWith("data:application/json;base64,")) throw new Error("tokenURI is not a base64 data URI.");
console.log("ok tokenURI data URI");

send(env.SKULLS_SEPOLIA, "approve(address,uint256)", env.WRAPPER_SEPOLIA, tokenId);
send(env.WRAPPER_SEPOLIA, "wrap(uint256)", tokenId);
assertIncludes("wrapped tokensOfOwner", call(env.WRAPPER_SEPOLIA, "tokensOfOwner(address)(uint256[])", account), tokenId);

send(env.WRAPPER_SEPOLIA, "unwrap(uint256)", tokenId);
assertIncludes("native tokensOfOwner after unwrap", call(env.SKULLS_SEPOLIA, "tokensOfOwner(address)(uint256[])", account), tokenId);

send(env.SKULLS_SEPOLIA, "approve(address,uint256)", env.MARKET_SEPOLIA, tokenId);
send(env.MARKET_SEPOLIA, "list(uint256,uint256)", tokenId, (mintPrice * 2n).toString());
const activeCount = scalar(call(env.MARKET_SEPOLIA, "activeListingCount()(uint256)"));
if (activeCount !== "1") throw new Error(`Expected activeListingCount 1, got ${activeCount}`);
console.log("ok list");

send(env.MARKET_SEPOLIA, "cancel(uint256)", tokenId);
const finalCount = scalar(call(env.MARKET_SEPOLIA, "activeListingCount()(uint256)"));
if (finalCount !== "0") throw new Error(`Expected activeListingCount 0, got ${finalCount}`);
console.log("ok cancel");

console.log(`Smoke test passed with token #${tokenId}.`);
