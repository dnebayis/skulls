// Ethereum Sepolia (testnet) — switch to Ethereum mainnet after deploy
export const CONFIG = {
  chainId: 11155111,
  chainName: "Sepolia",
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  blockExplorer: "https://eth-sepolia.blockscout.com",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },

  skullsAddress: "0xEe4561dBc06B287B3fd1b51ac4a27859a20196D7" as `0x${string}`,
  mintPrice: 225000000000000n, // 0.000225 ETH, approximately $0.50 near $2.2k/ETH
} as const;

// --- Ethereum Mainnet (uncomment after deploy) ---
// export const CONFIG = {
//   chainId: 1,
//   chainName: "Ethereum",
//   rpcUrl: "https://ethereum-rpc.publicnode.com",
//   blockExplorer: "https://etherscan.io",
//   nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
//   skullsAddress: "0x..." as `0x${string}`,
//   mintPrice: 225000000000000n,
// } as const;
