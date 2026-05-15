import { execFileSync } from "node:child_process";
import { loadEnv } from "./env.mjs";

const env = { ...loadEnv(), ...process.env };

for (const key of ["DEPLOYER_ADDRESS", "DEPLOYER_PRIVATE_KEY", "RPC_MAINNET"]) {
  if (!env[key]) throw new Error(`Missing ${key}`);
}

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }).trim();
}

const chainId = run("cast", ["chain-id", "--rpc-url", env.RPC_MAINNET]);
if (chainId !== "1") throw new Error(`RPC_MAINNET is not Ethereum mainnet. chain-id=${chainId}`);
console.log("ok RPC_MAINNET chain-id: 1");

const derived = run("cast", ["wallet", "address", "--private-key", env.DEPLOYER_PRIVATE_KEY]);
if (derived.toLowerCase() !== env.DEPLOYER_ADDRESS.toLowerCase()) {
  throw new Error(`DEPLOYER_PRIVATE_KEY derives ${derived}, expected ${env.DEPLOYER_ADDRESS}`);
}
console.log(`ok deployer key matches: ${derived}`);

const balanceWei = BigInt(run("cast", ["balance", env.DEPLOYER_ADDRESS, "--rpc-url", env.RPC_MAINNET]));
const minWei = BigInt(env.MIN_MAINNET_DEPLOYER_BALANCE_WEI || "30000000000000000");
console.log(`mainnet deployer balance wei: ${balanceWei}`);
console.log(`minimum configured balance wei: ${minWei}`);
if (balanceWei < minWei) {
  console.log(`fund needed wei: ${minWei - balanceWei}`);
} else {
  console.log("ok deployer balance meets configured minimum");
}

const sizeOutput = run("forge", ["build", "--sizes"]);
const rendererLine = sizeOutput.split("\n").find(line => line.includes("HashSkullsRenderer"));
if (!rendererLine) throw new Error("Could not find HashSkullsRenderer in forge build --sizes output.");
console.log(rendererLine.trim());

if (!env.ETHERSCAN_API_KEY) {
  console.log("warning ETHERSCAN_API_KEY is empty; mainnet source verification will need it.");
}

console.log("Mainnet readiness checks completed.");
