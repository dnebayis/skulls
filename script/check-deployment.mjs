import { execFileSync } from "node:child_process";
import { loadEnv } from "./env.mjs";

const env = { ...loadEnv(), ...process.env };
const rpc = env.RPC_URL || env.RPC_SEPOLIA;

const required = ["RENDERER_SEPOLIA", "SKULLS_SEPOLIA", "WRAPPER_SEPOLIA", "MARKET_SEPOLIA", "RPC_SEPOLIA"];
for (const key of required) {
  if (!env[key]) throw new Error(`Missing ${key}`);
}

function call(address, signature, ...args) {
  return execFileSync("cast", ["call", address, signature, ...args, "--rpc-url", rpc], { encoding: "utf8" }).trim();
}

function scalar(value) {
  return value.split(/\s+/)[0];
}

function expect(label, actual, expected) {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
  console.log(`ok ${label}: ${actual}`);
}

expect("skulls.renderer", call(env.SKULLS_SEPOLIA, "renderer()(address)"), env.RENDERER_SEPOLIA);
expect("mint price", scalar(call(env.SKULLS_SEPOLIA, "MINT_PRICE()(uint256)")), "225000000000000");
expect("max supply", scalar(call(env.SKULLS_SEPOLIA, "MAX_SUPPLY()(uint256)")), "10000");
expect("max per wallet", scalar(call(env.SKULLS_SEPOLIA, "MAX_PER_WALLET()(uint256)")), "3");
expect("market active count", scalar(call(env.MARKET_SEPOLIA, "activeListingCount()(uint256)")), "0");
expect("wrapper royalty support", call(env.WRAPPER_SEPOLIA, "supportsInterface(bytes4)(bool)", "0x2a55205a"), "false");

console.log("Deployment checks passed.");
