export const CONFIG = {
  chainId: 1,
  chainName: "Ethereum",
  rpcUrl: "https://ethereum-rpc.publicnode.com",
  blockExplorer: "https://etherscan.io",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rendererAddress:   "0xA23353eF8d2951aeD528627771C74069a00005Ca" as `0x${string}`,
  skullsAddress:   "0xb7eF4eA40be33a72BFae53D47A12c4EE8Acfd0Bb" as `0x${string}`,
  wrapperAddress:  "0xb00B1647F20c5D50589Bc29a218d6D6032ccf117" as `0x${string}`,
  marketAddress:   "0x7041f4cB9F00275081885f9D693FBf20b7D12964" as `0x${string}`,
  mintPrice: 0n, // FREE
  maxPerWallet: 3,
} as const;
