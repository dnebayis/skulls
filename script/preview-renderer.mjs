import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { loadEnv } from "./env.mjs";
import { writeSvgContactSheet } from "./png.mjs";

const env = { ...loadEnv(), ...process.env };
const renderer = env.RENDERER_ADDRESS || env.RENDERER_SEPOLIA;
const rpc = env.RPC_URL || env.RPC_SEPOLIA || "https://ethereum-sepolia-rpc.publicnode.com";
const outputDir = env.OUTPUT_DIR || "tmp/art-preview";

if (!renderer) {
  throw new Error("Set RENDERER_ADDRESS or RENDERER_SEPOLIA before running preview:art.");
}

const seeds = [
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0204060103020100000000000000000000000000000000000000000000000000",
  "0x0503050305060200000000000000000000000000000000000000000000000000",
  "0x0705070204210200000000000000000000000000000000000000000000000000",
];

fs.mkdirSync(outputDir, { recursive: true });

const svgs = seeds.map((seed, index) => {
  const uri = execFileSync("cast", [
    "call",
    renderer,
    "render(uint256,bytes32)(string)",
    String(index + 1),
    seed,
    "--rpc-url",
    rpc,
  ], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }).trim().replace(/^"|"$/g, "");

  const json = JSON.parse(Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString("utf8"));
  const svg = Buffer.from(json.image.replace("data:image/svg+xml;base64,", ""), "base64").toString("utf8");
  fs.writeFileSync(`${outputDir}/skull-${index + 1}.svg`, svg);
  return svg;
});

const pngPath = `${outputDir}/contact-sheet.png`;
writeSvgContactSheet(svgs, pngPath);

console.log(`Renderer: ${renderer}`);
console.log(`RPC: ${rpc}`);
console.log(`Wrote ${pngPath}`);
